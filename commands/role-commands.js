import { google } from 'googleapis';
import dotenv from 'dotenv';
import { findChannel, findRole, findMemberByName, sendChannelMessage, sendEphemeralReply, validateCommandChannel, getRandomMessage } from '../utils/discord-helpers.js';

dotenv.config();

// Configuration:
const SPREADSHEET_ID = '1JQ3Atkgv1APC6kXawTIR2HjeWVCvBYepQqtZnygWSUU';

// Channel mapping for role announcements
// Missing entries will be skipped
const ROLE_CHANNEL_MAPPING = {
  'van 21': 'van-21',
  'van 20': 'van-20',
  'van 19': 'van-19',
  'van 18': 'van-18',
  'pro 17': 'pro-17',
  'pro 16': 'pro-16',
  'pro 11': 'pro-11',
  'lab 11': 'laborers',
};

// Specific team role mapping - maps team names to their specific Discord role names
// Missing entries will only get the category role
const TEAM_ROLE_MAPPING = {
  'van 21': 'Vanguard 21',
  'van 20': 'Vanguard 20',
  'van 19': 'Vanguard 19',
  'van 18': 'Vanguard 18',
  'pro 17': 'Prospector 17',
  'pro 16': 'Prospector 16',
  'pro 11': 'Prospector 11',
  'lab 11': 'Laborer', // Laborers only have one role in Discord
};


// Names to ignore in role checks (e.g., people not in Discord, or not in the war, or not in the club)
const IGNORED_NAMES = new Set(['grantg', 'sethpai']);

