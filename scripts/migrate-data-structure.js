#!/usr/bin/env node

/**
 * Migration script to convert data.json from nickname-based keys to user ID-based keys
 * 
 * This script:
 * 1. Creates a backup of the original data.json
 * 2. Uses NAME_MAPPING from role-commands.js to convert nicknames to user IDs
 * 3. Preserves all existing resource data
 * 4. Removes nickname-based keys in favor of user ID-based keys
 * 
 * Usage: node scripts/migrate-data-structure.js
 */

import fs from 'fs/promises';

// Mapping from names in the old data.json file to Discord User IDs
const NAME_TO_USER_ID_MAPPING = {
  'amarin : the afk': '158622934271918081',
  'confusdscrtsquirrel': '505984275678625812',
  'bigeats: champ champ': '480219464194064384', 
  'itisi': '558481091191767041', 
  '48 dragos but a drill aint one': '613699750662766623', 
  'melon king': '197115561359048705', 
  'jwfw5931': '663562170507984928', 
  'mike: i’m not dead yet': '757384703501271200', 
  'grantg': { userId: 'external_grantg', external: true },
  'venich: the sane ™': '173716912881008640', 
  'hingus': '230431329072840706', 
  'goldinguscargingus': '397019979993841667', 
  'jingus': '106115113823502336', 
  'robert "bobingus" snailson': '233793523269238785', 
  'byproxy': '107285508710772736',
  'sydlexic': '305789864631336972',
  'slooger': '299379678752538624',
  'pepsihater': '222830269911138305',
  'snailybob': '233793523269238785',
  'loulu': '248963429451300867',
  'amarin': '158622934271918081',
  'coop': '1141073493950222497',
  'itisl': '558481091191767041',
  'imitationsnail': '268480420021010442',
  'crackajack': '379829462767894540',
  'bigeats': '480219464194064384',
  'deathly': '311257784853463051',
  'nyrlatoep': '691680899070296085',
  'snoooowman': '97785134845009920',
  'knobbler': '160333165028835328',
  'duckandcower': '416804880896884737',
  'mike': '757384703501271200',
  'chumpus': '1246471131112673321',
  'goldcargo': '397019979993841667',
  'talas300': '335557154398273537',
  'garythesnale': '809874369157005313',
  'slugtato': '296441628904914944',
  'brownroach': '379837589173174272',
  'chutemi': '297315906906882058',
  'sheltim': '85187136659128320',
  'worm': '696100595198722058',
  'venich': '173716912881008640',
  'leecchh': '482008530572804116',
  'vonlee': '743629973075656712',
  'iceefox': '495999786026008582',
  'sneakysneaker': '270066551233839104',
  'traveler42069': '1142241123331473550',
  'hines': '230431329072840706',
  'ceg1729': '490379439562162211',
  'traveler956': '915663499810717716',
  'ninjaxom': '389819274975510528',
  'ekstentythre': '346826665474916362',
  'ekstwntthre': '346826665474916362',
  'confusdsquirrl': '505984275678625812',
  'konx': '230519955240648704',
  'jwfw': '663562170507984928',
  'mrslime': '411835173584502785',
  'melonking': '197115561359048705',
  'gastropod': '739845007409807572',
  'satimica': '316371714110128129',
  'sayam': '433759629068075009',
  'vendus8': '423128903888928778',
  '48drago': '613699750662766623',
  'bingus': '292763135452905475',
  'edge': '544254868408500244',
  'dingus1990': '263889079517708288',
  'fleep': '236615172393926656',
  'bishop501': '250239865210404866',
  'magnusdark': '155367571372244993',
  'snooowman': '97785134845009920',
  'coming4you': '1158470833140940800',
  'ekstwntythre': '346826665474916362',
  'dingus': '263889079517708288',
  'jinbo': '106115113823502336',
};

const DATA_FILE = 'data.json';
const BACKUP_FILE = 'data.json.backup';

async function createBackup() {
  try {
    await fs.copyFile(DATA_FILE, BACKUP_FILE);
    console.log(`✅ Created backup: ${BACKUP_FILE}`);
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    throw error;
  }
}

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load data: ${error.message}`);
    throw error;
  }
}

async function saveData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Saved migrated data to ${DATA_FILE}`);
  } catch (error) {
    console.error(`❌ Failed to save data: ${error.message}`);
    throw error;
  }
}

