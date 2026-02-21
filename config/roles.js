/**
 * Single source of truth for species war / team roles.
 * When adding, renaming, or removing a team role, update only this file and the
 * two behavior touchpoints: war-commands.js (floor → roles) and war-message-templates.js (strategy text).
 *
 * @see docs/ROLES.md for the full checklist.
 */

/** Team role definitions: sheet team key → channel, Discord role name, and template key for war message */
export const TEAM_ROLES = [
  { teamKey: 'van 22', channelName: 'van-22', discordRoleName: 'Vanguard 22', templateKey: 'vanguard22' },
  { teamKey: 'van 21', channelName: 'van-21', discordRoleName: 'Vanguard 21', templateKey: 'vanguard21' },
  { teamKey: 'van 20', channelName: 'van-20', discordRoleName: 'Vanguard 20', templateKey: 'vanguard20' },
  { teamKey: 'van 19', channelName: 'van-19', discordRoleName: 'Vanguard 19', templateKey: 'vanguard19' },
  { teamKey: 'pro 18', channelName: 'pro-18', discordRoleName: 'Prospector 18', templateKey: 'prospector18' },
  { teamKey: 'pro 17', channelName: 'pro-17', discordRoleName: 'Prospector 17', templateKey: 'prospector17' },
  { teamKey: 'pro 15', channelName: 'pro-15', discordRoleName: 'Prospector 15', templateKey: 'prospector15' },
  { teamKey: 'labor', channelName: 'laborers', discordRoleName: 'Laborer', templateKey: 'laborer' },
];

/** Category-only role names (no specific team; used in role sync) */
const CATEGORY_ROLE_NAMES = ['Vanguard', 'Prospector', 'Laborer'];

/** Map sheet team key → Discord channel name for role announcements */
export function getRoleChannelMapping() {
  return Object.fromEntries(TEAM_ROLES.map((r) => [r.teamKey, r.channelName]));
}

/** Map sheet team key → Discord role name */
export function getTeamRoleMapping() {
  return Object.fromEntries(TEAM_ROLES.map((r) => [r.teamKey, r.discordRoleName]));
}

/** Set of all Discord role names that are considered "team roles" (for sync add/remove) */
export function getAllTeamRoleNames() {
  const names = new Set(TEAM_ROLES.map((r) => r.discordRoleName));
  CATEGORY_ROLE_NAMES.forEach((name) => names.add(name));
  return names;
}

/** Get Discord role name by template key (e.g. 'vanguard22' → 'Vanguard 22') */
export function getDiscordRoleNameByTemplateKey(templateKey) {
  const entry = TEAM_ROLES.find((r) => r.templateKey === templateKey);
  return entry ? entry.discordRoleName : null;
}