// Helper function to get roles from sheet data
function getRolesFromSheetData(sheetTeam, sheetCategoryRole) {
  if (!sheetTeam || !sheetCategoryRole) return null;
  
  const team = sheetTeam.trim().toLowerCase();
  const categoryRole = sheetCategoryRole.trim();
  
  // Get the specific team role from the mapping
  const specificTeamRole = TEAM_ROLE_MAPPING[team];
  
  // Log if team is missing from TEAM_ROLE_MAPPING
  if (!specificTeamRole) {
    console.warn(`⚠️  MISSING ROLE MAPPING: Team "${team}" not found in TEAM_ROLE_MAPPING. User will only get category role: ${categoryRole}`);
  }
  
  // Log if team is missing from ROLE_CHANNEL_MAPPING
  if (!ROLE_CHANNEL_MAPPING[team]) {
    console.warn(`⚠️  MISSING CHANNEL MAPPING: Team "${team}" not found in ROLE_CHANNEL_MAPPING. No announcement will be sent for this team.`);
  }
  
  // If we have a specific team role, return both category and specific
  if (specificTeamRole) {
    return [categoryRole, specificTeamRole];
  }
  
  // Otherwise, just return the category role
  return [categoryRole];
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
      console.error('No sheets found in the spreadsheet.');
      return null;
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
        const headerRange = `'${sheetTitle}'!A1:E1`;
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: headerRange,
        });
        
        const headers = headerResponse.data.values ? headerResponse.data.values[0] : null;
        if (headers && headers.length >= 5 && 
            headers[0].toLowerCase() === 'name' && 
            headers[1].toLowerCase() === 'team' &&
            headers[3].toLowerCase() === 'kit' &&
            headers[4].toLowerCase() === 'discord id') {
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
      console.error('Could not find a sheet with the required "Name", "Team", "Kit", and "Discord ID" headers.');
      return null;
    }

    // Read data from the found sheet
    const dataRange = `'${targetSheetTitle}'!A2:E`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: dataRange,
    });

    return response.data.values || []; // Array of [name, team, ?, categoryRole, discordId]
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
  // Add all specific team roles from TEAM_ROLE_MAPPING
  Object.values(TEAM_ROLE_MAPPING).forEach(roleName => {
    allTeamRoles.add(roleName);
  });
  // Add common category roles that might be used
  const commonCategoryRoles = ['Vanguard', 'Prospector', 'Laborer'];
  commonCategoryRoles.forEach(roleName => {
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

function formatRoleUpdateResult(member, sheetName, sheetTeam, sheetCategoryRole, changes, errors) {
  let message = `- ${member.user.tag} (Sheet Name: ${sheetName}, Team: ${sheetTeam}, Category: ${sheetCategoryRole}):`;
  if (changes.length > 0) {
    message += `\n  Changes: ${changes.join(', ')}`;
  }
  if (errors.length > 0) {
    message += `\n  ***Errors: ${errors.join(', ')}***`;
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
    return false;
  }

  const updateResults = [];
  let membersProcessed = 0;
  let membersSkipped = 0;

  // Fetch all members to avoid multiple fetches if sheet has many users
  await guild.members.fetch();
  const allTeamRoles = getAllTeamRoles();

  const sheetData = await getSheetData();
  if (!sheetData) {
    await sendChannelMessage(outputChannel, 'Could not retrieve data from the Google Sheet. Check bot logs for details.');
    return false;
  }

  if (sheetData.length === 0) {
    await sendChannelMessage(outputChannel, 'No data found in the specified Google Sheet tab or columns.');
    return false;
  }

  // Process role changes
  for (const row of sheetData) {
    const sheetName = row[0] ? row[0].trim() : null;
    const sheetTeam = row[1] ? row[1].trim().toLowerCase() : null;
    const sheetCategoryRole = row[3] ? row[3].trim() : null; // Category role is in column D
    const discordId = row[4] ? row[4].trim() : null; // Discord ID is in column E

    if (!sheetName || !sheetTeam || !sheetCategoryRole) {
      console.log('Skipping row with missing name, team, or category role:', row);
      continue;
    }

    // Skip ignored names
    if (IGNORED_NAMES.has(sheetName.toLowerCase())) {
      console.log(`Skipping ignored name: ${sheetName}`);
      membersSkipped++;
      continue;
    }

    membersProcessed++;

    const targetRoleNames = getRolesFromSheetData(sheetTeam, sheetCategoryRole);
    if (!targetRoleNames || targetRoleNames.length === 0) {
      updateResults.push(`- ${sheetName} (Team: ${row[1]}, Category Role: ${row[3]}): ***Could not determine roles for this team (missing category role or invalid data).***`);
      continue;
    }

    // Handle external users (Discord ID is "n/a")
    if (!discordId || discordId.toLowerCase() === 'n/a') {
      console.log(`Skipping external user: ${sheetName}`);
      membersSkipped++;
      continue;
    }

    // Use Discord ID directly to find the member
    const member = guild.members.cache.get(discordId);
    if (!member) {
      updateResults.push(`- ${sheetName} (Team: ${row[1]}, Category Role: ${row[3]}): ***User not found in this server (Discord ID: ${discordId}).***`);
      continue;
    }

    const { changes, errors } = await applyRoleChanges(member, targetRoleNames, allTeamRoles);
    if (changes.length > 0 || errors.length > 0) {
      updateResults.push(formatRoleUpdateResult(member, sheetName, row[1], row[3], changes, errors));
    }
  }

  // Send results to output channel
  if (updateResults.length === 0 && membersProcessed > 0) {
    await sendChannelMessage(outputChannel, `All processed members from the sheet have been updated to their correct roles.\n(Processed ${membersProcessed} entries, skipped ${membersSkipped} ignored names)`);
  } else if (updateResults.length === 0 && membersProcessed === 0) {
    await sendChannelMessage(outputChannel, `No valid user data found in the sheet to process.\n(Skipped ${membersSkipped} ignored names)`);
  } else {
    let replyMessage = `**Role Update Results:**\n(Processed ${membersProcessed} entries, skipped ${membersSkipped} ignored names)\n`;
    replyMessage += updateResults.join('\n');
    await sendChannelMessage(outputChannel, replyMessage);
  }

  return true;
}

/**
 * Sends role announcements to appropriate channels
 * @param {Guild} guild - The Discord guild to send announcements in
 * @param {Set<string>} uniqueTeamRoles - Set of role names to announce
 */
async function sendRoleAnnouncements(guild) {
  // Loop over the keys of ROLE_CHANNEL_MAPPING
  for (const teamKey of Object.keys(ROLE_CHANNEL_MAPPING)) {
    const channelName = ROLE_CHANNEL_MAPPING[teamKey];
    const channel = findChannel(guild, channelName);
    if (!channel) {
      console.warn(`⚠️  MISSING CHANNEL: Could not find channel #${channelName} for team ${teamKey} in guild ${guild.name}`);
      continue;
    }

    const roleName = TEAM_ROLE_MAPPING[teamKey];
    if (!roleName) {
      console.warn(`⚠️  MISSING ROLE MAPPING: Could not find role name for team ${teamKey} in TEAM_ROLE_MAPPING in guild ${guild.name}`);
      continue;
    }

    const role = findRole(guild, roleName);
    if (!role) {
      console.warn(`⚠️  MISSING DISCORD ROLE: Could not find role "${roleName}" in guild ${guild.name} - role may need to be created in Discord`);
      continue;
    }

    const message = await sendChannelMessage(channel, getRandomMessage(role, `You are ${roleName} for this week's species war!`));
    if (!message) {
      console.error(`❌ FAILED ANNOUNCEMENT: Failed to post announcement in #${channelName} for guild ${guild.name}: Missing permissions or channel access`);
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
  
  // Sync roles first
  const syncSuccess = await syncRoles(guild, warPlanningChannel);

  // Send announcements only if sync was successful
  if (syncSuccess) {
    await sendRoleAnnouncements(guild);
  } else {
    console.warn('Role sync failed, skipping announcements.');
  }
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

export async function handleAnnounceRoles(interaction) {
  try {
    // Check if the command is used in the allowed channel
    if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
      return;
    }

    await sendEphemeralReply(interaction, 'Announcing roles...');
    await sendRoleAnnouncements(interaction.guild);
    await sendEphemeralReply(interaction, 'Role announcements sent!');
  } catch (error) {
    console.error('Error in handleAnnounceRoles:', error);
    await sendEphemeralReply(interaction, 'An error occurred while announcing roles. Check the logs for details.');
  }
}
