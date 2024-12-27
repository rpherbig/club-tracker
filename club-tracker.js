const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
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
  let guildId = interaction.guildId;
  let guildData = data.get(guildId) || new Map();

  switch (interaction.commandName) {
    case 'set-essence':
      const amount = interaction.options.getInteger('amount');
      const displayName = interaction.member.displayName.toLowerCase();
      guildData.set(displayName, amount);
      data.set(guildId, guildData);
      await saveData(data);
      await interaction.reply(`Set your essence to ${amount}`);
      break;

    case 'set-player-essence':
      const player = interaction.options.getString('player').toLowerCase();
      const playerAmount = interaction.options.getInteger('amount');
      guildData.set(player, playerAmount);
      await saveData(data);
      await interaction.reply(`Set ${player}'s essence to ${playerAmount}`);
      break;

    case 'show-essence':
      const targetPlayer = interaction.member.displayName.toLowerCase();
      const essence = guildData.get(targetPlayer) || 0;
      await interaction.reply(`${targetPlayer} has ${essence} essence`);
      break;

    case 'total-essence':
      const total = Array.from(guildData.values()).reduce((sum, val) => sum + val, 0);
      const breakdown = Array.from(guildData.entries())
        .sort((a, b) => b[1] - a[1]) // [0] is name; [1] is amount
        .map(([name, amount]) => `${name}: ${amount}`)
        .join('\n');
      await interaction.reply(`Total Club Essence: ${total}\n\nBreakdown:\n${breakdown}`);
      break;
  }
});

client.login(process.env.TOKEN);
