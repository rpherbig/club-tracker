import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Configuration:
const SPREADSHEET_ID = '1JQ3Atkgv1APC6kXawTIR2HjeWVCvBYepQqtZnygWSUU';

// Simplified mapping from team prefix to base category role
const TEAM_PREFIX_TO_CATEGORY_ROLE = {
  'van': 'Vanguard',
  'pro': 'Prospector',
  'lab': 'Laborer',
  // Add other prefixes if needed
};

// Helper function to derive roles from a team name
function getRolesForTeam(sheetTeamName) {
  if (!sheetTeamName) return null;
  const lowerSheetTeamName = sheetTeamName.toLowerCase(); // Ensure lowercase for splitting and lookup
  const parts = lowerSheetTeamName.split(' ');

  if (parts.length !== 2) {
    console.warn(`Team name "${sheetTeamName}" does not follow the '<prefix> <suffix>' pattern.`);
    return null; // Team name doesn't fit the expected pattern
  }

  const prefix = parts[0];
  const suffix = parts[1];

  const categoryRole = TEAM_PREFIX_TO_CATEGORY_ROLE[prefix];
  if (!categoryRole) {
    console.warn(`No category role mapping for prefix "${prefix}" in team "${sheetTeamName}".`);
    return null; // Prefix not found in our map
  }

  // Capitalize the first letter of the suffix (e.g., "alpha" -> "Alpha")
  const capitalizedSuffix = suffix.charAt(0).toUpperCase() + suffix.slice(1);
  const specificTeamRole = `${categoryRole} ${capitalizedSuffix}`;

  return [categoryRole, specificTeamRole];
}

async function getSheetData() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      // Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set to the path of your JSON key file
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get spreadsheet metadata to find the title of the third sheet (index 2)
    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const thirdSheet = spreadsheetMeta.data.sheets[2];
    if (!thirdSheet || !thirdSheet.properties || !thirdSheet.properties.title) {
      throw new Error('Could not find the third tab or its title in the spreadsheet.');
    }
    const thirdSheetTitle = thirdSheet.properties.title;
    console.log(`Identified third sheet title: ${thirdSheetTitle}`);

    // 2. Validate headers in row 1 (A1 should be "Name", B1 should be "Team")
    const headerRange = `'${thirdSheetTitle}'!A1:B1`;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: headerRange,
    });
    const headers = headerResponse.data.values ? headerResponse.data.values[0] : null;
    if (!headers || headers.length < 2 || 
        headers[0].toLowerCase() !== 'name' || 
        headers[1].toLowerCase() !== 'team') {
      console.error(`Sheet "${thirdSheetTitle}" has incorrect headers. Expected "Name" in A1 and "Team" in B1. Found: "${headers ? headers.join(", ") : 'empty'}"`);
      return null; 
    }
    console.log(`Headers validated successfully for sheet: ${thirdSheetTitle}`);

    // 3. Read data from columns A (Name) and B (Team) of this third sheet, starting from row 2.
    const dataRange = `'${thirdSheetTitle}'!A2:B`; // Read columns A and B starting from row 2
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: dataRange,
    });

    return response.data.values || []; // Array of [name, team]
  } catch (error) {
    console.error('Error accessing Google Sheet:', error);
    if (error.code === 403) {
        console.error('Ensure the Google Sheets API is enabled for your project and the service account has permissions to view the sheet.');
    }
    if (error.message.includes('file not found')) {
        console.error('Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and the JSON key file exists.');
    }
    return null;
  }
}

export async function handleShowRoleChanges(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Channel check
  if (interaction.channel.name !== '🤖┃bot-commands') {
    await interaction.editReply(
      { content: 'This command can only be used in the #🤖┃bot-commands channel.', ephemeral: true }
    );
    return;
  }

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply('This command can only be used in a server.');
    return;
  }

  const sheetData = await getSheetData();

  if (!sheetData) {
    await interaction.editReply('Could not retrieve data from the Google Sheet. Check bot logs for details.');
    return;
  }

  if (sheetData.length === 0) {
    await interaction.editReply('No data found in the specified Google Sheet tab or columns.');
    return;
  }

  const updatesNeeded = [];
  let membersProcessed = 0;

  // Fetch all members to avoid multiple fetches if sheet has many users
  await guild.members.fetch(); 

  for (const row of sheetData) {
    const sheetName = row[0] ? row[0].trim() : null;
    const sheetTeam = row[1] ? row[1].trim().toLowerCase() : null;

    if (!sheetName || !sheetTeam) {
      console.log('Skipping row with missing name or team:', row);
      continue;
    }
    membersProcessed++;

    const targetRoleNames = getRolesForTeam(sheetTeam);
    if (!targetRoleNames || targetRoleNames.length === 0) {
      updatesNeeded.push(`- ${sheetName} (Team: ${row[1]}): Could not determine roles for this team (e.g., pattern mismatch, unmapped prefix, or malformed team name "${sheetTeam}").`);
      continue;
    }

    const member = guild.members.cache.find(
      m => m.user.username.toLowerCase() === sheetName.toLowerCase() ||
           m.displayName.toLowerCase() === sheetName.toLowerCase()
    );

    if (!member) {
      updatesNeeded.push(`- ${sheetName} (Team: ${row[1]}): User not found in this server.`);
      continue;
    }

    const missingRolesForMember = [];
    for (const targetRoleName of targetRoleNames) {
      const targetRole = guild.roles.cache.find(
        role => role.name.toLowerCase() === targetRoleName.toLowerCase()
      );

      if (!targetRole) {
        updatesNeeded.push(`- ${member.user.tag} (Sheet Name: ${sheetName}, Team: ${row[1]}): Target role "${targetRoleName}" not found on this server.`);
        // Continue checking other roles for this member, but flag this one as missing
        continue; 
      }

      if (!member.roles.cache.has(targetRole.id)) {
        missingRolesForMember.push(targetRole.name);
      }
    }

    if (missingRolesForMember.length > 0) {
      updatesNeeded.push(`- ${member.user.tag} (Sheet Name: ${sheetName}, Team: ${row[1]}): Needs role(s): "${missingRolesForMember.join(', ')}".`);
    }
  }

  if (updatesNeeded.length === 0 && membersProcessed > 0) {
    await interaction.editReply('All processed members from the sheet appear to have their correct roles based on the current mapping.');
  } else if (updatesNeeded.length === 0 && membersProcessed === 0) {
    await interaction.editReply('No valid user data found in the sheet to process.');
  } 
  else {
    let replyMessage = `**Prospective Role Changes based on Google Sheet:**\n(Processed ${membersProcessed} entries from sheet)\n`;
    replyMessage += updatesNeeded.join('\n');
    if (replyMessage.length > 2000) {
      replyMessage = replyMessage.substring(0, 1990) + '...\n(Message truncated)';
    }
    await interaction.editReply(replyMessage);
  }
} 