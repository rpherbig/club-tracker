import { Client, GatewayIntentBits, PermissionsBitField, MessageFlags } from 'discord.js';
import { promises as fs } from 'fs';
import cron from 'node-cron'; // Added for scheduled tasks
import { handleFind, handleKill } from './commands/war-commands.js';
import { handleSetResource, handleShowResource, handleOverdueResource, handleTotalResource } from './commands/resource-commands.js';
import { handlePostForgetfulMessage, handleTriggerDailyCheckin, sendDailyReminder } from './commands/reminder-commands.js'; // Added imports
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
  } catch {
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
          console.log('[Cron Job] Running daily check-in task...');
          client.guilds.cache.forEach(async (guild) => {
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
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    await interaction.reply({
        content: "This bot does not support direct messages. Please use commands in a server.",
        flags: MessageFlags.Ephemeral
    });
    return;
  }

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

    case 'find':
      console.log(`[${new Date().toISOString()}] User ${interaction.user.tag} used /find command in #${interaction.channel.name} (${interaction.guild.name})`);
      await handleFind(interaction);
      break;

    case 'kill':
      console.log(`[${new Date().toISOString()}] User ${interaction.user.tag} used /kill command in #${interaction.channel.name} (${interaction.guild.name})`);
      await handleKill(interaction);
      break;

    case 'post-forgetful-message':
      console.log(`[${new Date().toISOString()}] User ${interaction.user.tag} used /post-forgetful-message command in #${interaction.channel.name} (${interaction.guild.name})`);
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
      console.log(`[${new Date().toISOString()}] User ${interaction.user.tag} manually triggered daily check-in`);
      await handleTriggerDailyCheckin(interaction);
      break;
  }
});

// Listener for message reactions to assign the Forgetful role
client.on('messageReactionAdd', async (reaction, user) => {
    // Ignore reactions from bots
    if (user.bot) return;

    if (!reaction.message.guild) return;
    const guildId = reaction.message.guildId;
    const forgetfulMessageIdList = forgetfulMessageStore.get(guildId);

    if (!forgetfulMessageIdList || !forgetfulMessageIdList.includes(reaction.message.id)) return;

    console.log(`Reaction detected on a tracked forgetful message (${reaction.message.id}) in guild ${guildId} by user ${user.tag}`);

    try {
        // Fetch the member who reacted
        const member = await reaction.message.guild.members.fetch(user.id);
        if (!member) {
            console.log(`Could not fetch member for user ${user.tag} (${user.id})`);
            return; // Should not happen if user is reacting in guild
        }

        // Find the 'Forgetful' role
        const roleName = 'Forgetful'; // Make sure this matches the exact role name
        const role = reaction.message.guild.roles.cache.find(
            r => r.name.toLowerCase() === roleName.toLowerCase()
        );

        if (!role) {
            console.error(`Could not find the role named '${roleName}' in guild ${guildId}.`);
            // Maybe notify an admin or log persistently?
            return;
        }

        // Assign the role if the member doesn't have it already
        if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role);
            console.log(`Assigned role '${role.name}' to member ${member.user.tag} in guild ${guildId}`);
            // Optional: Send DM confirmation
            try {
                 await member.send(`You have been assigned the '${role.name}' role in the server: ${reaction.message.guild.name}.`);
            } catch (dmError) {
                 console.log(`Could not send DM to ${member.user.tag}. They might have DMs disabled.`);
            }
        } else {
            console.log(`Member ${member.user.tag} already has the role '${role.name}'.`);
        }

    } catch (error) {
        console.error(`Error processing reaction for role assignment in guild ${guildId}:`, error);
        // Handle potential permissions errors specifically?
        if (error.code === 50013) { // DiscordAPIError: Missing Permissions
             console.error(`Missing 'Manage Roles' permission in guild ${guildId}?`);
             // Potentially notify admin
        }
    }
});

client.login(process.env.TOKEN);
