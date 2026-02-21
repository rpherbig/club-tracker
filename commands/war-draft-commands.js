import { google } from 'googleapis';
import dotenv from 'dotenv';
import { findChannel, findRole, sendEphemeralReply, validateCommandChannel, sendChannelMessage, sendChannelMessageAsCodeBlock } from '../utils/discord-helpers.js';
import { generateWarMessage } from '../war-message-templates.js';

dotenv.config();

// Configuration:
const SPREADSHEET_ID = '1JQ3Atkgv1APC6kXawTIR2HjeWVCvBYepQqtZnygWSUU';

/**
 * Gets the species war information from the Google Sheet (cells H12-H13)
 * @returns {Promise<string|null>} The species war info or null if error
 */
async function getSpeciesWarInfo() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Read cells H12-H13 (merged cells)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'H12:H13',
    });

    if (!response.data.values || response.data.values.length === 0) {
      console.log('No data found in cells H12-H13');
      return null;
    }

    // Since H12-H13 are merged, we'll get the value from the first cell
    const speciesWarInfo = response.data.values[0] ? response.data.values[0][0] : null;
    
    if (!speciesWarInfo) {
      console.log('No species war info found in cells H12-H13');
      return null;
    }

    console.log(`Retrieved species war info: ${speciesWarInfo}`);
    return speciesWarInfo;
  } catch (error) {
    console.error('Error accessing Google Sheet for species war info:', error);
    if (error.code === 403) {
      console.error('Ensure the Google Sheets API is enabled for your project and the service account has permissions to view the sheet.');
    }
    if (error.message.includes('file not found')) {
      console.error('Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and the JSON key file exists.');
    }
    return null;
  }
}



/**
 * Posts the war draft message to the war-drafts channel
 * @param {Guild} guild - The Discord guild to post in
 */
export async function sendWarDraftMessage(guild) {
  console.log(`[Cron Job] Processing war draft message for guild: ${guild.name} (${guild.id})`);
  
  // Find the war-drafts channel
  const channel = findChannel(guild, 'war-drafts');
  if (!channel) {
    console.log(`[Cron Job] Could not find #war-drafts channel in guild ${guild.name}. Skipping.`);
    return;
  }

  // Find the specific team roles to mention
  const laborerRole = findRole(guild, 'Laborer');
  const prospector15Role = findRole(guild, 'Prospector 15');
  const prospector17Role = findRole(guild, 'Prospector 17');
  const prospector18Role = findRole(guild, 'Prospector 18');
  const vanguard19Role = findRole(guild, 'Vanguard 19');
  const vanguard20Role = findRole(guild, 'Vanguard 20');
  const vanguard21Role = findRole(guild, 'Vanguard 21');
  const vanguard22Role = findRole(guild, 'Vanguard 22');

  // Build roles object with specific team roles
  const roles = {
    laborer: laborerRole,
    prospector15: prospector15Role,
    prospector17: prospector17Role,
    prospector18: prospector18Role,
    vanguard19: vanguard19Role,
    vanguard20: vanguard20Role,
    vanguard21: vanguard21Role,
    vanguard22: vanguard22Role,
  };

  console.log(`[Cron Job] Fetching species war info from Google Sheets...`);
  
  // Get species war info from Google Sheet
  const speciesWarInfo = await getSpeciesWarInfo();
  if (!speciesWarInfo) {
    console.log(`[Cron Job] Could not retrieve species war info for guild ${guild.name}. Skipping.`);
    return;
  }

  console.log(`[Cron Job] Retrieved species war info: ${speciesWarInfo}`);

  // Calculate the Friday war start date (next Friday after today)
  const today = new Date();
  const daysUntilFriday = (5 - today.getDay() + 7) % 7; // 5 = Friday
  const warStartDate = new Date(today);
  warStartDate.setDate(today.getDate() + daysUntilFriday);
  
  console.log(`[Cron Job] Generating war message...`);

  const { generalInfo, speciesContent } = generateWarMessage(speciesWarInfo, roles, warStartDate) ?? {};
  if (!generalInfo || !speciesContent) {
    console.log(`[Cron Job] No message content found for species war info: ${speciesWarInfo}. Skipping.`);
    return;
  }

  console.log(`[Cron Job] Sending war draft message (copy-paste friendly)...`);

  await sendChannelMessage(channel, '📋 *Copy the block(s) below and paste in the other channel. Remove the ```md and ``` lines after pasting if they were included.*');
  const first = await sendChannelMessageAsCodeBlock(channel, generalInfo);
  const second = await sendChannelMessageAsCodeBlock(channel, speciesContent);

  if (first && second) {
    console.log(`[Cron Job] Successfully sent war draft message to #war-drafts in guild ${guild.name}.`);
  } else {
    console.error(`[Cron Job] Failed to send war draft message for guild ${guild.name}`);
  }
}

/**
 * Manual trigger for the war draft message
 * @param {CommandInteraction} interaction - The Discord interaction
 */
export async function handleTriggerWarDraft(interaction) {
  try {
    // Check if the command is used in the allowed channel
    if (!await validateCommandChannel(interaction, '🤖┃bot-commands')) {
      return;
    }

    await sendWarDraftMessage(interaction.guild);
    
    // Send success response
    await sendEphemeralReply(interaction, 'War draft message sent successfully!');

  } catch (error) {
    console.error(`[Manual Trigger] Failed to handle war draft trigger for guild ${interaction.guild.name}:`, error);
    // Send error response using the wrapper
    await sendEphemeralReply(interaction, 'Failed to send war draft message. Check the logs for details.');
  }
}
