const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'set-essence',
    description: 'Set essence count for yourself',
    options: [
      {
        name: 'amount',
        type: 4,
        description: 'Amount of essence',
        required: true
      }
    ]
  },
  {
    name: 'se',
    description: 'Set essence count for yourself',
    options: [
      {
        name: 'amount',
        type: 4,
        description: 'Amount of essence',
        required: true
      }
    ]
  },
  {
    name: 'set-player-essence',
    description: 'Set essence count for a specific player',
    options: [
      {
        name: 'player',
        type: 3,
        description: 'Player name',
        required: true
      },
      {
        name: 'amount',
        type: 4,
        description: 'Amount of essence',
        required: true
      }
    ]
  },
  {
    name: 'show-essence',
    description: 'Show essence count for yourself'
  },
  {
    name: 'total-essence',
    description: 'Show total essence for all club members'
  },
  {
    name: 'set-gold',
    description: 'Set gold count for yourself',
    options: [
      {
        name: 'amount',
        type: 4,
        description: 'Amount of gold',
        required: true
      }
    ]
  },
  {
    name: 'sg',
    description: 'Set gold count for yourself',
    options: [
      {
        name: 'amount',
        type: 4,
        description: 'Amount of gold',
        required: true
      }
    ]
  },
  {
    name: 'set-player-gold',
    description: 'Set gold count for a specific player',
    options: [
      {
        name: 'player',
        type: 3,
        description: 'Player name',
        required: true
      },
      {
        name: 'amount',
        type: 4,
        description: 'Amount of gold',
        required: true
      }
    ]
  },
  {
    name: 'show-gold',
    description: 'Show gold count for yourself'
  },
  {
    name: 'total-gold',
    description: 'Show total gold for all club members'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
