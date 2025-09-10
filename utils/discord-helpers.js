import { MessageFlags, PermissionsBitField } from 'discord.js';

// TODO: add role & message to templates
const BENDER_TEMPLATES = [
    "The pie is ready. You guys like swarms of things, right?",
    "My story is a lot like yours, only more interesting 'cause it involves robots.",
    "Hey, the salt in that food was ten percent less than a lethal dose.",
    "I got ants in my butt, and I need to strut.",
    "What Do You Mean 'We', Mammal?",
    "Blackmail Is Such an Ugly Word. I Prefer Extortion.",
    "Compare Your Lives to Mine and Then Kill Yourselves!",
    "Can't You See I'm Using The Toilet?!",
    "Hey, Guess What You're Accessories To!",
    "Hey Sexy Mama... Wanna Kill All Humans?",
    "I'm Bender, Baby! Please Insert Liquor!",
    "I'm Gonna Go Build My Own Theme Park!",
    "Bite My Shiny Metal Ass!",
    "I'm back, baby!",
]

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
    "Good news, {roles}! It's a suppository! {message}",
    "Good news, {roles}! Someone's home is on fire! {message}",
    "Good news, {roles}, it's a suppository! {message}",
    "Good news, {roles}, the university is bringing me up on disciplinary charges! Wait, that's not good news at all! {message}",
    "Wernstrom! {roles}! {message}",
    "Sweet zombie Jesus, {roles}! {message}",
    "This is a fine day for science, {roles}! {message}",
    "After all, {roles}, who needs courage when you have a gun? {message}",
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
    "{roles}, I can own property because I'm not a penniless hippy. {message}",
    "{roles}, God didn't get to be God by giving his money away. {message}",
    "{roles}, now the ball's in Farnsworth's court! {message}",
    "{roles}, oh, how could I have put that bomb timer on upside-down? I'm a dried up husk of a scientist. {message}",
    "{roles}, I could swear I've never seen that robot before. Oh yes, yes! My good friend, of course. {message}",
    "{roles}, let this abomination unto the Lord begin! {message}",
    "{roles}, I should fire you right now, but I'm just not that cold-hearted. Hermes, tell them they're fired. {message}",
    "{roles}, while you were gone, the Globetrotters held a news conference to announce that I was a jive sucker. {message}",
    "Doomsday device, {roles}? I suppose I could part with one and still be feared. {message}",
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
 * Checks if the bot has Send Messages permission in a channel
 * @param {Channel} channel - The Discord channel to check permissions in
 * @returns {boolean} True if bot has Send Messages permission, false otherwise
 */
function _checkBotPermissions(channel) {
    const botPermissions = channel.permissionsFor(channel.guild.members.me);
    if (!botPermissions) {
        console.log(`[Permissions] Bot has no permissions in #${channel.name} for guild ${channel.guild.name} (likely no access to channel)`);
        return false;
    }
    if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
        console.log(`[Permissions] Missing Send Messages permission in #${channel.name} for guild ${channel.guild.name}`);
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
        await sendEphemeralReply(interaction, `This command can only be used in #${allowedChannelName}!`);
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
    try {
        if (interaction.deferred) {
            // If the interaction was deferred, use editReply
            await interaction.editReply(content);
        } else if (interaction.replied) {
            // If already replied, use followUp
            await interaction.followUp({
                content,
                flags: MessageFlags.Ephemeral
            });
        } else {
            // Initial reply
            await interaction.reply({
                content,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        // Log the error but don't throw - Discord.js will handle interaction timeouts automatically
        if (error.code === 40060) { // Interaction has already been acknowledged
            console.warn(`Interaction already acknowledged for command ${interaction.commandName} in ${interaction.guild?.name || 'unknown guild'}`);
        } else if (error.code === 50001) { // Missing access
            console.warn(`Missing access for command ${interaction.commandName} in ${interaction.guild?.name || 'unknown guild'}`);
        } else {
            console.error(`Error sending ephemeral reply for command ${interaction.commandName}:`, error);
        }
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
    
    // First check if we have a mapping for this name (case insensitive)
    const mappedName = nameMapping[name.toLowerCase()];
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

    // Log when no mapping exists for this name
    console.log(`[Member] No mapping found for name "${name}" in NAME_MAPPING. Consider adding this member to the mapping.`);

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

// Discord message constants
const DISCORD_MAX_MESSAGE_LENGTH = 2000;

/**
 * Private helper function that handles message splitting and sending
 * @param {TextChannel} channel - The channel to send the message to
 * @param {string} content - The message content
 * @returns {Promise<Message>} The first message sent
 */
async function _sendMessageWithSplitting(channel, content) {
    if (content.length <= DISCORD_MAX_MESSAGE_LENGTH) {
        // If content fits in one message, send it as is
        return await channel.send(content);
    }
    
    // Split content into multiple messages
    let remainingContent = content;
    let firstMessage = null;
    
    while (remainingContent.length > 0) {
        let contentToSend = remainingContent.substring(0, DISCORD_MAX_MESSAGE_LENGTH);
        
        // Try to break at a newline if possible to avoid cutting words
        if (remainingContent !== content && contentToSend.length < remainingContent.length) {
            const lastNewline = contentToSend.lastIndexOf('\n');
            if (lastNewline > 0) {
                contentToSend = contentToSend.substring(0, lastNewline);
            }
        }
        
        const message = await channel.send(contentToSend);
        
        // Store the first message
        if (firstMessage === null) {
            firstMessage = message;
        }
        
        // Remove the sent content from remaining content
        remainingContent = remainingContent.substring(contentToSend.length);
    }
    
    return firstMessage;
}

/**
 * Ultimate wrapper for sending messages to channels with permission checking and error handling
 * @param {TextChannel} channel - The channel to send the message to
 * @param {string} content - The message content
 * @returns {Promise<Message|null>} The first message sent, or null if failed
 */
export async function sendChannelMessage(channel, content) {
    // Check bot permissions first
    if (!_checkBotPermissions(channel)) {
        console.error(`[sendChannelMessage] Missing Send Messages permission in #${channel.name} for guild ${channel.guild.name}`);
        return null;
    }

    // Send the message with splitting if needed
    try {
        return await _sendMessageWithSplitting(channel, content);
    } catch (error) {
        // Handle specific Discord API errors
        // These can occur even after the above check passes because of caching issues
        if (error.code === 50001) { // Missing Access
            console.error(`[sendChannelMessage] Bot does not have access to #${channel.name} in guild ${channel.guild.name}`);
            return null;
        } else if (error.code === 50013) { // Missing Permissions
            console.error(`[sendChannelMessage] Bot missing required permissions in #${channel.name} for guild ${channel.guild.name}`);
            return null;
        } else {
            console.error(`[sendChannelMessage] Failed to send message to #${channel.name} in guild ${channel.guild.name}:`, error);
            return null;
        }
    }
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
