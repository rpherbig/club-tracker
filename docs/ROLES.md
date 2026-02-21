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

When you **add, rename, or remove** a team role:

1. **Edit `config/roles.js`** – update the `TEAM_ROLES` array. That alone updates:
   - `commands/role-commands.js` (role sync + announcements)
   - `commands/war-draft-commands.js` (draft message role mentions)
2. **Edit `war-message-templates.js`** – add or remove the strategy line for the tier (e.g. `* F23+: ${roles.vanguard23} ...`). The `roles` object keys must match `templateKey` in config.
3. **Edit `commands/war-commands.js`** – if the new tier affects which roles are pinged for a floor, update the `switch(floor)` `roleSpecs` (use `templateKey` for team roles, or literal `'Prospector'` / `'ShellShock'` for category/ShellShock).

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
  Used for F22/F23 kill pings. Role is resolved by literal name `'ShellShock'` in the floor `roleSpecs` (not in `TEAM_ROLES`).

---

## Checklist when changing team roles

- [ ] **config/roles.js**: Add/rename/remove the entry in `TEAM_ROLES` (and `templateKey` must match usage in templates).
- [ ] **war-message-templates.js**: Add or remove the strategy line and any `roles.<templateKey>` for that tier.
- [ ] **war-commands.js**: Update `switch(floor)` `roleSpecs` if the new/removed tier changes which roles are pinged for a floor.
- [ ] **This file (docs/ROLES.md)**: Adjust if you add a new kind of role or change structure.

---

## Checklist when changing other roles (Forgetful, ShellShock)

- [ ] **reminder-commands.js** / **events/role-events.js**: Only if changing the Forgetful role name.
- [ ] **war-commands.js**: Only if changing how ShellShock is resolved (e.g. literal name in `roleSpecs` for F22/23).

---

## Optional: one-time consistency check

After editing, search the repo for the **old** role name (in case a reference was missed) and the **new** role name (to confirm it appears where expected). Use case-insensitive search if needed.
