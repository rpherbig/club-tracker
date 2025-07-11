import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// Load minion relics data
function loadMinionRelics() {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const dataPath = path.join(currentDir, '..', 'data', 'minion_relics.json');
    console.log('Loading data from:', dataPath);
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const relics = JSON.parse(rawData);
    console.log(`Loaded ${relics.length} relics`);
    return relics;
}

// Transform data for Google Sheets
function transformData(relics) {
    console.log('Transforming data...');
    const transformed = relics.map(relic => [
        relic.name,                           // Name
        relic.affct.dominant,                 // Dominant AFFCT stat
        relic.rank,                           // Rank
        relic.minionType                      // Minion type
    ]);
    console.log(`Transformed ${transformed.length} relics`);
    console.log('Sample data:', transformed[0]);
    return transformed;
}

// Google Sheets authentication using the same method as role-commands.js
async function getAuth() {
    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth;
    } catch (error) {
        console.error('Error setting up Google Auth:', error.message);
        console.log('Please ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.');
        process.exit(1);
    }
}

// Create or update Google Sheet
async function updateSheet(auth, data) {
    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = '16V_6mieAus02b3aiNx4cz5no92d45Qfce-q64AuPY2c';
    
    // Headers
    const headers = ['Name', 'Dominant AFFCT stat', 'Rank', 'Minion type'];
    
    try {
        // Clear existing data and add headers
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Purple!A:D',
        });
        
        // Add headers
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Purple!A1:D1',
            valueInputOption: 'RAW',
            resource: {
                values: [headers]
            }
        });
        
        // Add data
        if (data.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Purple!A2:D${data.length + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: data
                }
            });
        }
        
        console.log(`Successfully updated Google Sheet with ${data.length} relics`);
        
    } catch (error) {
        console.error('Error updating sheet:', error.message);
        if (error.code === 403) {
            console.error('Ensure the Google Sheets API is enabled for your project and the service account has permissions to edit the sheet.');
        }
        if (error.message.includes('file not found')) {
            console.error('Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and the JSON key file exists.');
        }
        throw error;
    }
}

// Main function
async function main() {
    try {
        console.log('Loading minion relics data...');
        const relics = loadMinionRelics();
        
        console.log('Transforming data...');
        const sheetData = transformData(relics);
        
        console.log('Authenticating with Google Sheets...');
        const auth = await getAuth();
        
        console.log('Updating Google Sheet...');
        await updateSheet(auth, sheetData);
        
        console.log('Done!');
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script
console.log('Script starting...');
main();

export {
    loadMinionRelics,
    transformData,
    getAuth,
    updateSheet
}; 