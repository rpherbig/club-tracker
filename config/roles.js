/**
 * Single source of truth for species war / team roles.
 * When adding, renaming, or removing a team role, update only this file and the
 * two behavior touchpoints: `commands/war-commands.js` (/kill) and `war-message-templates.js` (war orders boss strategy opener + autogen tier lines).
 *
 * @see docs/ROLES.md for the full checklist.
 */

/** Team role definitions: sheet team key → channel, Discord role name, and template key for war message */
export const TEAM_ROLES = [
  { teamKey: 'van 23', channelName: 'van-23', discordRoleName: 'Vanguard 23', templateKey: 'vanguard23', killPingMinFloor: 23 },
  { teamKey: 'van 22', channelName: 'van-22', discordRoleName: 'Vanguard 22', templateKey: 'vanguard22', killPingMinFloor: 22 },
  { teamKey: 'van 21', channelName: 'van-21', discordRoleName: 'Vanguard 21', templateKey: 'vanguard21', killPingMinFloor: 21 },
  { teamKey: 'van 20', channelName: 'van-20', discordRoleName: 'Vanguard 20', templateKey: 'vanguard20', killPingMinFloor: 20 },
  { teamKey: 'pro 19', channelName: 'pro-19', discordRoleName: 'Prospector 19', templateKey: 'prospector19', killPingMinFloor: 19 },
  { teamKey: 'pro 18', channelName: 'pro-18', discordRoleName: 'Prospector 18', templateKey: 'prospector18', killPingMinFloor: 18 },
  { teamKey: 'pro 15', channelName: 'pro-15', discordRoleName: 'Prospector 15', templateKey: 'prospector15', killPingMinFloor: 1 },
  { teamKey: 'labor', channelName: 'laborers', discordRoleName: 'Laborer', templateKey: 'laborer', killPingMinFloor: 1 },
];

/**
 * Build `* F{n}+: @roles ...` lines for the war orders boss strategy from `killPingMinFloor`.
 * @param {Record<string, { toString(): string } | null | undefined>} roles templateKey → Discord Role (or null)
 * @param {number} minFloor include only `TEAM_ROLES` rows with `killPingMinFloor >= minFloor` (caller chooses, e.g. next to bespoke opener in `war-message-templates.js`)
 * @returns {string} newline-separated bullets (no trailing newline)
 */
export function buildBossStrategyTierLines(roles, minFloor) {
  const byFloor = new Map();
  for (const row of TEAM_ROLES) {
    if (row.killPingMinFloor < minFloor) continue;
    if (!byFloor.has(row.killPingMinFloor)) byFloor.set(row.killPingMinFloor, []);
    byFloor.get(row.killPingMinFloor).push(row.templateKey);
  }
  const floors = [...byFloor.keys()].sort((a, b) => a - b);
  const lines = [];
  for (const f of floors) {
    const keys = [...byFloor.get(f)].sort();
    const mentions = keys.map((k) => roles[k]).filter(Boolean).join(' ');
    if (!mentions) continue;
    lines.push(`* F${f}+: ${mentions} :arrow_right: Hold tokens until F${f} is located. Full hit F${f}+ as casualties allow.`);
  }
  return lines.join('\n');
}

function maxKillPingMinFloor() {
  if (TEAM_ROLES.length === 0) return 0;
  return Math.max(...TEAM_ROLES.map((r) => r.killPingMinFloor));
}

/**
 * Which roles to @ for `/kill` on a boss floor.
 * - Rows with `killPingMinFloor <= floor` are included (sorted). E.g. F≤17 yields only labor + pro-15 because other tiers have higher mins.
 * - If `floor` is above `max(killPingMinFloor)` over `TEAM_ROLES`, ShellShock only (extend the ladder by adding a row with a higher `killPingMinFloor`).
 * - If no rows match (misconfiguration): ShellShock only.
 *
 * @param {number} floor
 * @returns {string[]} template keys for `getDiscordRoleNameByTemplateKey`, or `'ShellShock'` literal for that role
 */
export function getKillPingRoleSpecs(floor) {
  const dedicatedCap = maxKillPingMinFloor();
  if (dedicatedCap > 0 && floor > dedicatedCap) {
    return ['ShellShock'];
  }
  const keys = TEAM_ROLES.filter((r) => floor >= r.killPingMinFloor)
    .sort((a, b) => a.killPingMinFloor - b.killPingMinFloor || a.templateKey.localeCompare(b.templateKey))
    .map((r) => r.templateKey);
  return keys.length > 0 ? keys : ['ShellShock'];
}

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
