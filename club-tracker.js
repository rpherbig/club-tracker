import { Client, GatewayIntentBits } from 'discord.js';
import { promises as fs } from 'fs';
import cron from 'node-cron';
import { handleFind, handleKill } from './commands/war-commands.js';
import { handleSetResource, handleShowResource, handleOverdueResource, handleTotalResource, handleRemovePlayer } from './commands/resource-commands.js';
import { handlePostForgetfulMessage, handleTriggerDailyCheckin, sendDailyReminder, sendPromotionReminder, handleTriggerPromotionReminder } from './commands/reminder-commands.js';
import { handleShowRoleChanges, handleSyncRoles, handleAnnounceRoles } from './commands/role-commands.js';
import { sendWarDraftMessage, handleTriggerWarDraft } from './commands/war-draft-commands.js';
import { sendEphemeralReply, logCommandUsage } from './utils/discord-helpers.js';
import { handleForgetfulReaction } from './events/role-events.js';
import dotenv from 'dotenv';

dotenv.config();

const DATA_FILE = 'data.json';
const FORGETFUL_MESSAGES_FILE = 'forgetful_messages.json';
let forgetfulMessageStore = new Map(); // Stores { guildId: messageId } for reaction listener

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions
  ]
});

function objectToMap(obj) {
  if (typeof obj !== "object" || obj === null) return obj; // Base case: not an object
  if (Array.isArray(obj)) return obj; // Keep arrays as arrays
  return new Map(
    Object.entries(obj).map(([key, value]) => [key, objectToMap(value)])
  );
}

async function loadData(filePath) {
  try {
    const jsonString = await fs.readFile(filePath, 'utf8');
    const parsedData = JSON.parse(jsonString);
    console.log(`Loaded data from ${filePath}`);
    return objectToMap(parsedData);
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
    return new Map();
  }
}

function mapToObject(map) {
  if (!(map instanceof Map)) return map; // Base case: not a Map
  return Object.fromEntries(
    Array.from(map.entries(), ([key, value]) => [key, mapToObject(value)])
  );
}

async function saveData(dataToSave, filePath) {
  try {
    const jsonReadyData = mapToObject(dataToSave);
    await fs.writeFile(
      filePath,
      JSON.stringify(jsonReadyData),
      'utf8'
    );
    console.log(`Saved data to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
}

let data;

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  data = await loadData(DATA_FILE);
  forgetfulMessageStore = await loadData(FORGETFUL_MESSAGES_FILE);

  // Schedule the daily check-in message
  if (cron.validate('0 10 * * *')) {
    cron.schedule('0 10 * * *', async () => {
      client.guilds.cache.forEach(async (guild) => {
        console.log(`[Cron Job] Processing daily check-in for guild: ${guild.name}`);
        await sendDailyReminder(guild);
      });
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });
    console.log('Scheduled daily check-in message for 10:00 AM America/New_York.');
  } else {
    console.error('Invalid cron pattern for daily check-in.');
  }

  // Schedule the weekly role check for Friday at 9am
  if (cron.validate('0 9 * * 5')) {
    cron.schedule('0 9 * * 5', async () => {
      client.guilds.cache.forEach(async (guild) => {
        console.log(`[Cron Job] Processing weekly role check for guild: ${guild.name}`);
        await handleShowRoleChanges(guild);
      });
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });
    console.log('Scheduled weekly role check for Friday 9:00 AM America/New_York.');
  } else {
    console.error('Invalid cron pattern for weekly role check.');
  }

  // Schedule the war draft message for Friday at 6pm
  if (cron.validate('0 18 * * 5')) {
    cron.schedule('0 18 * * 5', async () => {
      client.guilds.cache.forEach(async (guild) => {
        console.log(`[Cron Job] Processing war draft message for guild: ${guild.name}`);
        await sendWarDraftMessage(guild);
      });
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });
    console.log('Scheduled war draft message for Friday 6:00 PM America/New_York.');
  } else {
    console.error('Invalid cron pattern for war draft message.');
  }

  // Schedule the promotion reminder for Thursday at 6pm
  if (cron.validate('0 18 * * 4')) {
    cron.schedule('0 18 * * 4', async () => {
      client.guilds.cache.forEach(async (guild) => {
        console.log(`[Cron Job] Processing promotion reminder for guild: ${guild.name}`);
        await sendPromotionReminder(guild);
      });
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });
    console.log('Scheduled promotion reminder for Thursday 6:00 PM America/New_York.');
  } else {
    console.error('Invalid cron pattern for promotion reminder.');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    await sendEphemeralReply(interaction, "This bot does not support direct messages. Please use commands in a server.");
    return;
  }

  // Always defer reply to extend interaction life
  await interaction.deferReply({ ephemeral: true });

  logCommandUsage(interaction, interaction.commandName);

  let guildId = interaction.guildId;
  let guildData = data.get(guildId) || new Map();

  switch (interaction.commandName) {
    case 'set-essence':
    case 'se':
    case 'set-gold':
    case 'sg':
    case 'set-player-essence':
    case 'set-player-gold':
      guildData = await handleSetResource(interaction, guildData);
      data.set(guildId, guildData);
      await saveData(data, DATA_FILE);
      break;

    case 'show-essence':
    case 'show-gold':
      await handleShowResource(interaction, guildData);
      break;

    case 'overdue-essence':
    case 'overdue-gold':
      await handleOverdueResource(interaction, guildData);
      break;

    case 'total-essence':
    case 'total-gold':
      await handleTotalResource(interaction, guildData);
      break;

    case 'remove-player':
      guildData = await handleRemovePlayer(interaction, guildData);
      data.set(guildId, guildData);
      await saveData(data, DATA_FILE);
      break;

    case 'find':
      await handleFind(interaction);
      break;

    case 'kill':
      await handleKill(interaction);
      break;

    case 'post-forgetful-message':
      // Call the handler, it returns the message ID or null
      const newMessageId = await handlePostForgetfulMessage(interaction);

      if (newMessageId) {
        const currentList = forgetfulMessageStore.get(guildId) || [];
        const updatedList = [...currentList, newMessageId];
        forgetfulMessageStore.set(guildId, updatedList);
        await saveData(forgetfulMessageStore, FORGETFUL_MESSAGES_FILE);
      }
      break;

    case 'trigger-daily-checkin':
      await handleTriggerDailyCheckin(interaction);
      break;

    case 'trigger-promotion-reminder':
      await handleTriggerPromotionReminder(interaction);
      break;

    case 'sync-sheet-roles':
      await handleSyncRoles(interaction);
      break;

    case 'trigger-war-draft':
      await handleTriggerWarDraft(interaction);
      break;

    case 'trigger-announce-roles':
      await handleAnnounceRoles(interaction);
      break;
  }
});

// Listener for message reactions to assign the Forgetful role
client.on('messageReactionAdd', async (reaction, user) => {
  await handleForgetfulReaction(reaction, user, forgetfulMessageStore);
});

// Global error handler to prevent crashes
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

client.login(process.env.TOKEN);
