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
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get spreadsheet metadata to list all available sheets
    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    if (!spreadsheetMeta.data.sheets || spreadsheetMeta.data.sheets.length === 0) {
      throw new Error('No sheets found in the spreadsheet.');
    }

    // Log all available sheets for debugging
    console.log('Available sheets in the spreadsheet:');
    spreadsheetMeta.data.sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.properties.title}`);
    });

    // Try to find a sheet with the expected headers
    let targetSheet = null;
    let targetSheetTitle = null;

    for (const sheet of spreadsheetMeta.data.sheets) {
      const sheetTitle = sheet.properties.title;
      console.log(`Checking sheet: ${sheetTitle}`);
      
      try {
        const headerRange = `'${sheetTitle}'!A1:B1`;
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: headerRange,
        });
        
        const headers = headerResponse.data.values ? headerResponse.data.values[0] : null;
        if (headers && headers.length >= 2 && 
            headers[0].toLowerCase() === 'name' && 
            headers[1].toLowerCase() === 'team') {
          targetSheet = sheet;
          targetSheetTitle = sheetTitle;
          console.log(`Found matching sheet: ${sheetTitle}`);
          break;
        }
      } catch (error) {
        console.log(`Error checking headers in sheet ${sheetTitle}:`, error.message);
        continue;
      }
    }

    if (!targetSheet) {
      throw new Error('Could not find a sheet with the required "Name" and "Team" headers.');
    }

    // Read data from the found sheet
    const dataRange = `'${targetSheetTitle}'!A2:B`;
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

function getAllTeamRoles() {
  const allTeamRoles = new Set();
  Object.values(TEAM_PREFIX_TO_CATEGORY_ROLE).forEach(categoryRole => {
    allTeamRoles.add(categoryRole);
    ['Alpha', 'Beta', 'Delta', 'Epsilon'].forEach(suffix => {
      allTeamRoles.add(`${categoryRole} ${suffix}`);
    });
  });
  return allTeamRoles;
}

function findMemberByName(guild, name) {
  return guild.members.cache.find(
    m => m.user.username.toLowerCase() === name.toLowerCase() ||
         m.displayName.toLowerCase() === name.toLowerCase()
  );
}

function checkMemberRoles(member, targetRoleNames, allTeamRoles) {
  const missingRoles = [];
  const rolesToRemove = [];

  // Check for roles that should be added
  for (const targetRoleName of targetRoleNames) {
    const targetRole = member.guild.roles.cache.find(
      role => role.name.toLowerCase() === targetRoleName.toLowerCase()
    );

    if (!targetRole) {
      return {
        error: `Target role "${targetRoleName}" not found on this server.`,
        missingRoles: [],
        rolesToRemove: []
      };
    }

    if (!member.roles.cache.has(targetRole.id)) {
      missingRoles.push(targetRole.name);
    }
  }

  // Check for roles that should be removed
  for (const role of member.roles.cache.values()) {
    if (allTeamRoles.has(role.name) && !targetRoleNames.includes(role.name)) {
      rolesToRemove.push(role.name);
    }
  }

  return { missingRoles, rolesToRemove };
}

function formatRoleUpdateMessage(member, sheetName, sheetTeam, missingRoles, rolesToRemove) {
  let message = `- ${member.user.tag} (Sheet Name: ${sheetName}, Team: ${sheetTeam}):`;
  if (missingRoles.length > 0) {
    message += `\n  Needs role(s): "${missingRoles.join(', ')}"`;
  }
  if (rolesToRemove.length > 0) {
    message += `\n  Should remove role(s): "${rolesToRemove.join(', ')}"`;
  }
  return message;
}

export async function handleShowRoleChanges(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Only accept the command from the bot-commands channel
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
  const allTeamRoles = getAllTeamRoles();

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

    const member = findMemberByName(guild, sheetName);
    if (!member) {
      updatesNeeded.push(`- ${sheetName} (Team: ${row[1]}): User not found in this server.`);
      continue;
    }

    const { error, missingRoles, rolesToRemove } = checkMemberRoles(member, targetRoleNames, allTeamRoles);
    if (error) {
      updatesNeeded.push(`- ${member.user.tag} (Sheet Name: ${sheetName}, Team: ${row[1]}): ${error}`);
      continue;
    }

    if (missingRoles.length > 0 || rolesToRemove.length > 0) {
      updatesNeeded.push(formatRoleUpdateMessage(member, sheetName, row[1], missingRoles, rolesToRemove));
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