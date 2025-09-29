import moment from 'moment';
import { validateCommandChannel, sendEphemeralReply, sendChannelMessage, findMemberByName } from '../utils/discord-helpers.js';

const ESSENCE_OVERDUE_DAYS = 14;
const GOLD_OVERDUE_DAYS = 42;

function toRelativeDate(lastUpdated) {
  if(lastUpdated === undefined) {
    return "unknown";
  }
  return moment(new Date()).to(new Date(lastUpdated));
}

function getLastUpdated(playerData, dateKey) {
  const lastUpdated = playerData.get(dateKey);
  return toRelativeDate(lastUpdated);
}

/**
 * Converts a display name to a user ID for data storage
 * For Discord users: returns their actual User ID
 * For external users: returns the display name (which is their ID in the data)
 */
function displayNameToUserId(displayName, guild, guildData) {
  // Check if this is an external user by looking in the data
  // For external users, their "user ID" is just their display name
  const userData = guildData.get(displayName.toLowerCase());
  if (userData && userData.get('external')) {
    return displayName.toLowerCase();
  }
  
  // For Discord users, try to find them in the guild
  // This handles both display names and usernames
  if (guild) {
    const foundMember = findMemberByName(guild, displayName);
    if (foundMember) {
      return foundMember.user.id;
    }
  }
  
  // Fallback - this shouldn't happen in normal operation
  console.warn(`Could not find Discord user for display name: ${displayName}`);
  return displayName; // Keep original case for consistency
}

/**
 * Converts a user ID back to a display name for display
 * For external users: returns the userId as display name (it's already the name like 'grantg')
 * For Discord users: returns their display name from guild, or userId as fallback
 */
function userIdToDisplayName(userId, playerData, guild) {
  if (playerData.get('external')) {
    // For external users, use the userId as display name (it's already the name like 'grantg')
    return userId;
  } else {
    // For Discord users, try to get display name from guild
    const member = guild.members.cache.get(userId);
    return member ? member.displayName : userId;
  }
}

export async function handleSetResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  const amount = interaction.options.getInteger('amount');
  
  let userId, displayName;  
  if (interaction.commandName.startsWith('set-player')) {
    const playerName = interaction.options.getString('player');
    userId = displayNameToUserId(playerName, interaction.guild, guildData);
    displayName = playerName;
  } else {
    userId = interaction.member.user.id;
    displayName = interaction.member.displayName;
  }

  const playerData = guildData.get(userId) || new Map();
  playerData.set(key, amount);
  playerData.set(dateKey, moment());
  guildData.set(userId, playerData);
  
  await sendEphemeralReply(interaction, `Set ${displayName}'s ${key} to ${amount}`);
  return guildData;
}

export async function handleShowResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  const displayName = interaction.member.displayName;
  const userId = interaction.member.user.id;
  
  const targetPlayerData = guildData.get(userId) || new Map();
  const val = targetPlayerData.get(key) || 0;
  const lastUpdated = getLastUpdated(targetPlayerData, dateKey);
  await sendEphemeralReply(interaction, `${displayName} has ${val} ${key} (last updated ${lastUpdated})`);
}

export async function handleOverdueResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  const days = key === "essence" ? ESSENCE_OVERDUE_DAYS : GOLD_OVERDUE_DAYS;
  const cutoffDate = moment().subtract(days, 'days');

  const overduePlayers = Array.from(guildData.entries())
    .map(([userId, pData]) => {
      const displayName = userIdToDisplayName(userId, pData, interaction.guild);
      return [displayName, pData.get(key) || 0, pData.get(dateKey)];
    })
    .filter(([_name, _amount, lastUpdated]) => !lastUpdated || moment(lastUpdated).isBefore(cutoffDate))
    .sort(([_name1, _amount1, lastUpdated1], [_name2, _amount2, lastUpdated2]) => new Date(lastUpdated1) - new Date(lastUpdated2))
    .map(([name, amount, lastUpdated]) => [name, amount, toRelativeDate(lastUpdated)])
    .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`)
    .join('\n');

  // Build the complete message
  const message = `Overdue Members for ${key}:\n${overduePlayers}`;

  // Post the overdue resource info as a new (persistent) message in the channel
  const messageResult = await sendChannelMessage(interaction.channel, message);
  if (messageResult) {
    // Send ephemeral confirmation that the command completed
    await sendEphemeralReply(interaction, "Overdue resource information posted to channel.");
  } else {
    await sendEphemeralReply(interaction, "Failed to post overdue resource information. I may not have permission to send messages in this channel.");
  }
}

export async function handleTotalResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  
  const playersData = Array.from(guildData.entries())
    .map(([userId, pData]) => {
      const displayName = userIdToDisplayName(userId, pData, interaction.guild);
      return [displayName, pData.get(key) || 0, getLastUpdated(pData, dateKey)];
    });
  const memberCount = playersData.length;
  const total = playersData.reduce((sum, [_name, amount]) => sum + amount, 0);
  const breakdown = playersData
    .sort(([_name1, amount1, _lastUpdated1], [_name2, amount2, _lastUpdated2]) => amount2 - amount1)
    .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`);

  // Build the complete message - let sendChannelMessage handle splitting
  const message = `Total Club ${key}: ${total}\nMembers: ${memberCount}\n\nBreakdown:\n${breakdown.join('\n')}`;

  // Post the total resource info as a new (persistent) message in the channel
  const messageResult = await sendChannelMessage(interaction.channel, message);
  if (messageResult) {
    // Send ephemeral confirmation that the command completed
    await sendEphemeralReply(interaction, "Total resource information posted to channel.");
  } else {
    await sendEphemeralReply(interaction, "Failed to post resource information. I may not have permission to send messages in this channel.");
  }
}

export async function handleRemovePlayer(interaction, guildData) {
  const ALLOWED_COMMAND_CHANNEL_NAME = '🤖┃bot-commands';
  
  // Check if the command is used in the allowed channel
  if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
    return guildData;
  }

  const displayName = interaction.options.getString('player');
  const userId = displayNameToUserId(displayName, interaction.guild, guildData);
  
  if (!guildData.has(userId)) {
    await sendEphemeralReply(interaction, `❌ Player '${displayName}' not found in the data.`);
    return guildData;
  }

  // Remove the player from the data
  guildData.delete(userId);
  await sendEphemeralReply(interaction, `✅ Successfully removed player '${displayName}' from the data.`);
  return guildData;
} 