import { findChannel, findRole, validateCommandChannel, sendEphemeralReply, getRandomMessage, sendChannelMessage, formatChannelTag } from '../utils/discord-helpers.js';
import { getDiscordRoleNameByTemplateKey, getKillPingRoleSpecs } from '../config/roles.js';
import { WAR_COMMANDS_CHANNEL_NAME, WAR_ORDERS_CHANNEL_NAME } from '../config/channels.js';

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

async function getWarOrdersChannel(interaction) {
    const channel = findChannel(interaction.guild, WAR_ORDERS_CHANNEL_NAME);
    if (!channel) {
        await sendEphemeralReply(
            interaction,
            `Could not find ${formatChannelTag(WAR_ORDERS_CHANNEL_NAME)}! Please check the channel name and bot permissions.`
        );
        return null;
    }
    return channel;
}

async function replyWarOrdersSendResult(interaction, commandLabel, channel, floor = null) {
    const tag = formatChannelTag(channel);
    const floorSuffix = floor != null ? ` for floor ${floor}` : '';
    const sentMessage = await sendChannelMessage(channel, commandLabel.message);
    if (sentMessage) {
        await sendEphemeralReply(interaction, `Sent the '${commandLabel.name}' message in ${tag}${floorSuffix}!`);
    } else {
        await sendEphemeralReply(
            interaction,
            `Failed to send the '${commandLabel.name}' message. I may not have permission to send messages in ${tag}.`
        );
    }
}

// 'Find' command implementation
async function handleFind(interaction) {
    if (!await validateCommandChannel(interaction, WAR_COMMANDS_CHANNEL_NAME)) {
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    
    if (isDuplicateCommand('find', floor)) {
        await sendEphemeralReply(interaction, `A /find command for floor ${floor} was recently executed. Please wait before trying again.`);
        return;
    }
    
    const channel = await getWarOrdersChannel(interaction);
    if (!channel) return;

    const shellShockRole = findRole(interaction.guild, 'shellshock');
    if (!shellShockRole) {
        await sendEphemeralReply(interaction, 'Could not find the ShellShock role!');
        return;
    }

    const message = getRandomMessage(shellShockRole, `It's time to find F${floor}! ${additionalMessage}`);
    await replyWarOrdersSendResult(interaction, { name: 'find', message }, channel, floor);
}

// 'Kill' command implementation
async function handleKill(interaction) {
    if (!await validateCommandChannel(interaction, WAR_COMMANDS_CHANNEL_NAME)) {
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    
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

    const roleSpecs = getKillPingRoleSpecs(floor);
    const roles = roleSpecs.map(resolveRole);

    const missingRoles = roles.filter(role => !role);
    if (missingRoles.length > 0) {
        await sendEphemeralReply(interaction, 'One or more required roles are missing! Please check that all roles exist.');
        return;
    }

    const roleMentions = roles.map(role => `<@&${role.id}>`).join(' ');
    const message = getRandomMessage(roleMentions, `Go kill the boss of F${floor}! ${additionalMessage}`);
    await replyWarOrdersSendResult(interaction, { name: 'kill', message }, channel, floor);
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
    if (!await validateCommandChannel(interaction, WAR_COMMANDS_CHANNEL_NAME)) {
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
    const tag = formatChannelTag(channel);
    if (sentMessage) {
        await sendEphemeralReply(interaction, `Sent the Mantis counter to ${tag}!`);
    } else {
        await sendEphemeralReply(interaction, `Failed to send the Mantis counter. I may not have permission to send messages in ${tag}.`);
    }
}

export { handleFind, handleKill, handleMantis };
