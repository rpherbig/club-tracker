import { findChannel, findRole, validateCommandChannel, sendEphemeralReply, getRandomMessage, sendChannelMessage } from '../utils/discord-helpers.js';

const TARGET_CHANNEL_NAME = 'friends-of-ss-chat';
const ALLOWED_COMMAND_CHANNEL_NAME = '🤖┃bot-commands';
const DAILY_CHECKIN_CHANNEL_NAME = 'daily-discord-checkin';
const FORGETFUL_ROLE_NAME = 'Forgetful';
const MESSAGE_LINK = 'https://discord.com/channels/1036712913727143998/1364121623283896360/1364129089572700190';

export async function sendDailyReminder(guild) {
    console.log(`[Cron Job] Processing daily reminder for guild: ${guild.name} (${guild.id})`);
    
    // Find the target channel
    const channel = findChannel(guild, DAILY_CHECKIN_CHANNEL_NAME, 'Skipping daily reminder.');
    if (!channel) return;

    // Find the Forgetful role
    const role = findRole(guild, FORGETFUL_ROLE_NAME);
    if (!role) {
        console.log(`[Cron Job] Role '${FORGETFUL_ROLE_NAME}' not found in guild ${guild.name}. Skipping.`);
        return;
    }

    // Construct and send the message
    const messageContent = getRandomMessage(role, `Check the daily post: ${MESSAGE_LINK}`);
    const message = await sendChannelMessage(channel, messageContent);
    if (message) {
        console.log(`[Cron Job] Successfully sent daily check-in message to #${DAILY_CHECKIN_CHANNEL_NAME} for guild ${guild.name}.`);
    } else {
      console.error(`[Cron Job] Failed to send daily check-in message to #${DAILY_CHECKIN_CHANNEL_NAME} for guild ${guild.name}`);
    }
}

export async function handleTriggerDailyCheckin(interaction) {
  // 1. Check if the command is used in the allowed channel
  if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
    return;
  }

  await sendDailyReminder(interaction.guild);
  await sendEphemeralReply(interaction, 'Daily check-in message sent successfully!');
}

export async function sendPromotionReminder(guild) {
    console.log(`[Cron Job] Processing promotion reminder for guild: ${guild.name} (${guild.id})`);
    
    // Find the target channel
    const channel = findChannel(guild, DAILY_CHECKIN_CHANNEL_NAME, 'Skipping promotion reminder.');
    if (!channel) return;

    // Find the Forgetful role
    const role = findRole(guild, FORGETFUL_ROLE_NAME);
    if (!role) {
        console.log(`[Cron Job] Role '${FORGETFUL_ROLE_NAME}' not found in guild ${guild.name}. Skipping.`);
        return;
    }

    // Construct and send the message with role mention
    const messageContent = `${role}\n\n# ⚔️ PROMOTION REMINDER ⚔️\n\n🏆 Arena promotion, minion sims, and stock purchases are about to end, don't miss out! 🏆`;
    const message = await sendChannelMessage(channel, messageContent);
    if (message) {
        console.log(`[Cron Job] Successfully sent promotion reminder to #${DAILY_CHECKIN_CHANNEL_NAME} in guild ${guild.name}.`);
    } else {
      console.error(`[Cron Job] Failed to send promotion reminder to #${DAILY_CHECKIN_CHANNEL_NAME} for guild ${guild.name}`);
    }
}

export async function handleTriggerPromotionReminder(interaction) {
  // 1. Check if the command is used in the allowed channel
  if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
    return;
  }

  await sendPromotionReminder(interaction.guild);
  await sendEphemeralReply(interaction, 'Promotion reminder sent successfully!');
}

// Returns the new message ID (string) on success, or null on failure.
export async function handlePostForgetfulMessage(interaction) {
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

  // 3. Post the message
  const message = await sendChannelMessage(targetChannel,
    'React to this message with any emoji to get the \'Forgetful\' role and receive daily check-in reminders!'
  );

  if (!message) {
      await sendEphemeralReply(interaction, `I don't have permission to send messages in #${TARGET_CHANNEL_NAME}.`);
      return null;
  }

  // 4. Seed the message with a reaction for easy clicking
  try {
      await message.react('✅'); 
  } catch (reactError) {
      console.error(`Failed to react to message ${message.id} in guild ${interaction.guildId}:`, reactError);
      // Continue anyway, main functionality is post
  }

  // 5. Confirm to the user
  await sendEphemeralReply(interaction, `Successfully posted the role assignment message in #${TARGET_CHANNEL_NAME}. Its ID is ${message.id}. I will listen for reactions on this message.`);

  return message.id;
}
