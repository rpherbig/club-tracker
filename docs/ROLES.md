# Discord roles reference

Use this file when **adding, renaming, or removing** any Discord role. Update every listed location in a single change so the bot stays consistent and no errors are sent to Discord.

**Note:** `findRole()` in `utils/discord-helpers.js` matches by name **case-insensitively**. Discord role names are still the source of truth; the strings below are what the code uses to look them up.

---

## Species war / team roles

These roles are tied to the Google Sheet team names and war structure. When you change a team (e.g. Pro 14 → Pro 15, add Van 22), update **every** section below.

### 1. `commands/role-commands.js`

- **ROLE_CHANNEL_MAPPING**  
  Keys = sheet team names (lowercase, e.g. `'van 22'`, `'pro 15'`, `'labor'`).  
  Values = Discord **channel** names for announcements (e.g. `'van-22'`, `'pro-15'`, `'laborers'`).
- **TEAM_ROLE_MAPPING**  
  Same keys as above. Values = **exact Discord role names** (e.g. `'Vanguard 22'`, `'Prospector 15'`, `'Laborer'`).
- **getAllTeamRoles()**  
  Uses `TEAM_ROLE_MAPPING` values and `commonCategoryRoles`: `['Vanguard', 'Prospector', 'Laborer']`. Only change if you add/remove a category.

### 2. `commands/war-draft-commands.js`

- **findRole() calls** (one per role):  
  `Laborer`, `Prospector 15`, `Prospector 17`, `Prospector 18`, `Vanguard 19`, `Vanguard 20`, `Vanguard 21`, `Vanguard 22`.
- **roles object** passed to `generateWarMessage()`:  
  Keys: `laborer`, `prospector15`, `prospector17`, `prospector18`, `vanguard19`, `vanguard20`, `vanguard21`, `vanguard22`.

### 3. `war-message-templates.js`

- **generateWarMessage(..., roles, ...)**  
  Template uses:  
  `roles.laborer`, `roles.prospector15`, `roles.prospector17`, `roles.prospector18`,  
  `roles.vanguard19`, `roles.vanguard20`, `roles.vanguard21`, `roles.vanguard22`.  
  If you add/remove a tier, add/remove the corresponding line in the strategy section.

### 4. `commands/war-commands.js`

- **findRole() calls** (lowercase):  
  `'laborer'`, `'prospector'`, `'prospector 15'`, `'prospector 17'`, `'prospector 18'` (commented),  
  `'vanguard 19'`, `'vanguard 20'`, `'vanguard 21'`, `'vanguard 22'` (commented), `'vanguard'` (commented), `'shellshock'`.
- **switch (floor)**  
  Which roles are used per floor (e.g. F15→laborer+prospector15, F22/23→shellShock). Keep in sync with actual Discord roles and war structure.

---

## Other roles

### Forgetful

- **commands/reminder-commands.js**  
  `FORGETFUL_ROLE_NAME = 'Forgetful'`; used in cron and in the role-assignment message text (`'Forgetful'` in the string).
- **events/role-events.js**  
  `findRole(reaction.message.guild, 'Forgetful')` and user-facing strings mentioning the role name.

### ShellShock

- **commands/war-commands.js**  
  `findRole(interaction.guild, 'shellshock')`; used for F22/F23 boss kill pings.

---

## Checklist when changing roles

- [ ] **role-commands.js**: Update `ROLE_CHANNEL_MAPPING` and `TEAM_ROLE_MAPPING` (sheet team name → channel, sheet team name → Discord role name).
- [ ] **war-draft-commands.js**: Update `findRole()` list and the `roles` object keys/values.
- [ ] **war-message-templates.js**: Update strategy bullets and any `roles.*` references.
- [ ] **war-commands.js**: Update `findRole()` calls and the `switch(floor)` role arrays.
- [ ] **reminder-commands.js** / **role-events.js**: Only if changing the Forgetful role name.
- [ ] **This file (docs/ROLES.md)**: Update the lists and checklist so the next change has an accurate reference.

---

## Optional: one-time consistency check

After editing, search the repo for:

- The **old** role name (in case a reference was missed).
- The **new** role name (to confirm it appears everywhere you expect).

Use case-insensitive search if the code uses mixed casing (e.g. `Laborer` vs `laborer`).
