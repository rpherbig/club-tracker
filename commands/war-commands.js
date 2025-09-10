import { findChannel, findRole, validateCommandChannel, sendEphemeralReply, getRandomMessage, sendChannelMessage } from '../utils/discord-helpers.js';

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
        return;
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

    // Find all possible roles. Will return null if the role is not found.
    const laborer = findRole(interaction.guild, 'laborer');
    const prospector = findRole(interaction.guild, 'prospector');
    const prospector16 = findRole(interaction.guild, 'prospector 16');
    const prospector11 = findRole(interaction.guild, 'prospector 11');
    const prospector17 = findRole(interaction.guild, 'prospector 17');
    const vanguard18 = findRole(interaction.guild, 'vanguard 18');
    const vanguard = findRole(interaction.guild, 'vanguard');
    const shellShock = findRole(interaction.guild, 'shellshock');

    // Get roles for this floor
    let roles;
    switch (floor) {
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
            roles = [laborer, prospector11];
            break;
        case 16:
            roles = [laborer, prospector11, prospector16];
            break;
        case 17:
            roles = [laborer, prospector];
            break;
        case 18:
            roles = [laborer, prospector, vanguard18];
            break;
        case 19:
            roles = [shellShock];
            break;
        case 20:
            await sendEphemeralReply(interaction, `F${floor} is not supported yet!`);
            return;
        default:
            await sendEphemeralReply(interaction, 'Invalid floor number!');
            return;
    }

    // Check if all required roles exist
    const missingRoles = roles.filter(role => !role);
    if (missingRoles.length > 0) {
        await sendEphemeralReply(interaction, 'One or more required roles are missing! Please check that all roles exist.');
        return;
    }

    // Format the message with the roles
    const roleMentions = roles.map(role => `<@&${role.id}>`).join(' ');
    const message = getRandomMessage(roleMentions, `Go kill the boss of F${floor}! ${additionalMessage}`);

    const sentMessage = await sendChannelMessage(channel, message);
    if (sentMessage) {
        await sendEphemeralReply(interaction, `Sent the 'kill' message in #species-war to kill floor ${floor}!`);
    } else {
        await sendEphemeralReply(interaction, `Failed to send the 'kill' message. I may not have permission to send messages in #species-war.`);
    }
}

export { handleFind, handleKill }; 