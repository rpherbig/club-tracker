import { google } from 'googleapis';
import dotenv from 'dotenv';
import { findChannel, sendEphemeralReply, validateCommandChannel } from '../utils/discord-helpers.js';
import { mantis, beetle, goldfish, clam, hamster } from '../war-message-templates.js';

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
 * Determines which war type function to use based on the species war info
 * @param {string} speciesWarInfo - The species war information from the sheet
 * @returns {Function} The war message function
 */
function getSpeciesWarMessage(speciesWarInfo) {  
  const info = speciesWarInfo.toLowerCase();

  if (info.includes('mantis')) return mantis;
  if (info.includes('dung')) return beetle;
  if (info.includes('goldfish')) return goldfish;
  if (info.includes('clam')) return clam;
  if (info.includes('ham')) return hamster;

  // No match was found
  return null;
}

/**
 * Posts the war draft message to the war-drafts channel
 * @param {Guild} guild - The Discord guild to post in
 */
export async function sendWarDraftMessage(guild) {
  console.log(`[Cron Job] Processing war draft message for guild: ${guild.name} (${guild.id})`);
  
  try {
    // Find the war-drafts channel
    const channel = findChannel(guild, 'war-drafts');
    if (!channel) {
      console.log(`[Cron Job] Could not find #war-drafts channel in guild ${guild.name}. Skipping.`);
      return;
    }

    // Find the Manager role
    const managersRole = findRole(guild, 'Manager');
    if (!managersRole) {
      console.log(`[Cron Job] Could not find Manager role in guild ${guild.name}. Skipping.`);
      return;
    }

    // Get species war info from Google Sheet
    const speciesWarInfo = await getSpeciesWarInfo();
    if (!speciesWarInfo) {
      console.log(`[Cron Job] Could not retrieve species war info for guild ${guild.name}. Skipping.`);
      return;
    }

    // Get the message content
    const messageContent = getSpeciesWarMessage(speciesWarInfo);
    if (!messageContent) {
      console.log(`[Cron Job] No message content found for species war info: ${speciesWarInfo}. Skipping.`);
      return;
    }

    // Create the full message with role mention
    const fullMessage = `${managersRole} Here's the draft for tomorrow's ${speciesWarInfo}species war:\n\n${messageContent}`;

    // Send the message
    await channel.send(fullMessage);
    console.log(`[Cron Job] Successfully sent war draft message to #war-drafts in guild ${guild.name}.`);

  } catch (error) {
    console.error(`[Cron Job] Failed to send war draft message for guild ${guild.name}:`, error);
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
    await sendEphemeralReply(interaction, 'War draft message sent successfully!');
  } catch (error) {
    console.error(`[Manual Trigger] Failed to send war draft message for guild ${interaction.guild.name}:`, error);
    await sendEphemeralReply(interaction, 'Failed to send war draft message. Check the logs for details.');
  }
}
