const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const moment = require('moment');
require('dotenv').config();

const DATA_FILE = 'data.json';
const ESSENCE_OVERDUE_DAYS = 14;
const GOLD_OVERDUE_DAYS = 42;
const DISCORD_CHAR_LIMIT = 1800;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
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

function toRelativeDate(lastUpdated) {
  if(lastUpdated === undefined) {
    return "unknown";
  }
  return moment(new Date()).to(new Date(lastUpdated));
}

function getLastUpdated(playerData, dateKey) {
  const lastUpdated = playerData.get(dateKey);
  return toRelativeDate(lastUpdated);
}

let data;

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  data = await loadData();
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
  let key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  let dateKey =`${key}-date`;

  async function setData(key, player, amount) {
      const playerData = guildData.get(player) || new Map();
      playerData.set(key, amount);
      playerData.set(dateKey, moment());
      guildData.set(player, playerData);
      data.set(guildId, guildData);
      await saveData(data);
      await interaction.reply(`Set ${player}'s ${key} to ${amount}`);
  }

  switch (interaction.commandName) {
    case 'set-essence':
    case 'se':
    case 'set-gold':
    case 'sg':
      const amount = interaction.options.getInteger('amount');
      const displayName = interaction.member.displayName.toLowerCase();
      await setData(key, displayName, amount);
      break;

    case 'set-player-essence':
    case 'set-player-gold':
      const player = interaction.options.getString('player').toLowerCase();
      const playerAmount = interaction.options.getInteger('amount');
      await setData(key, player, playerAmount);
      break;

    case 'show-essence':
    case 'show-gold':
      const targetPlayer = interaction.member.displayName.toLowerCase();
      const targetPlayerData = guildData.get(targetPlayer) || new Map();
      const val = targetPlayerData.get(key) || 0;
      const lastUpdated = getLastUpdated(targetPlayerData, dateKey);
      await interaction.reply(`${targetPlayer} has ${val} ${key} (last updated ${lastUpdated})`);
      break;

    case 'overdue-essence':
    case 'overdue-gold':
      // Two weeks for essence, six weeks for gold
      const days = key == "essence" ? ESSENCE_OVERDUE_DAYS : GOLD_OVERDUE_DAYS;
      const cutoffDate = moment().subtract(days, 'days');

      const overduePlayers = Array.from(guildData.entries())
        .map(([name, pData]) => [name, pData.get(key) || 0, pData.get(dateKey)])
        .filter(([_name, _amount, lastUpdated]) => !lastUpdated || moment(lastUpdated).isBefore(cutoffDate))
        .sort(([_name1, _amount1, lastUpdated1], [_name2, _amount2, lastUpdated2]) => new Date(lastUpdated1) - new Date(lastUpdated2)) // Sort ascending
        .map(([name, amount, lastUpdated]) => [name, amount, toRelativeDate(lastUpdated)])
        .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`)
        .join('\n');
      await interaction.reply(`Overdue Members for ${key}:\n${overduePlayers}`);
      break;

    case 'total-essence':
    case 'total-gold':
      const playersData = Array.from(guildData.entries())
        .map(([name, pData]) => [name, pData.get(key) || 0, getLastUpdated(pData, dateKey)]);
      const memberCount = playersData.length;
      const total = playersData.reduce((sum, [_name, amount]) => sum + amount, 0);
      const breakdown = playersData
        .sort(([_name1, amount1, _lastUpdated1], [_name2, amount2, _lastUpdated2]) => amount2 - amount1) // Sort descending
        .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`);
      const chunks = [];
      // Start with the preamble/boilerplate
      let currentChunk = `Total Club ${key}: ${total}\nMembers: ${memberCount}\n\nBreakdown:\n`;

      // Discord bots have a 2000 character limit
      // Break on a player's data, not at an arbitrary character
      for(const part of breakdown) {
        if ((currentChunk + part).length > DISCORD_CHAR_LIMIT) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk += part + '\n';
      }

      // Take care of any leftover text
      if(currentChunk) {
        chunks.push(currentChunk);
      }

      // First chunk needs to use reply
      await interaction.reply(chunks[0]);
      // Subsequent chunks use followUp
      for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp(chunks[i]);
      }

      break;
  }
});

client.login(process.env.TOKEN);
