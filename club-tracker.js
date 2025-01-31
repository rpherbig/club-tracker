const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const moment = require('moment');
require('dotenv').config();

const DATA_FILE = 'data.json';

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

  function getLastUpdated(playerData, dateKey) {
    const lastUpdated = playerData.get(dateKey);
    if(lastUpdated === undefined) {
      return "unknown";
    }
    return moment(new Date()).to(new Date(lastUpdated));
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

    case 'total-essence':
    case 'total-gold':
      const playersData = Array.from(guildData.entries())
        .map(([name, pData]) => [name, pData.get(key) || 0, getLastUpdated(pData, dateKey)])
      const total = playersData.reduce((sum, [_name, amount]) => sum + amount, 0);
      const breakdown = playersData
        .sort((a, b) => b[1] - a[1]) // [0] is name; [1] is amount; [2] is lastUpdated
        .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`)
        .join('\n');
      await interaction.reply(`Total Club ${key}: ${total}\n\nBreakdown:\n${breakdown}`);
      break;
  }
});

client.login(process.env.TOKEN);
