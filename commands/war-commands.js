import { findChannel, findRole, validateCommandChannel, sendEphemeralReply, getRandomMessage, sendChannelMessage } from '../utils/discord-helpers.js';
import { getDiscordRoleNameByTemplateKey } from '../config/roles.js';

// Command history storage - key: "commandType:floor", value: timestamp
const commandHistory = new Map();
const DUPLICATE_TIME_WINDOW = 120000; // 2 minutes in milliseconds

// Helper function to check for duplicates and update history
function isDuplicateCommand(commandType, floor) {
    const key = `${commandType}:${floor}`;
    const now = Date.now();
    const lastExecuted = commandHistory.get(key);
    
    if (lastExecuted && (now - lastExecuted) < DUPLICATE_TIME_WINDOW) {
        return true;
    }
    
    commandHistory.set(key, now);
    return false;
}

// Helper function to get the war-orders channel
async function getWarOrdersChannel(interaction) {
    const channel = findChannel(interaction.guild, 'war-orders');
    if (!channel) {
        await sendEphemeralReply(interaction, 'Could not find #war-orders! Please check the channel name and bot permissions.');
        return null;
    }
    return channel;
}

// 'Find' command implementation
async function handleFind(interaction) {
    // Check if the command is being used in #species-war
    if (!await validateCommandChannel(interaction, 'species-war')) {
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    
    // Check for duplicate command
    if (isDuplicateCommand('find', floor)) {
        await sendEphemeralReply(interaction, `A /find command for floor ${floor} was recently executed. Please wait before trying again.`);
        return;
    }
    
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    // Find the ShellShock role
    const shellShockRole = findRole(interaction.guild, 'shellshock');
    if (!shellShockRole) {
        await sendEphemeralReply(interaction, 'Could not find the ShellShock role!');
    }

    const message = getRandomMessage(shellShockRole, `It's time to find F${floor}! ${additionalMessage}`);
    const sentMessage = await sendChannelMessage(channel, message);
    if (sentMessage) {
        await sendEphemeralReply(interaction, `Sent the 'find' message in #species-war to find floor ${floor}!`);
    } else {
        await sendEphemeralReply(interaction, `Failed to send the 'find' message. I may not have permission to send messages in #species-war.`);
    }
}

// 'Kill' command implementation
async function handleKill(interaction) {
    // Check if the command is being used in #species-war
    if (!await validateCommandChannel(interaction, 'species-war')) {
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    
    // Check for duplicate command
    if (isDuplicateCommand('kill', floor)) {
        await sendEphemeralReply(interaction, `A /kill command for floor ${floor} was recently executed. Please wait before trying again.`);
        return;
    }
    
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    const guild = interaction.guild;
    const resolveRole = (templateKeyOrLiteralName) => {
      const name = getDiscordRoleNameByTemplateKey(templateKeyOrLiteralName) ?? templateKeyOrLiteralName;
      return findRole(guild, name);
    };

    // Floor → template keys (from config) or literal Discord role names for category/ShellShock
    let roleSpecs;
    if (floor <= 16) {
      roleSpecs = ['laborer', 'prospector15'];
    } else if (floor === 17) {
      roleSpecs = ['laborer', 'prospector15', 'prospector17'];
    } else if (floor === 18) {
      roleSpecs = ['laborer', 'Prospector'];
    } else if (floor === 19) {
      roleSpecs = ['laborer', 'Prospector', 'vanguard19'];
    } else if (floor === 20) {
      roleSpecs = ['laborer', 'Prospector', 'vanguard19', 'vanguard20'];
    } else if (floor === 21) {
      roleSpecs = ['laborer', 'Prospector', 'vanguard19', 'vanguard20', 'vanguard21'];
    } else {
      roleSpecs = ['ShellShock'];
    }

    const roles = roleSpecs.map(resolveRole);

    // Check if all required roles exist
    const missingRoles = roles.filter(role => !role);
    if (missingRoles.length > 0) {
        await sendEphemeralReply(interaction, 'One or more required roles are missing! Please check that all roles exist.');
    }

    // Format the message with the roles
    const roleMentions = roles.map(role => `<@&${role?.id}>`).join(' ');
    const message = getRandomMessage(roleMentions, `Go kill the boss of F${floor}! ${additionalMessage}`);

    const sentMessage = await sendChannelMessage(channel, message);
    if (sentMessage) {
        await sendEphemeralReply(interaction, `Sent the 'kill' message in #species-war to kill floor ${floor}!`);
    } else {
        await sendEphemeralReply(interaction, `Failed to send the 'kill' message. I may not have permission to send messages in #species-war.`);
    }
}

// Post-shadow order: value at index 0→2, 1→0, 2→1 (rotate: out = [in[1], in[2], in[0]]).
// In-game verified: 123→231, 132→321, 321→213, 213→132.
const MANTIS_DIGITS = new Set(['1', '2', '3']);

function parseMantisOrder(raw) {
    const order = raw.trim();
    if (order.length !== 3) return null;
    for (const ch of order) {
        if (!MANTIS_DIGITS.has(ch)) return null;
    }
    return order;
}

function mantisCounterSequence(order) {
    const [a, b, c] = order;
    return `${b}-${c}-${a}`;
}

async function handleMantis(interaction) {
    if (!await validateCommandChannel(interaction, 'species-war')) {
        return;
    }

    const raw = interaction.options.getString('order') ?? '';
    const order = parseMantisOrder(raw);
    if (!order) {
        await sendEphemeralReply(interaction, 'Provide exactly three digits, each 1, 2, or 3 (e.g. 321).');
        return;
    }

    const channel = await getWarOrdersChannel(interaction);
    if (!channel) return;

    const counter = mantisCounterSequence(order);
    const message = `The post-shadow move order is: ***${counter}***`;
    const sentMessage = await sendChannelMessage(channel, message);
    if (sentMessage) {
        await sendEphemeralReply(interaction, `Sent the Mantis counter to #war-orders!`);
    } else {
        await sendEphemeralReply(interaction, `Failed to send the Mantis counter. I may not have permission to send messages in #war-orders.`);
    }
}

export { handleFind, handleKill, handleMantis };