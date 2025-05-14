import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    initializeAppointmentsCollection,
    saveAppointments
} from './modules/data/nedbAppointmentStorage.js';
import { log } from './modules/logger/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON data file path
const getJsonFilePath = () => {
    const jsonFilePath = process.env.DATA_FILE_PATH || path.resolve(__dirname, './known-appointments.json');
    return jsonFilePath;
};

/**
 * Migrate data from JSON to NeDB
 */
async function migrateToNedb() {
    try {
        log('Starting migration from JSON to NeDB...');
        
        // Initialize NeDB storage
        await initializeAppointmentsCollection();
        
        // Check if the JSON file exists
        const jsonFilePath = getJsonFilePath();
        if (!fs.existsSync(jsonFilePath)) {
            log(`JSON file not found at ${jsonFilePath}. Nothing to migrate.`);
            return;
        }
        
        // Read JSON file
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        let appointments;
        
        try {
            appointments = JSON.parse(jsonData);
        } catch (error) {
            log(`Error parsing JSON data: ${error.message}`);
            return;
        }
        
        if (!Array.isArray(appointments)) {
            log('Invalid JSON data: Not an array of appointments');
            return;
        }
        
        log(`Found ${appointments.length} appointments to migrate`);
        
        // Process and save appointments to NeDB
        await saveAppointments(appointments);
        
        // Create backup of JSON file
        const backupPath = `${jsonFilePath}.bak`;
        fs.copyFileSync(jsonFilePath, backupPath);
        log(`Created backup of original JSON file at ${backupPath}`);
        
        log('Migration completed successfully!');
    } catch (error) {
        log(`Migration error: ${error.message}`);
    }
}

// Run migration
migrateToNedb();