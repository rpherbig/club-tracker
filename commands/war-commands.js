import { findChannel, findRole, validateCommandChannel, sendEphemeralReply } from '../utils/discord-helpers.js';

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
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    // Find the ShellShock role
    const shellShockRole = findRole(interaction.guild, 'shellshock');

    if (!shellShockRole) {
        await sendEphemeralReply(interaction, 'Could not find the ShellShock role!');
        return;
    }

    const message = `Good news, <@&${shellShockRole.id}>! It's time to find F${floor}! ${additionalMessage}`;
    await channel.send(message);
    await sendEphemeralReply(interaction, `Sent the 'find' message in #species-war to find floor ${floor}!`);
}

// 'Kill' command implementation
async function handleKill(interaction) {
    // Check if the command is being used in #species-war
    if (!await validateCommandChannel(interaction, 'species-war')) {
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    // Find all possible roles. Will return null if the role is not found.
    const laborer = findRole(interaction.guild, 'laborer');
    const prospector = findRole(interaction.guild, 'prospector');
    const prospectorDelta = findRole(interaction.guild, 'prospector delta');
    const prospectorEpsilon = findRole(interaction.guild, 'prospector epsilon');
    const vanguardBeta = findRole(interaction.guild, 'vanguard beta');
    const vanguard = findRole(interaction.guild, 'vanguard');
    const shellShock = findRole(interaction.guild, 'shellshock');

    // Get roles for this floor
    let roles;
    switch (floor) {
        case 11:
        case 12:
        case 13:
            roles = [laborer, prospectorEpsilon];
            break;
        case 14:
            roles = [laborer, prospectorEpsilon, prospectorDelta];
            break;
        case 15:
            roles = [laborer, prospector];
            break;
        case 16:
            roles = [prospector, vanguardBeta];
            break;
        case 17:
            roles = [prospector, vanguard];
            break;
        case 18:
            roles = [shellShock];
            break;
        case 19:
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
    const message = `Good news, ${roleMentions}! F${floor} has been found! ${additionalMessage}`;

    try {
        await channel.send(message);
        await sendEphemeralReply(interaction, `Sent the 'kill' message in #species-war to kill floor ${floor}!`);
    } catch (error) {
        console.error('Error sending message:', error);
        if (!interaction.replied && !interaction.deferred) {
            await sendEphemeralReply(interaction, 'There was an error sending the message. Please try again.');
        }
    }
}

export { handleFind, handleKill }; 