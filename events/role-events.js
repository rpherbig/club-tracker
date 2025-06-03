import { findRole } from '../utils/discord-helpers.js';

/**
 * Handles the message reaction event for assigning the Forgetful role
 * @param {MessageReaction} reaction - The reaction that was added
 * @param {User} user - The user who added the reaction
 * @param {Map} forgetfulMessageStore - Map of guild IDs to message IDs being tracked
 */
export async function handleForgetfulReaction(reaction, user, forgetfulMessageStore) {
    // Ignore reactions from bots
    if (user.bot) return;

    if (!reaction.message.guild) return;
    const guildId = reaction.message.guildId;
    const forgetfulMessageIdList = forgetfulMessageStore.get(guildId);

    if (!forgetfulMessageIdList || !forgetfulMessageIdList.includes(reaction.message.id)) return;

    console.log(`Reaction detected on a tracked forgetful message (${reaction.message.id}) in guild ${guildId} by user ${user.tag}`);

    try {
        // Fetch the member who reacted
        const member = await reaction.message.guild.members.fetch(user.id);
        if (!member) {
            console.log(`Could not fetch member for user ${user.tag} (${user.id})`);
            return;
        }

        // Find the 'Forgetful' role
        const role = findRole(reaction.message.guild, 'Forgetful');
        if (!role) {
            console.error(`Could not find the role named 'Forgetful' in guild ${guildId}.`);
            return;
        }

        // Assign the role if the member doesn't have it already
        if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role);
            console.log(`Assigned role '${role.name}' to member ${member.user.tag} in guild ${guildId}`);
            // Optional: Send DM confirmation
            try {
                await member.send(`You have been assigned the '${role.name}' role in the server: ${reaction.message.guild.name}.`);
            } catch (dmError) {
                console.log(`Could not send DM to ${member.user.tag}. They might have DMs disabled.`);
            }
        } else {
            console.log(`Member ${member.user.tag} already has the role '${role.name}'.`);
        }

    } catch (error) {
        console.error(`Error processing reaction for role assignment in guild ${guildId}:`, error);
        if (error.code === 50013) { // DiscordAPIError: Missing Permissions
            console.error(`Missing 'Manage Roles' permission in guild ${guildId}?`);
        }
    }
} 