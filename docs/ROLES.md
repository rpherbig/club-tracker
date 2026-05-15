# Discord roles reference

Use this file when **adding, renaming, or removing** any Discord role so the bot stays consistent and no errors are sent to Discord.

**Note:** `findRole()` in `utils/discord-helpers.js` matches by name **case-insensitively**.

---

## Species war / team roles (centralized)

**Single source of truth:** `config/roles.js`

The array `TEAM_ROLES` defines each team role with:

- `teamKey` – sheet team name (e.g. `'van 22'`, `'pro 15'`, `'labor'`)
- `channelName` – Discord channel for announcements (e.g. `'van-22'`, `'laborers'`)
- `discordRoleName` – exact Discord role name (e.g. `'Vanguard 22'`, `'Laborer'`)
- `templateKey` – key used in war message template (e.g. `'vanguard22'`, `'laborer'`)
- `killPingMinFloor` – lowest boss floor for `/kill` cumulative pings (see `getKillPingRoleSpecs`); also drives boss-strategy tier bullets in #war-orders for floors ≥ the threshold passed to `buildBossStrategyTierLines` from `war-message-templates.js`

When you **add, rename, or remove** a team role:

1. **Edit `config/roles.js`** – update the `TEAM_ROLES` array. That alone updates:
   - `commands/role-commands.js` (role sync + announcements)
   - `commands/war-orders-commands.js` (war orders message role mentions)
   - `/kill` pings and **boss strategy tier lines** via `killPingMinFloor` and `buildBossStrategyTierLines(roles, minFloor)` (threshold lives next to the opener in `war-message-templates.js`)
2. **Edit `war-message-templates.js`** – only the bespoke **F5, F15+** opener line if that copy changes; F18+ bullets are generated from config.
3. **Edit `commands/war-commands.js`** – only if `/kill` behavior outside `getKillPingRoleSpecs` changes.

Category-only roles (Vanguard, Prospector, Laborer) are still in `config/roles.js` as `CATEGORY_ROLE_NAMES` and are used only for role sync.

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
- [ ] **war-message-templates.js**: Only if changing the F5/F15+ boss opener text.
- [ ] **This file (docs/ROLES.md)**: Adjust if you add a new kind of role or change structure.

---

## Checklist when changing other roles (Forgetful, ShellShock)

- [ ] **reminder-commands.js** / **events/role-events.js**: Only if changing the Forgetful role name.
- [ ] **war-commands.js**: Only if changing how ShellShock is resolved or logic outside `getKillPingRoleSpecs`.

---

## Optional: one-time consistency check

After editing, search the repo for the **old** role name (in case a reference was missed) and the **new** role name (to confirm it appears where expected). Use case-insensitive search if needed.
