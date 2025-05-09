import { MessageFlags } from 'discord.js';

// Helper function to get the war-orders channel
async function getWarOrdersChannel(interaction) {
    const channel = interaction.guild.channels.cache.find(
        channel => channel.name === 'war-orders'
    );

    if (!channel) {
        await interaction.reply({
            content: 'Could not find #war-orders! Please check the channel name and bot permissions.',
            flags: MessageFlags.Ephemeral
        });
        return null;
    }

    return channel;
}

// Helper function to find a role by name
function findRole(interaction, roleName) {
    return interaction.guild.roles.cache.find(role => 
        role.name.toLowerCase() === roleName.toLowerCase()
    );
}

// 'Find' command implementation
async function handleFind(interaction) {
    // Check if the command is being used in #species-war
    if (interaction.channel.name !== 'species-war') {
        await interaction.reply({
            content: 'This command can only be used in #species-war!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    // Find the ShellShock role
    const shellShockRole = findRole(interaction, 'shellshock');

    if (!shellShockRole) {
        await interaction.reply({
            content: 'Could not find the ShellShock role!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const message = `Good news, <@&${shellShockRole.id}>! It's time to find F${floor}! ${additionalMessage}`;
    await channel.send(message);
    await interaction.reply({
        content: `Sent the 'find' message in #species-war to find floor ${floor}!`,
        flags: MessageFlags.Ephemeral
    });
}

// 'Kill' command implementation
async function handleKill(interaction) {
    // Check if the command is being used in #species-war
    if (interaction.channel.name !== 'species-war') {
        await interaction.reply({
            content: 'This command can only be used in #species-war!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const floor = interaction.options.getInteger('floor');
    const additionalMessage = interaction.options.getString('message') || '';
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    // Find all possible roles. Will return null if the role is not found.
    const laborer = findRole(interaction, 'laborer');
    const prospector = findRole(interaction, 'prospector');
    const prospectorDelta = findRole(interaction, 'prospector delta');
    const prospectorEpsilon = findRole(interaction, 'prospector epsilon');
    const vanguardBeta = findRole(interaction, 'vanguard beta');
    const vanguard = findRole(interaction, 'vanguard');
    const shellShock = findRole(interaction, 'shellshock');

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
            await interaction.reply({
                content: `F${floor} is not supported yet!`,
                flags: MessageFlags.Ephemeral
            });
            return;
        default:
            await interaction.reply({
                content: 'Invalid floor number!',
                flags: MessageFlags.Ephemeral
            });
            return;
    }

    // Check if all required roles exist
    const missingRoles = roles.filter(role => !role);
    if (missingRoles.length > 0) {
        await interaction.reply({
            content: 'One or more required roles are missing! Please check that all roles exist.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    // Format the message with the roles
    const roleMentions = roles.map(role => `<@&${role.id}>`).join(' ');
    const message = `Good news, ${roleMentions}! F${floor} has been found! ${additionalMessage}`;

    try {
        await channel.send(message);
        await interaction.reply({
            content: `Sent the 'kill' message in #species-war to kill floor ${floor}!`,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        console.error('Error sending message:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'There was an error sending the message. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

export { handleFind, handleKill }; 