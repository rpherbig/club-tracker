const { MessageFlags } = require('discord.js');

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

    const message = `<@&${shellShockRole.id}> find floor ${floor}! ${additionalMessage}`;
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

    // Find all possible roles
    const laborer = findRole(interaction, 'laborer');
    const prospector = findRole(interaction, 'prospector');
    const prospectorDelta = findRole(interaction, 'prospector delta');
    const prospectorEpsilon = findRole(interaction, 'prospector epsilon');
    const vanguardBeta = findRole(interaction, 'vanguard beta');
    const vanguard = findRole(interaction, 'vanguard');

    // Format message based on floor
    let message;
    switch (floor) {
        case 11:
        case 12:
        case 13:
            message = `<@&${laborer.id}> <@&${prospectorEpsilon.id}> F${floor} has been found!`;
            break;
        case 14:
            message = `<@&${laborer.id}> <@&${prospectorEpsilon.id}> <@&${prospectorDelta.id}> F${floor} has been found!`;
            break;
        case 15:
            message = `<@&${laborer.id}> <@&${prospector.id}> F${floor} has been found!`;
            break;
        case 16:
            message = `<@&${prospector.id}> <@&${vanguardBeta.id}> F${floor} has been found!`;
            break;
        case 17:
            message = `<@&${prospector.id}> <@&${vanguard.id}> F${floor} has been found!`;
            break;
        case 18:
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

    // Add additional message if provided
    if (additionalMessage) {
        message += ` ${additionalMessage}`;
    }

    await channel.send(message);
    await interaction.reply({
        content: `Sent the 'kill' message in #species-war to kill floor ${floor}!`,
        flags: MessageFlags.Ephemeral
    });
}

module.exports = {
    handleFind,
    handleKill
}; 