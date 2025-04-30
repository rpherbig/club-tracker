import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import { promises as fs } from 'fs';
import cron from 'node-cron'; // Added for scheduled tasks
import { handleFind, handleKill } from './commands/war-commands.js';
import { handleSetResource, handleShowResource, handleOverdueResource, handleTotalResource } from './commands/resource-commands.js';
import dotenv from 'dotenv';

dotenv.config();

const DATA_FILE = 'data.json';
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
    return new Map(
        Object.entries(obj).map(([key, value]) => [key, objectToMap(value)])
    );
}

async function loadData() {
  try {
    const jsonString = await fs.readFile(DATA_FILE, 'utf8');
    const parsedData = JSON.parse(jsonString);
    return objectToMap(parsedData);
  } catch {
    console.log(`No data file found at: ${DATA_FILE}`);
    return new Map();
  }
}

function mapToObject(map) {
    if (!(map instanceof Map)) return map; // Base case: not a Map
    return Object.fromEntries(
        Array.from(map.entries(), ([key, value]) => [key, mapToObject(value)])
    );
}

async function saveData(data) {
  const jsonReadyData = mapToObject(data);
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(jsonReadyData),
    'utf8'
  );
}

let data;

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  data = await loadData();

  // Schedule the daily check-in message
  const dailyCheckinChannelName = 'daily-discord-checkin';
  const forgetfulRoleName = 'Forgetful';
  const messageLink = 'https://discord.com/channels/1036712913727143998/1364121623283896360/1364129089572700190';

  if (cron.validate('0 10 * * *')) {
      cron.schedule('0 10 * * *', async () => {
          console.log('[Cron Job] Running daily check-in task...');
          client.guilds.cache.forEach(async (guild) => {
              console.log(`[Cron Job] Processing guild: ${guild.name} (${guild.id})`);
              try {
                  // Find the target channel
                  const channel = guild.channels.cache.find(ch => ch.name === dailyCheckinChannelName);
                  if (!channel) {
                      console.log(`[Cron Job] Channel #${dailyCheckinChannelName} not found in guild ${guild.name}. Skipping.`);
                      return;
                  }

                  // Find the Forgetful role
                  const role = guild.roles.cache.find(r => r.name.toLowerCase() === forgetfulRoleName.toLowerCase());
                  if (!role) {
                      console.log(`[Cron Job] Role '${forgetfulRoleName}' not found in guild ${guild.name}. Skipping.`);
                      return;
                  }

                  // Check permissions
                  const botPermissions = channel.permissionsFor(guild.members.me);
                  if (!botPermissions || !botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
                      console.log(`[Cron Job] Missing Send Messages permission in #${dailyCheckinChannelName} for guild ${guild.name}. Skipping.`);
                      return;
                  }
                  if (!botPermissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                     console.warn(`[Cron Job] Missing Mention @everyone, @here, and All Roles permission in #${dailyCheckinChannelName} for guild ${guild.name}. The role mention might not work.`);
                     // Continue anyway, maybe the mention still works for specific roles?
                  }

                  // Construct and send the message
                  const messageContent = `<@&${role.id}> Check the daily post: ${messageLink}`;
                  await channel.send(messageContent);
                  console.log(`[Cron Job] Successfully sent daily check-in message to #${dailyCheckinChannelName} in guild ${guild.name}.`);

              } catch (error) {
                  console.error(`[Cron Job] Failed to send daily check-in for guild ${guild.name}:`, error);
                  // Check for specific permission errors
                   if (error.code === 50013) { // DiscordAPIError: Missing Permissions
                       console.error(`[Cron Job] Might be missing Send Messages or Mention permissions in #${dailyCheckinChannelName} for guild ${guild.name}.`);
                   }
              }
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
        ephemeral: true,
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
      await saveData(data);
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
  }
});

// Listener for message reactions to assign the Forgetful role
client.on('messageReactionAdd', async (reaction, user) => {
    // Ignore reactions from bots
    if (user.bot) return;

    // Ensure reaction is in a guild
    if (!reaction.message.guild) return;

    const guildId = reaction.message.guildId;
    const forgetfulMessageId = forgetfulMessageStore.get(guildId);

    // Check if the reaction is on the designated message
    if (!forgetfulMessageId || reaction.message.id !== forgetfulMessageId) {
        return;
    }

    console.log(`Reaction detected on forgetful message ${forgetfulMessageId} in guild ${guildId} by user ${user.tag}`);

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
