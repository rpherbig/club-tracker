import { MessageFlags } from 'discord.js';

// Unified Professor Farnsworth-style message templates
const FARNESWORTH_TEMPLATES = [
    "Good news, {roles}! {message}",
    "Wernstrom! {roles}! {message}",
    "Sweet zombie Jesus, {roles}! {message}",
    "{roles}, I'm going to build my own mobile game! With blackjack! And hookers! {message}",
    "{roles}, I'm not sure if I'm going to show up drunk or not show up at all. {message}",
    "{roles}, I've taught the toaster to feel love! {message}",
    "To shreds, you say? Well, {roles}: {message}",
    "I don't want to live on this planet anymore... but first, {roles}, {message}",
];

/**
 * Finds a channel in a guild by name
 * @param {Guild} guild - The Discord guild to search in
 * @param {string} channelName - The name of the channel to find
 * @param {string} [errorMessage] - Optional error message to log if channel not found
 * @returns {Channel|null} The found channel or null if not found
 */
export function findChannel(guild, channelName, errorMessage = null) {
    const channel = guild.channels.cache.find(ch => ch.name === channelName);
    if (!channel && errorMessage) {
        console.log(`[Channel] Channel #${channelName} not found in guild ${guild.name}. ${errorMessage}`);
    }
    return channel;
}

/**
 * Finds a role in a guild by name (case-insensitive)
 * @param {Guild} guild - The Discord guild to search in
 * @param {string} roleName - The name of the role to find
 * @returns {Role|null} The found role or null if not found
 */
export function findRole(guild, roleName) {
    return guild.roles.cache.find(role => 
        role.name.toLowerCase() === roleName.toLowerCase()
    );
}

/**
 * Checks if the bot has required permissions in a channel
 * @param {Channel} channel - The Discord channel to check permissions in
 * @param {PermissionResolvable} requiredPermissions - The permissions to check for
 * @returns {boolean} True if bot has required permissions, false otherwise
 */
export function checkBotPermissions(channel, requiredPermissions) {
    const botPermissions = channel.permissionsFor(channel.guild.members.me);
    if (!botPermissions || !botPermissions.has(requiredPermissions)) {
        console.log(`[Permissions] Missing required permissions in #${channel.name} for guild ${channel.guild.name}`);
        return false;
    }
    return true;
}

/**
 * Validates that a command is being used in an allowed channel
 * @param {CommandInteraction} interaction - The command interaction
 * @param {string} allowedChannelName - The name of the allowed channel
 * @returns {Promise<boolean>} True if command is in allowed channel, false otherwise
 */
export async function validateCommandChannel(interaction, allowedChannelName) {
    if (interaction.channel.name !== allowedChannelName) {
        await interaction.reply({
            content: `This command can only be used in #${allowedChannelName}!`,
            flags: MessageFlags.Ephemeral
        });
        return false;
    }
    return true;
}

/**
 * Sends an ephemeral reply to an interaction
 * @param {CommandInteraction} interaction - The command interaction
 * @param {string} content - The message content
 * @returns {Promise<void>}
 */
export async function sendEphemeralReply(interaction, content) {
    if (interaction.replied) {
        await interaction.followUp({
            content,
            flags: MessageFlags.Ephemeral
        });
    } else {
        await interaction.reply({
            content,
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Finds a member in a guild by name or ID
 * @param {Guild} guild - The Discord guild to search in
 * @param {string} name - The name or ID to search for
 * @param {Object} [options] - Optional configuration
 * @param {Object} [options.nameMapping] - Optional mapping of names to Discord IDs
 * @returns {GuildMember|null} The found member or null if not found
 */
export function findMemberByName(guild, name, options = {}) {
    const { nameMapping = {} } = options;
    
    // First check if we have a mapping for this name
    const mappedName = nameMapping[name];
    if (mappedName) {
        // If the mapped name is a Discord ID (18 digits)
        if (/^\d{17,19}$/.test(mappedName)) {
            return guild.members.cache.get(mappedName);
        }
        // Otherwise treat it as a username
        return guild.members.cache.find(
            m => m.user.username.toLowerCase() === mappedName.toLowerCase() ||
                 m.displayName.toLowerCase() === mappedName.toLowerCase()
        );
    }

    // If no mapping exists, try the original name
    return guild.members.cache.find(
        m => m.user.username.toLowerCase() === name.toLowerCase() ||
             m.displayName.toLowerCase() === name.toLowerCase()
    );
}

/**
 * Logs command usage with timestamp and user info
 * @param {CommandInteraction} interaction - The command interaction
 * @param {string} commandName - The name of the command being used
 * @returns {void}
 */
export function logCommandUsage(interaction, commandName) {
    console.log(`[${new Date().toISOString()}] User ${interaction.user.tag} used /${commandName} command in #${interaction.channel.name} (${interaction.guild.name})`);
}

/**
 * Sends a message to a channel, handling Discord's character limit by truncating if necessary
 * @param {TextChannel} channel - The channel to send the message to
 * @param {string} content - The message content
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.maxLength=2000] - Maximum length before truncating
 * @param {string} [options.truncateMessage='...\n(Message truncated)'] - Message to append when truncated
 * @returns {Promise<Message>} The sent message
 */
export async function sendTruncatedMessage(channel, content, options = {}) {
    const { maxLength = 2000, truncateMessage = '...\n(Message truncated)' } = options;
    
    if (content.length > maxLength) {
        content = content.substring(0, maxLength - truncateMessage.length) + truncateMessage;
    }
    
    return await channel.send(content);
}

/**
 * Gets a random message from the Farnsworth templates, replacing placeholders with provided values
 * @param {string} roles - The roles to insert into the message
 * @param {string} message - The message to insert
 * @returns {string} The formatted message
 */
export function getRandomMessage(roles, message) {
    const template = FARNESWORTH_TEMPLATES[Math.floor(Math.random() * FARNESWORTH_TEMPLATES.length)];
    return template.replace(/{roles}/g, roles).replace(/{message}/g, message);
} 