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

// 'Find' command implementation
async function handleFind(interaction) {
    const floor = interaction.options.getInteger('floor');
    const channel = await getWarOrdersChannel(interaction);
    
    if (!channel) return;

    // Find the ShellShock role
    const shellShockRole = interaction.guild.roles.cache.find(role => 
        role.name.toLowerCase().includes('shellshock')
    );

    if (!shellShockRole) {
        await interaction.reply({
            content: 'Could not find the ShellShock role!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await channel.send(`<@&${shellShockRole.id}> find floor ${floor}!`);
    await interaction.reply({
        content: `Sent find command for floor ${floor}!`,
        flags: MessageFlags.Ephemeral
    });
}

module.exports = {
    handleFind,
    // Add more command handlers here as needed
}; 