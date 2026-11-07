# Discord roles reference

Use this file when **adding, renaming, or removing** any Discord role so the bot stays consistent and no errors are sent to Discord.

**Note:** `findRole()` in `utils/discord-helpers.js` matches by name **case-insensitively**.

---

## Species war / team roles (centralized)

**Single source of truth:** `config/roles.js`

The array `TEAM_ROLES` defines each team role with:

- `teamKey` – sheet team name (`'van 26'`, `'van 27'`, `'van 28'`, `'sapper'`, `'labor'`)
- `channelName` – Discord channel for announcements (`'van-26'`, `'van-27'`, `'van-28'`, `'sapper'`, `'laborer'`)
- `discordRoleName` – Discord role name, matched case-insensitively (e.g. `'Vanguard 28'`, `'Sapper'`, `'Laborer'`)
- `templateKey` – key used in war message template (e.g. `'vanguard28'`, `'sapper'`, `'laborer'`)
- `killPingMinFloor` – lowest boss floor for `/kill` cumulative pings (see `getKillPingRoleSpecs`); also drives boss-strategy tier bullets in #war-orders for floors ≥ the threshold passed to `buildBossStrategyTierLines` from `war-message-templates.js`

When you **add, rename, or remove** a team role:

1. **Edit `config/roles.js`** – update the `TEAM_ROLES` array. That alone updates:
   - `commands/role-commands.js` (role sync + announcements)
   - `commands/war-orders-commands.js` (war orders message role mentions)
   - `/kill` pings and **boss strategy tier lines** via `killPingMinFloor` and `buildBossStrategyTierLines(roles, minFloor)` (threshold lives next to the opener in `war-message-templates.js`)
2. **Edit `war-message-templates.js`** – update the general war guidance if that copy changes; Vanguard target-floor bullets are generated from config.
3. **Edit `commands/war-commands.js`** – only if `/kill` behavior outside `getKillPingRoleSpecs` changes.

Category roles (Vanguard, Sapper, Laborer) are in `config/roles.js` as `CATEGORY_ROLE_NAMES`. Sapper and Laborer are also their own team roles; role sync assigns each only once.

Boss 26 is the first boss. Sapper and Laborer prioritize the highest boss they can safely hit. Vanguard teams hold tokens for their target boss (26, 27, or 28), prioritize that boss, then hit the highest boss they can safely hit when out of assigned targets. Their charge buff is optional if casualties are too high.

War orders also resolve the Vanguard and ShellShock roles for the section mentions. The general template includes barrier deployment calls, defensive Biozilla and barrier/rocket guidance, and day-one drilling: reach boss 26, then drill columns in areas 19, 20, 21, and 25 until there are 5 tier VII mines and 2 tier IX mines.

`/kill` pings Sapper and Laborer on F1–28, adding each Vanguard tier at its target floor. Above F28, it pings ShellShock.

---

## Other roles (not in config)

### Forgetful

- **commands/reminder-commands.js**  
  `FORGETFUL_ROLE_NAME = 'Forgetful'`; used in cron and in the role-assignment message text.
- **events/role-events.js**  
  `findRole(reaction.message.guild, 'Forgetful')` and user-facing strings.

### ShellShock

- **commands/war-commands.js**  
  Used for `/kill` when `floor` is above `max(killPingMinFloor)` over `TEAM_ROLES`, or when no team roles match (see `getKillPingRoleSpecs` in `config/roles.js`). Resolved by literal name `'ShellShock'` (not in `TEAM_ROLES`); message uses the role mention `<@&roleId>`.

---

## Checklist when changing team roles

- [ ] **config/roles.js**: Add/rename/remove the entry in `TEAM_ROLES` (and `templateKey` must match usage in templates). Set `killPingMinFloor` for `/kill` (max over all rows sets the top dedicated floor; above that uses ShellShock).
- [ ] **war-message-templates.js**: If changing the general war guidance or the starting floor for generated Vanguard tiers.
- [ ] **This file (docs/ROLES.md)**: Adjust if you add a new kind of role or change structure.

---

## Checklist when changing other roles (Forgetful, ShellShock)

- [ ] **reminder-commands.js** / **events/role-events.js**: Only if changing the Forgetful role name.
- [ ] **war-commands.js**: Only if changing how ShellShock is resolved or logic outside `getKillPingRoleSpecs`.

---

## Optional: one-time consistency check

After editing, search the repo for the **old** role name (in case a reference was missed) and the **new** role name (to confirm it appears where expected). Use case-insensitive search if needed.
