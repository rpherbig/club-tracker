import { buildBossStrategyTierLines } from './config/roles.js';
import { WAR_COMMANDS_CHANNEL_NAME, WAR_ORDERS_CHANNEL_NAME } from './config/channels.js';
import { formatChannelTag } from './utils/discord-helpers.js';

// MANTIS
export const mantis = `# Mantis fighter cultivation guide

## Booklet priority
1. Get all three "Deal 100% Strength DMG" attacks, in any order:
    - Resting Dragon Swordsmanship (sword)
    - Taichi Boxing (fist)
    - Bee Sting (gadget)
    - ANY OTHER ACTIVE ATTACK IS A WASTE OF A BOOK! please stick to the above three
1. Ultimate Guide of Yang Aura – HP regen 🩸
1. Quick Swap – Damage reduction 🩹
1. Tengen Mental Cultivation - Bonus ATK per round 💪
1. Zen of Suffering - Bonus Def per round 🛡️
1. Theft of Power – Damage boost 🔥
1. Power for a Price – Ignores defense ⚔️
1. Double Strength Aura - ATK 3%
1. Creator Aura - HARD 1%

## Other tips
✔️ Always buy the 10 W-Tad daily – you'll get 50+ back in return.
✔️ You can cheaply reroll the three options until you get high priority skills
✔️ If your power is lower than the strongest Shellshock member in the node, place inside a blue node instead to maximize your % win rate.  % of fights won = more points

## Change skill order after completing the daily Shadow Fight!
➤ Optimal order is different each war!  keep an eye out for instructions once we know what the order will be this war.
➤ 🚨 ***new feature!*** 🚨 Use \`/mantis\` in ${formatChannelTag(WAR_COMMANDS_CHANNEL_NAME)} and give it the move order you were auto-adjusted to fight the Shadow (e.g. \`/mantis 321\`). The bot will post the counter move order to ${formatChannelTag(WAR_ORDERS_CHANNEL_NAME)}.`;

// BEETLE
export const beetle = `## Chronicle Requirements
✔️ Attack all bosses with Lu Bu equipped (except the final boss!)
✔️ Final boss: Use Cosmos or Mirror, depending on Rush – Lu Bu NOT required.
✔️ Equip attack gear and form.
➤ No need to use W-Tads to change gear level.
➤ Even if you're invested in farm gear, just equip your attack gear as-is.

Optional Quests:
💡 Earthworm support is highly recommended – you'll earn worm chests + extra damage.
⚔️ Haven't pushed in the main game for a while?
➤ Dung Week is a great time to use W-Tads to swap from farming mode to push mode!`;

// GOLDFISH
export const goldfish = `## Chronicle Requirements
✔️ Use BOTH attacks daily. No exceptions.
✔️ Set up troops ASAP – both offensive and defensive teams.
✔️ Attack ONLY 1000/1000 and 500/1000 targets.
❌ DO NOT attack 100/1000 unless it is the ONLY option (this should be rare!)
✔️ Prioritize attacks for the highest merits where you have a win condition. (The fish-shaped flags indicate merit values!)`;

// CLAM
export const clam = `## Chronicle Requirements
✔️ Fight the Shadow and place your Minions in the tower ASAP daily.
✔️ Attack the highest Shadow you can defeat. (Minions heal for free overnight!)
✔️ Attack shadow FIRST and build tower afterwards, otherwise you might not have all your minions available for the fight
✔️ FYI: Building speed is not based on tier of minion. You only need to send as many as possible (the cap is your leadership). The auto feature works just fine.`;

// HAMSTER
export const hamster = `# Chronicle - Day 1 🐹
🚨 NO BIDDING & NO SPENDING DICE! 🚨
✔️ Start but DO NOT complete the tutorial.
❌ DO NOT spend your 3 dice.
❌ DO NOT spend any gold.
🟢 DO open Chronicle and CLAIM your 8 dice!
🎯 Your goal: 0/11 DICE used! 🎯

# Chronicle - Day 2 🐹

✔️ Complete the tutorial – use 3 dice & 1 gold bar, no extra gold spending yet.
✔️ Claim 8 dice but DO NOT spend them yet.

Chronicle Bidding: React upon placement.

# Chronicle - Day 3, 4, 5 🐹
✔️ Dice: Claim & use all dice.
✔️ Gold Bars: SPEND 0 – hold extra bars until further notice.

Chronicle Bidding: React upon placement.

# Chronicle - Final Day 🐹
✔️ Red Dice Rug Pull – These are for you, so collect your personal rewards!
✔️ Hammy Shop: Amarin recommends green robots – you only need 777 partner.

⚠️ LAST DAY to use ALL war resources!! ⚠️
🎲 Good luck with your red dice! 🍀`;

// WAR MESSAGE GENERATOR - Returns general war info and species-specific content separately (sent as two messages in #war-orders)
export const generateWarMessage = (speciesWarInfo, roles, warStartDate) => {
  const info = speciesWarInfo.toLowerCase();

  let speciesContent;
  if (info.includes('mantis')) {
    speciesContent = mantis;
  } else if (info.includes('dung')) {
    speciesContent = beetle;
  } else if (info.includes('goldfish')) {
    speciesContent = goldfish;
  } else if (info.includes('clam')) {
    speciesContent = clam;
  } else if (info.includes('ham')) {
    speciesContent = hamster;
  } else {
    return null;
  }

  const formattedDate = warStartDate.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });

  /** Sapper and Laborer have no target floor; generate the dedicated Vanguard tiers. */
  const bossStrategyTierLineMinFloor = 26;
  const bossStrategyTiers = buildBossStrategyTierLines(roles, bossStrategyTierLineMinFloor);

  const generalInfo = `# ${speciesWarInfo} - ${formattedDate}

**Boss 26 is our first boss.**

## ${roles.vanguard ?? 'Vanguard'} — Boss priorities
${bossStrategyTiers}
* Charge buff is optional if it causes too many casualties.

## ${roles.sapper ?? 'Sapper'} ${roles.laborer ?? 'Laborer'} — Boss priorities
* Hit the **highest boss you can safely hit**, with no assigned boss.
* Watch for calls to deploy several mobile armor barriers so more members can hit F26 and F27.

## ${roles.shellshock ?? 'ShellShock'} — All members
* Everyone can (and many should) use defensive Biozilla to help complete full attacks.
* Use mobile defense barriers or rockets at your discretion.
* **Mines are harder to uncover:** the relevant bosses will not die early enough to reveal them.
* **Day-one drilling:** Reach boss 26 first, then **drill columns in areas 19, 20, 21, and 25** until we have **5 tier VII mines and 2 tier IX mines**.

📌 Spreadsheet for tracking (updated every Friday):
🔗 [Team Front-End Spreadsheet](https://docs.google.com/spreadsheets/d/1JQ3Atkgv1APC6kXawTIR2HjeWVCvBYepQqtZnygWSUU/edit?gid=903491486#gid=903491486) (Pinned in this channel!)`;

  return { generalInfo, speciesContent };
};
