import { MessageFlags, PermissionsBitField } from 'discord.js';
import { findChannel, findRole, validateCommandChannel, checkBotPermissions, sendEphemeralReply, getRandomMessage } from '../utils/discord-helpers.js';

const TARGET_CHANNEL_NAME = 'friends-of-ss-chat';
const ALLOWED_COMMAND_CHANNEL_NAME = '🤖┃bot-commands';
const DAILY_CHECKIN_CHANNEL_NAME = 'daily-discord-checkin';
const FORGETFUL_ROLE_NAME = 'Forgetful';
const MESSAGE_LINK = 'https://discord.com/channels/1036712913727143998/1364121623283896360/1364129089572700190';

export async function sendDailyReminder(guild) {
    console.log(`[Cron Job] Processing daily reminder for guild: ${guild.name} (${guild.id})`);
    try {
        // Find the target channel
        const channel = findChannel(guild, DAILY_CHECKIN_CHANNEL_NAME, 'Skipping daily reminder.');
        if (!channel) return;

        // Find the Forgetful role
        const role = findRole(guild, FORGETFUL_ROLE_NAME);
        if (!role) {
            console.log(`[Cron Job] Role '${FORGETFUL_ROLE_NAME}' not found in guild ${guild.name}. Skipping.`);
            return;
        }

        // Check permissions
        if (!checkBotPermissions(channel, PermissionsBitField.Flags.SendMessages)) {
            console.log(`[Cron Job] Missing Send Messages permission in #${DAILY_CHECKIN_CHANNEL_NAME} for guild ${guild.name}. Skipping.`);
            return;
        }

        // Construct and send the message
        const messageContent = getRandomMessage(role, `Check the daily post: ${MESSAGE_LINK}`);
        await channel.send(messageContent);
        console.log(`[Cron Job] Successfully sent daily check-in message to #${DAILY_CHECKIN_CHANNEL_NAME} in guild ${guild.name}.`);

    } catch (error) {
        console.error(`[Cron Job] Failed to send daily check-in for guild ${guild.name}:`, error);
    }
}

export async function handleTriggerDailyCheckin(interaction) {
    try {
      // 1. Check if the command is used in the allowed channel
      if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
        return;
      }

      await sendDailyReminder(interaction.guild);
      await sendEphemeralReply(interaction, 'Daily check-in message sent successfully!');
    } catch (error) {
      console.error(`[Cron Job] Failed to send daily check-in for guild ${interaction.guild.name}:`, error);
      await sendEphemeralReply(interaction, 'Failed to send daily check-in message. Check the logs for details.');
    }
}

export async function sendArenaPromotionReminder(guild) {
    console.log(`[Cron Job] Processing arena promotion reminder for guild: ${guild.name} (${guild.id})`);
    try {
        // Find the target channel
        const channel = findChannel(guild, 'ss-chat', 'Skipping arena promotion reminder.');
        if (!channel) return;

        // Check permissions
        if (!checkBotPermissions(channel, PermissionsBitField.Flags.SendMessages)) {
            console.log(`[Cron Job] Missing Send Messages permission in #ss-chat for guild ${guild.name}. Skipping.`);
            return;
        }

        // Send the arena promotion reminder message
        await channel.send('Arena promotion is about to end, get in those attacks!');
        console.log(`[Cron Job] Successfully sent arena promotion reminder to #ss-chat in guild ${guild.name}.`);

    } catch (error) {
        console.error(`[Cron Job] Failed to send arena promotion reminder for guild ${guild.name}:`, error);
    }
}

// Returns the new message ID (string) on success, or null on failure.
async function handlePostForgetfulMessage(interaction) {
  try {
    // 1. Check if the command is used in the allowed channel
    if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
      return null;
    }

    // 2. Find the target channel
    const targetChannel = findChannel(interaction.guild, TARGET_CHANNEL_NAME);
    if (!targetChannel) {
      await sendEphemeralReply(interaction, `Could not find the #${TARGET_CHANNEL_NAME} channel. Please ensure it exists and the bot can see it.`);
      return null;
    }

    // Check bot permissions in the target channel
    if (!checkBotPermissions(targetChannel, PermissionsBitField.Flags.SendMessages)) {
        await sendEphemeralReply(interaction, `I don't have permission to send messages in #${TARGET_CHANNEL_NAME}.`);
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
    await sendEphemeralReply(interaction, `Successfully posted the role assignment message in #${TARGET_CHANNEL_NAME}. Its ID is ${message.id}. I will listen for reactions on this message.`);

    return message.id;
  } catch (error) {
    console.error('Error in handlePostForgetfulMessage:', error);
    // Attempt to reply if interaction is still available
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred while processing your command.', flags: MessageFlags.Ephemeral });
    } else {
        await sendEphemeralReply(interaction, 'An error occurred while processing your command.');
    }
    return null;
  }
}

export { handlePostForgetfulMessage }; 