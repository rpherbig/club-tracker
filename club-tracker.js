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

async function loadEssence() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return new Map(Object.entries(JSON.parse(data)));
  } catch {
    console.log(`No data file found at: ${DATA_FILE}`);
    return new Map();
  }
}

async function saveEssence(essence) {
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(Object.fromEntries(essence)),
    'utf8'
  );
}

let clubEssence;

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  clubEssence = await loadEssence();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case 'set-essence':
      const amount = interaction.options.getInteger('amount');
      const username = interaction.user.username.toLowerCase();
      clubEssence.set(username, amount);
      await saveEssence(clubEssence);
      await interaction.reply(`Set your essence to ${amount}`);
      break;

    case 'set-player-essence':
      const player = interaction.options.getString('player');
      const playerAmount = interaction.options.getInteger('amount');
      clubEssence.set(player.toLowerCase(), playerAmount);
      await saveEssence(clubEssence);
      await interaction.reply(`Set ${player}'s essence to ${playerAmount}`);
      break;

    case 'show-essence':
      //console.log(`interaction: ${Object.keys(interaction)}`)
      const targetPlayer = interaction.options.getString('player')?.toLowerCase() || interaction.user.username.toLowerCase();
      const essence = clubEssence.get(targetPlayer) || 0;
      await interaction.reply(`${targetPlayer} has ${essence} essence`);
      break;

    case 'total-essence':
      const total = Array.from(clubEssence.values()).reduce((sum, val) => sum + val, 0);
      const breakdown = Array.from(clubEssence.entries())
        .sort((a, b) => b[1] - a[1]) // [0] is name; [1] is amount
        .map(([name, amount]) => `${name}: ${amount}`)
        .join('\n');
      await interaction.reply(`Total Club Essence: ${total}\n\nBreakdown:\n${breakdown}`);
      break;
  }
});

client.login(process.env.TOKEN);
