import { google } from 'googleapis';
import dotenv from 'dotenv';
import { findChannel, findRole, findMemberByName, sendTruncatedMessage, sendEphemeralReply, validateCommandChannel, getRandomMessage } from '../utils/discord-helpers.js';

dotenv.config();

// Configuration:
const SPREADSHEET_ID = '1JQ3Atkgv1APC6kXawTIR2HjeWVCvBYepQqtZnygWSUU';

// Channel mapping for role announcements
// Missing entries will be skipped
const ROLE_CHANNEL_MAPPING = {
  'Vanguard Alpha': 'van-alpha',
  'Vanguard Beta': 'van-beta',
  'Prospector Gamma': 'pro-gamma',
  'Prospector Delta': 'pro-delta',
  'Prospector Epsilon': 'pro-epsilon',
  'Laborer': 'laborers'
};

// Name mapping configuration - maps sheet names to Discord usernames/IDs
const NAME_MAPPING = {
  'amarin': '158622934271918081',
  'snailybob': '233793523269238785',
  'itisl': '558481091191767041',
  'mike': '757384703501271200',
  'leecchh': '482008530572804116',
  'hines': '230431329072840706',
  'jwfw': '663562170507984928',
  'melonking': '197115561359048705',
  'snoooowman': '97785134845009920'
};

// Names to ignore in role checks (e.g., people not in Discord, or not in the war)
const IGNORED_NAMES = new Set(['grantg', 'sethpai']);

// Simplified mapping from team prefix to base category role
const TEAM_PREFIX_TO_CATEGORY_ROLE = {
  'van': 'Vanguard',
  'pro': 'Prospector',
  'lab': 'Laborer',
};

// Templates for role announcements
const ROLE_TEMPLATES = [
    "Good news, {roles}! {message}",
    "Wernstrom! {roles}! {message}",
    "Sweet zombie Jesus, {roles}! {message}",
    "{roles}, I'm going to build my own species war! With blackjack! And hookers! {message}",
    "{roles}, I'm not sure if I'm going to show up drunk or not show up at all. {message}",
];

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

  // Special case for Laborer teams - only return the category role
  if (prefix === 'lab') {
    return [categoryRole];
  }

  // For other teams, return both category and specific team role
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
  // Add all roles from ROLE_CHANNEL_MAPPING
  Object.keys(ROLE_CHANNEL_MAPPING).forEach(roleName => {
    allTeamRoles.add(roleName);
  });
  // Add all base category roles
  Object.values(TEAM_PREFIX_TO_CATEGORY_ROLE).forEach(roleName => {
    allTeamRoles.add(roleName);
  });
  return allTeamRoles;
}

