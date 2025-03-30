import { Client, GatewayIntentBits } from 'discord.js';
import { promises as fs } from 'fs';
import { handleFind, handleKill } from './commands/war-commands.js';
import { handleSetResource, handleShowResource, handleOverdueResource, handleTotalResource } from './commands/resource-commands.js';
import dotenv from 'dotenv';

dotenv.config();

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
      await handleFind(interaction);
      break;

    case 'kill':
      await handleKill(interaction);
      break;
  }
});

client.login(process.env.TOKEN);
