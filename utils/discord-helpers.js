import { MessageFlags } from 'discord.js';

// Unified Professor Farnsworth-style message templates
const FARNESWORTH_TEMPLATES = [
    "Good news, {roles}! {message}",
    "Good news, {roles}! I'm still technically alive! {message}",
    "Good news, {roles}! It's time to deliver a crate of subpoenas to Sicily 8, the Mob Planet. {message}",
    "Good news, {roles}! It's time to make a delivery to Ebola 9, the virus planet. {message}",
    "Good news, {roles}! We have a mission to further the noble cause of intergalactic peace. {message}",
    "Good news, {roles}! Several years ago I tried to log on to AOL, and it just went through! {message}",
    "Good news, {roles}! We were supposed to make a delivery to the planet Tweenis 12 but it's been completely destroyed. They paid in advance! {message}",
    "Good news, {roles}! There's a report on the TV with some very bad news! {message}",
    "Good news, {roles}, it's a suppository! {message}",
    "Wernstrom! {roles}! {message}",
    "Sweet zombie Jesus, {roles}! {message}",
    "This is a fine day for science, {roles}! {message}",
    "Huh... whaaaaa, {roles}? {message}",
    "If cop a feel I must, then cop a feel I shall. {roles}, {message}",
    "{roles}, that question is less stupid, though you asked it in a profoundly stupid way. {message}",
    "{roles}, here's where I keep assorted lengths of wire. {message}",
    "{roles}, with my last breath, I curse Zoidberg! {message}",
    "{roles}, you'll be making a delivery to the darkest depths of outer space... or Cleveland. {message}",
    "{roles}, I'm going to build my own mobile game! With blackjack! And hookers! {message}",
    "{roles}, I'm not sure if I'm going to show up drunk or not show up at all. {message}",
    "{roles}, I've taught the toaster to feel love! {message}",
    "{roles}, there's no scientific consensus that life is important. {message}",
    "{roles}, let us bow our heads in prayer. Oh, mighty Isis... {message}",
    "{roles}, wangle a new dangle on life! {message}",
    "{roles}, we've got to show these people we're not bitter husks of human beings who long ago abandoned hope of finding love in this lifetime. {message}",
    "{roles}, astronomers renamed Uranus in 2620 to end that stupid joke once and for all. It's now called Urrectum! {message}",
    "{roles}, your mouth just wrote a PayPal request transfer that your butt has insufficient funds to honor. {message}",
    "{roles}, you look beautiful. Incidentally, my favorite artist is Picasso. {message}",
    "{roles}, if anyone needs me I'll be in the Angry Dome. {message}",
    "{roles}, I still don't understand why you wouldn't let me graft a laser cannon on your chest to crush those who disobey you. {message}",
    "{roles}, these old doomsday devices are dangerously unstable. I'll rest easier not knowing where they are. {message}",
    "{roles}, it's the Apocalypse, alright. I always thought I'd have a hand in it. {message}",
    "{roles}, I'm beginning to think there'll be no forced mating at all. {message}",
    "{roles}, there's just one small problem - and it's a big one. {message}",
    "Oh no, {roles}, now I'm 53 years old? I'll need a fake I.D. to rent ultra-porn! {message}",
    "My God, {roles}, this is an outrage. I was going to eat that mummy! {message}",
    "Yes yes yes, {roles}, you sound like a broken mp3. {message}",
    "Ah, perfect timing, {roles}. I just turbo charged the matter compressor. What's the matter compressor? Nothing's the matter, now! {message}",
    "Ohh, a lesson in not changing history from Mr. I'm-My-Own-Grandpa! Well, {roles}, {message}",
    "Hail science, {roles}! {message}",
    "No fair, {roles}! You changed the outcome by measuring it! {message}",
    "Be careful, {roles}! And if you kill anyone, make sure to eat their heart. To gain their courage. Their rich, tasty courage. {message}",
    "To shreds, you say? Well, {roles}, {message}",
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