async function applyRoleChange(member, role, isRemoving) {
  try {
    if (isRemoving) {
      await member.roles.remove(role);
      return { success: true, message: `Removed role: ${role.name}` };
    } else {
      await member.roles.add(role);
      return { success: true, message: `Added role: ${role.name}` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to ${isRemoving ? 'remove' : 'add'} role ${role.name}: ${error.message}` 
    };
  }
}

async function applyRoleChanges(member, targetRoleNames, allTeamRoles) {
  const changes = [];
  const errors = [];

  // Get all current team roles the user has
  const currentTeamRoles = Array.from(member.roles.cache.values())
    .filter(role => allTeamRoles.has(role.name));

  // Get target role objects
  const targetRoles = targetRoleNames.map(roleName => 
    member.guild.roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase())
  ).filter(role => role); // Filter out any undefined roles

  // Check if we found all target roles
  if (targetRoles.length !== targetRoleNames.length) {
    const missingRoles = targetRoleNames.filter(roleName => 
      !targetRoles.some(role => role.name.toLowerCase() === roleName.toLowerCase())
    );
    errors.push(`Could not find role(s): ${missingRoles.join(', ')}`);
    return { changes, errors };
  }

  // Calculate roles to add (roles they should have but don't)
  const rolesToAdd = targetRoles.filter(role => !member.roles.cache.has(role.id));

  // Calculate roles to remove
  // 1. Get all roles that could be changed (intersection of user's roles and possible team roles)
  const possibleRolesToChange = currentTeamRoles;
  // 2. Remove from that set any roles that we want to add
  const rolesToRemove = possibleRolesToChange.filter(role => 
    !targetRoles.some(targetRole => targetRole.id === role.id)
  );

  // Apply all role changes
  const roleChanges = [
    ...rolesToRemove.map(role => ({ role, isRemoving: true })),
    ...rolesToAdd.map(role => ({ role, isRemoving: false }))
  ];

  for (const { role, isRemoving } of roleChanges) {
    const result = await applyRoleChange(member, role, isRemoving);
    if (result.success) {
      changes.push(result.message);
    } else {
      errors.push(result.message);
    }
  }

  return { changes, errors };
}

function formatRoleUpdateResult(member, sheetName, sheetTeam, changes, errors) {
  let message = `- ${member.user.tag} (Sheet Name: ${sheetName}, Team: ${sheetTeam}):`;
  if (changes.length > 0) {
    message += `\n  Changes: ${changes.join(', ')}`;
  }
  if (errors.length > 0) {
    message += `\n  Errors: ${errors.join(', ')}`;
  }
  return message;
}

/**
 * Syncs roles based on Google Sheet data without sending announcements
 * @param {Guild} guild - The Discord guild to sync roles in
 * @param {TextChannel} outputChannel - Channel to send results to
 */
export async function syncRoles(guild, outputChannel) {
  if (!guild) {
    console.error('No guild provided for role check');
    return;
  }

  const updateResults = [];
  let membersProcessed = 0;
  let membersSkipped = 0;

  // Fetch all members to avoid multiple fetches if sheet has many users
  await guild.members.fetch();
  const allTeamRoles = getAllTeamRoles();

  const sheetData = await getSheetData();
  if (!sheetData) {
    await outputChannel.send('Could not retrieve data from the Google Sheet. Check bot logs for details.');
    return;
  }

  if (sheetData.length === 0) {
    await outputChannel.send('No data found in the specified Google Sheet tab or columns.');
    return;
  }

  // Process role changes
  for (const row of sheetData) {
    const sheetName = row[0] ? row[0].trim() : null;
    const sheetTeam = row[1] ? row[1].trim().toLowerCase() : null;

    if (!sheetName || !sheetTeam) {
      console.log('Skipping row with missing name or team:', row);
      continue;
    }

    // Skip ignored names
    if (IGNORED_NAMES.has(sheetName.toLowerCase())) {
      console.log(`Skipping ignored name: ${sheetName}`);
      membersSkipped++;
      continue;
    }

    membersProcessed++;

    const targetRoleNames = getRolesForTeam(sheetTeam);
    if (!targetRoleNames || targetRoleNames.length === 0) {
      updateResults.push(`- ${sheetName} (Team: ${row[1]}): Could not determine roles for this team (e.g., pattern mismatch, unmapped prefix, or malformed team name "${sheetTeam}").`);
      continue;
    }

    const member = findMemberByName(guild, sheetName, { nameMapping: NAME_MAPPING });
    if (!member) {
      updateResults.push(`- ${sheetName} (Team: ${row[1]}): User not found in this server.`);
      continue;
    }

    const { changes, errors } = await applyRoleChanges(member, targetRoleNames, allTeamRoles);
    if (changes.length > 0 || errors.length > 0) {
      updateResults.push(formatRoleUpdateResult(member, sheetName, row[1], changes, errors));
    }
  }

  // Send results to output channel
  if (updateResults.length === 0 && membersProcessed > 0) {
    await outputChannel.send(`All processed members from the sheet have been updated to their correct roles.\n(Processed ${membersProcessed} entries, skipped ${membersSkipped} ignored names)`);
  } else if (updateResults.length === 0 && membersProcessed === 0) {
    await outputChannel.send(`No valid user data found in the sheet to process.\n(Skipped ${membersSkipped} ignored names)`);
  } else {
    let replyMessage = `**Role Update Results:**\n(Processed ${membersProcessed} entries, skipped ${membersSkipped} ignored names)\n`;
    replyMessage += updateResults.join('\n');
    await sendTruncatedMessage(outputChannel, replyMessage);
  }
}

/**
 * Sends role announcements to appropriate channels
 * @param {Guild} guild - The Discord guild to send announcements in
 * @param {Set<string>} uniqueTeamRoles - Set of role names to announce
 */
async function sendRoleAnnouncements(guild, uniqueTeamRoles) {
  for (const roleName of uniqueTeamRoles) {
    const channelName = ROLE_CHANNEL_MAPPING[roleName];
    if (!channelName) continue;

    const channel = findChannel(guild, channelName);
    if (!channel) {
      console.warn(`Could not find channel #${channelName} for role ${roleName} in guild ${guild.name}`);
      continue;
    }

    const role = findRole(guild, roleName);
    if (!role) {
      console.warn(`Could not find role ${roleName} in guild ${guild.name}`);
      continue;
    }

    try {
      await channel.send(getRandomMessage(role, `You are ${roleName} for this week's species war!`, ROLE_TEMPLATES));
    } catch (error) {
      console.error(`Failed to post announcement in #${channelName} for guild ${guild.name}:`, error);
    }
  }
}

export async function handleShowRoleChanges(guild) {
  // Find the war-planning channel
  const warPlanningChannel = findChannel(guild, '🦹┃war-planning');
  if (!warPlanningChannel) {
    console.error(`Could not find the war-planning channel in guild ${guild.name}`);
    return;
  }

  // Use the keys from ROLE_CHANNEL_MAPPING as our unique team roles
  const uniqueTeamRoles = new Set(Object.keys(ROLE_CHANNEL_MAPPING));
  
  // Sync roles first
  await syncRoles(guild, warPlanningChannel);

  // Send announcements
  await sendRoleAnnouncements(guild, uniqueTeamRoles);
}

const ALLOWED_COMMAND_CHANNEL_NAME = '🤖┃bot-commands';

export async function handleSyncRoles(interaction) {
  try {
    // Check if the command is used in the allowed channel
    if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
      return;
    }

    // Find the war-planning channel
    const warPlanningChannel = findChannel(interaction.guild, '🦹┃war-planning');
    if (!warPlanningChannel) {
      await sendEphemeralReply(interaction, 'Could not find the war-planning channel. Please ensure it exists and the bot can see it.');
      return;
    }

    await sendEphemeralReply(interaction, 'Starting role sync...');
    await syncRoles(interaction.guild, warPlanningChannel);
    await sendEphemeralReply(interaction, 'Role sync complete! Check the war-planning channel for details.');
  } catch (error) {
    console.error('Error in handleSyncRoles:', error);
    await sendEphemeralReply(interaction, 'An error occurred while syncing roles. Check the logs for details.');
  }
}
