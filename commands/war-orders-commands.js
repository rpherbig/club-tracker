import { google } from 'googleapis';
import dotenv from 'dotenv';
import { findChannel, findRole, sendEphemeralReply, validateCommandChannel, sendChannelMessage } from '../utils/discord-helpers.js';
import { generateWarMessage } from '../war-message-templates.js';
import { TEAM_ROLES } from '../config/roles.js';

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
 * Posts the weekly war orders message to #war-orders
 * @param {Guild} guild - The Discord guild to post in
 */
export async function sendWarOrdersMessage(guild) {
  console.log(`[Cron Job] Processing war orders message for guild: ${guild.name} (${guild.id})`);
  
  const channel = findChannel(guild, 'war-orders');
  if (!channel) {
    console.log(`[Cron Job] Could not find #war-orders channel in guild ${guild.name}. Skipping.`);
    return;
  }

  // Build roles object from config (templateKey → Role)
  const roles = {};
  for (const { discordRoleName, templateKey } of TEAM_ROLES) {
    roles[templateKey] = findRole(guild, discordRoleName);
  }

  console.log(`[Cron Job] Fetching species war info from Google Sheets...`);
  
  const speciesWarInfo = await getSpeciesWarInfo();
  if (!speciesWarInfo) {
    console.log(`[Cron Job] Could not retrieve species war info for guild ${guild.name}. Skipping.`);
    return;
  }

  console.log(`[Cron Job] Retrieved species war info: ${speciesWarInfo}`);

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

  console.log(`[Cron Job] Sending war orders message...`);

  const first = await sendChannelMessage(channel, generalInfo);
  const second = await sendChannelMessage(channel, speciesContent);

  if (first && second) {
    console.log(`[Cron Job] Successfully sent war orders message to #war-orders in guild ${guild.name}.`);
  } else {
    console.error(`[Cron Job] Failed to send war orders message for guild ${guild.name}`);
  }
}

/**
 * Manual trigger for the war orders message
 * @param {CommandInteraction} interaction - The Discord interaction
 */
export async function handleTriggerWarOrders(interaction) {
  try {
    if (!await validateCommandChannel(interaction, '🤖┃bot-commands')) {
      return;
    }

    await sendWarOrdersMessage(interaction.guild);
    
    await sendEphemeralReply(interaction, 'War orders message sent successfully!');

  } catch (error) {
    console.error(`[Manual Trigger] Failed to handle war orders trigger for guild ${interaction.guild.name}:`, error);
    await sendEphemeralReply(interaction, 'Failed to send war orders message. Check the logs for details.');
  }
}
