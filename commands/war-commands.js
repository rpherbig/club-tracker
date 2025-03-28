const { MessageFlags } = require('discord.js');

// Helper function to get the war-orders channel
async function getWarOrdersChannel(interaction) {
    const channel = interaction.guild.channels.cache.find(
        channel => channel.name === 'war-orders'
    );

    if (!channel) {
        await interaction.reply({
            content: 'Could not find the war-orders channel! Please check the channel name and bot permissions.',
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
    // Check if the command is being used in the species-war channel
    if (interaction.channel.name !== 'species-war') {
        await interaction.reply({
            content: 'This command can only be used in the species-war channel!',
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
        content: `Sent the 'find' message in #species-war channel to find floor ${floor}!`,
        flags: MessageFlags.Ephemeral
    });
}

module.exports = {
    handleFind,
    // Add more command handlers here as needed
}; 