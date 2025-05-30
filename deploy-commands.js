import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

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
    name: 'overdue-essence',
    description: 'Show players who are overdue updating their essence value'
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
  },
  {
    name: 'overdue-gold',
    description: 'Show players who are overdue updating their gold value'
  },
  {
    name: 'find',
    description: 'Send a message telling club members to dig to a specific floor',
    options: [
      {
        name: 'floor',
        type: 4,
        description: 'Floor number to dig to (11-20)',
        required: true,
        min_value: 11,
        max_value: 20
      },
      {
        name: 'message',
        type: 3,
        description: 'Additional message to append',
        required: false
      }
    ]
  },
  {
    name: 'kill',
    description: 'Send a message telling club members to kill a specific floor',
    options: [
      {
        name: 'floor',
        type: 4,
        description: 'Floor number to kill (11-20)',
        required: true,
        min_value: 11,
        max_value: 20
      },
      {
        name: 'message',
        type: 3,
        description: 'Additional message to append',
        required: false
      }
    ]
  },
  {
    name: 'post-forgetful-message',
    description: 'Posts the message for users to react to for the Forgetful role.'
  },
  {
    name: 'trigger-daily-checkin',
    description: 'Manually trigger the daily check-in message.'
  },
  {
    name: 'sync-sheet-roles',
    description: 'Manually sync roles from the Google Sheet without sending announcements',
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
