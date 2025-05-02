// Commands related to the Forgetful role reminder feature

import { MessageFlags, PermissionsBitField } from 'discord.js';

const TARGET_CHANNEL_NAME = 'friends-of-ss-chat';
const ALLOWED_COMMAND_CHANNEL_NAME = '🤖┃bot-commands';

// Returns the new message ID (string) on success, or null on failure.
async function handlePostForgetfulMessage(interaction) {
  try {
    // 1. Check if the command is used in the allowed channel
    if (interaction.channel.name !== ALLOWED_COMMAND_CHANNEL_NAME) {
      await interaction.reply({
        content: `This command can only be used in #${ALLOWED_COMMAND_CHANNEL_NAME}.`,
        flags: MessageFlags.Ephemeral
      });
      return null;
    }

    // 2. Find the target channel
    const targetChannel = interaction.guild.channels.cache.find(
      channel => channel.name === TARGET_CHANNEL_NAME
    );

    if (!targetChannel) {
      await interaction.reply({
        content: `Could not find the #${TARGET_CHANNEL_NAME} channel. Please ensure it exists and the bot can see it.`,
        flags: MessageFlags.Ephemeral
      });
      return null;
    }

    // Check bot permissions in the target channel
    const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
        await interaction.reply({
            content: `I don't have permission to send messages in #${TARGET_CHANNEL_NAME}.`,
            flags: MessageFlags.Ephemeral
        });
        return null;
    }

    // 3. Post the message
    const message = await targetChannel.send(
      'React to this message with any emoji to get the \'Forgetful\' role and receive daily check-in reminders!'
    );

    // 4. Seed the message with a reaction for easy clicking
    try {
        await message.react('✅'); 
    } catch (reactError) {
        console.error(`Failed to react to message ${message.id} in guild ${interaction.guildId}:`, reactError);
        // Continue anyway, main functionality is posting
    }

    // 5. Confirm to the user
    await interaction.reply({
      content: `Successfully posted the role assignment message in #${TARGET_CHANNEL_NAME}. Its ID is ${message.id}. I will listen for reactions on this message.`,
      flags: MessageFlags.Ephemeral
    });

    return message.id;
  } catch (error) {
    console.error('Error in handlePostForgetfulMessage:', error);
    // Attempt to reply if interaction is still available
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred while processing your command.', flags: MessageFlags.Ephemeral });
    } else {
        await interaction.reply({ content: 'An error occurred while processing your command.', flags: MessageFlags.Ephemeral });
    }
    return null;
  }
}

export { handlePostForgetfulMessage }; 