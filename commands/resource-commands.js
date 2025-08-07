import moment from 'moment';
import { validateCommandChannel, sendEphemeralReply } from '../utils/discord-helpers.js';

const ESSENCE_OVERDUE_DAYS = 14;
const GOLD_OVERDUE_DAYS = 42;
const DISCORD_CHAR_LIMIT = 1800;

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

export async function handleSetResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  const amount = interaction.options.getInteger('amount');
  const player = interaction.commandName.startsWith('set-player') 
    ? interaction.options.getString('player').toLowerCase()
    : interaction.member.displayName.toLowerCase();

  const playerData = guildData.get(player) || new Map();
  playerData.set(key, amount);
  playerData.set(dateKey, moment());
  guildData.set(player, playerData);
  await sendEphemeralReply(interaction, `Set ${player}'s ${key} to ${amount}`);
  return guildData;
}

export async function handleShowResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  const targetPlayer = interaction.member.displayName.toLowerCase();
  
  const targetPlayerData = guildData.get(targetPlayer) || new Map();
  const val = targetPlayerData.get(key) || 0;
  const lastUpdated = getLastUpdated(targetPlayerData, dateKey);
  await sendEphemeralReply(interaction, `${targetPlayer} has ${val} ${key} (last updated ${lastUpdated})`);
}

export async function handleOverdueResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  const days = key === "essence" ? ESSENCE_OVERDUE_DAYS : GOLD_OVERDUE_DAYS;
  const cutoffDate = moment().subtract(days, 'days');

  const overduePlayers = Array.from(guildData.entries())
    .map(([name, pData]) => [name, pData.get(key) || 0, pData.get(dateKey)])
    .filter(([_name, _amount, lastUpdated]) => !lastUpdated || moment(lastUpdated).isBefore(cutoffDate))
    .sort(([_name1, _amount1, lastUpdated1], [_name2, _amount2, lastUpdated2]) => new Date(lastUpdated1) - new Date(lastUpdated2))
    .map(([name, amount, lastUpdated]) => [name, amount, toRelativeDate(lastUpdated)])
    .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`)
    .join('\n');
  await sendEphemeralReply(interaction, `Overdue Members for ${key}:\n${overduePlayers}`);
}

export async function handleTotalResource(interaction, guildData) {
  const key = interaction.commandName.includes("essence") || interaction.commandName === "se" ? 'essence' : 'gold';
  const dateKey = `${key}-date`;
  
  const playersData = Array.from(guildData.entries())
    .map(([name, pData]) => [name, pData.get(key) || 0, getLastUpdated(pData, dateKey)]);
  const memberCount = playersData.length;
  const total = playersData.reduce((sum, [_name, amount]) => sum + amount, 0);
  const breakdown = playersData
    .sort(([_name1, amount1, _lastUpdated1], [_name2, amount2, _lastUpdated2]) => amount2 - amount1)
    .map(([name, amount, lastUpdated]) => `${name}: ${amount} (last updated ${lastUpdated})`);
  const chunks = [];
  
  let currentChunk = `Total Club ${key}: ${total}\nMembers: ${memberCount}\n\nBreakdown:\n`;

  for(const part of breakdown) {
    if ((currentChunk + part).length > DISCORD_CHAR_LIMIT) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += part + '\n';
  }

  if(currentChunk) {
    chunks.push(currentChunk);
  }

  await sendEphemeralReply(interaction, chunks[0]);
  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp(chunks[i]);
  }
}

export async function handleRemovePlayer(interaction, guildData) {
  const ALLOWED_COMMAND_CHANNEL_NAME = '🤖┃bot-commands';
  
  // Check if the command is used in the allowed channel
  if (!await validateCommandChannel(interaction, ALLOWED_COMMAND_CHANNEL_NAME)) {
    return guildData;
  }

  const player = interaction.options.getString('player').toLowerCase();
  
  if (!guildData.has(player)) {
    await sendEphemeralReply(interaction, `❌ Player '${player}' not found in the data.`);
    return guildData;
  }

  // Remove the player from the data
  guildData.delete(player);
  await sendEphemeralReply(interaction, `✅ Successfully removed player '${player}' from the data.`);
  return guildData;
} 