function detectMissingKeys(serverData) {
  const missingKeys = [];
  
  for (const [nickname, userData] of Object.entries(serverData)) {
    // Simple exact lookup - no variations
    const mapping = NAME_TO_USER_ID_MAPPING[nickname.toLowerCase()];
    
    if (!mapping) {
      missingKeys.push(nickname);
    }
  }
  
  return missingKeys;
}

async function detectAllMissingKeys() {
  console.log('🔍 Detecting all missing keys in data.json...\n');
  
  try {
    // Load current data
    console.log('📖 Loading current data...');
    const currentData = await loadData();
    
    const allMissingKeys = [];
    
    for (const [serverId, serverData] of Object.entries(currentData)) {
      // Skip the old guild we don't want to migrate
      if (serverId === '404714498641887232') {
        console.log(`\n⏭️  Skipping old guild: ${serverId} (ignoring old data)`);
        continue;
      }
      
      console.log(`\n🔄 Checking server: ${serverId}`);
      const missingKeys = detectMissingKeys(serverData);
      
      if (missingKeys.length > 0) {
        console.log(`❌ Missing keys in server ${serverId}:`);
        missingKeys.forEach(key => console.log(`   - "${key}"`));
        allMissingKeys.push(...missingKeys.map(key => ({ serverId, key })));
      } else {
        console.log(`✅ All keys mapped for server ${serverId}`);
      }
    }
    
    if (allMissingKeys.length > 0) {
      console.log(`\n📋 SUMMARY: Found ${allMissingKeys.length} missing keys:`);
      console.log('=====================================');
      allMissingKeys.forEach(({ serverId, key }) => {
        console.log(`  '${key}': '', // TODO: Add Discord User ID for server ${serverId}`);
      });
      console.log('\n🔧 Add these entries to NAME_TO_USER_ID_MAPPING and run again.');
    } else {
      console.log('\n✅ All keys are mapped! Ready to migrate.');
    }
    
  } catch (error) {
    console.error(`\n❌ Detection failed: ${error.message}`);
    process.exit(1);
  }
}

async function migrate() {
  console.log('🚀 Starting data structure migration...\n');
  
  try {
    // Create backup
    await createBackup();
    
    // Load current data
    console.log('📖 Loading current data...');
    const currentData = await loadData();
    
    // Migrate each server
    const migratedData = {};
    
    for (const [serverId, serverData] of Object.entries(currentData)) {
      console.log(`\n🔄 Migrating server: ${serverId}`);
      const { migratedData: serverMigratedData } = migrateServerData(serverData);
      migratedData[serverId] = serverMigratedData;
    }
    
    // Save migrated data
    console.log('\n💾 Saving migrated data...');
    await saveData(migratedData);
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated data structure`);
    console.log(`📁 Backup created: ${BACKUP_FILE}`);
    
    console.log('\n🔧 Next steps:');
    console.log('1. Test the bot with the new data structure');
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.log('\n🔄 To restore from backup:');
    console.log(`   cp ${BACKUP_FILE} ${DATA_FILE}`);
    process.exit(1);
  }
}

function migrateServerData(serverData) {
  const migratedData = {};
  
  for (const [nickname, userData] of Object.entries(serverData)) {
    // Simple exact lookup - no variations
    const mapping = NAME_TO_USER_ID_MAPPING[nickname.toLowerCase()];
    
    if (!mapping) {
      console.error(`❌ ERROR: No mapping found for display name: "${nickname}"`);
      console.error(`Please add this user to NAME_TO_USER_ID_MAPPING in the migration script.`);
      process.exit(1);
    }
    
    // Handle both string user IDs and object mappings
    const userId = typeof mapping === 'string' ? mapping : mapping.userId;
    const isExternal = typeof mapping === 'object' ? mapping.external : false;
    
    // Add external flag to user data
    const migratedUserData = { ...userData };
    if (isExternal) {
      migratedUserData.external = true;
    }
    
    migratedData[userId] = migratedUserData;
    console.log(`✅ Migrated: ${nickname} → ${userId}${isExternal ? ' (external)' : ''}`);
  }
  
  return { migratedData, unmappedUsers: [] };
}

// Run migration
migrate();
