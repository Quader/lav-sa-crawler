import fs from 'fs/promises';
import path from 'path';
import {
    loadKnownAppointments,
    saveKnownAppointments,
    findNewAppointments
} from '../modules/data/appointmentStorage.js';

// Create isolated test file with absolute path
const TEST_FILE = path.resolve('./tests/data/diagnostic-test.json');
const TEST_DIR = path.dirname(TEST_FILE);

async function setupTest() {
    try {
        // Create test directory if it doesn't exist
        await fs.mkdir(TEST_DIR, { recursive: true });
        
        // Set environment variable with absolute path
        process.env.DATA_FILE_PATH = TEST_FILE;
        console.log(`Test file path: ${TEST_FILE}`);
        
        // Create fresh file
        await fs.writeFile(TEST_FILE, JSON.stringify([]), 'utf-8');
        console.log('Test file created with empty array');
        return true;
    } catch (error) {
        console.error('Setup failed:', error);
        return false;
    }
}

async function cleanup() {
    try {
        await fs.unlink(TEST_FILE);
        console.log('Test file cleaned up');
    } catch (error) {
        console.error('Cleanup error (can ignore):', error.message);
    }
}

async function readFileDirectly() {
    try {
        const data = await fs.readFile(TEST_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading test file:', error.message);
        return null;
    }
}

async function runDiagnostic() {
    console.log('=== Starting Diagnostic ===');
    
    if (!(await setupTest())) {
        console.log('Diagnostic aborted due to setup failure');
        return;
    }
    
    try {
        // Test 1: Basic save and load
        console.log('\n--- Test 1: Basic Save and Load ---');
        const testAppointment = [{ id: 1, termin: '01.01.2023', pruefungsstelle: 'Test 1', notified: false }];
        
        console.log('Saving test appointment data');
        await saveKnownAppointments(testAppointment);
        
        console.log('Reading file directly:');
        const fileContents = await readFileDirectly();
        console.log(JSON.stringify(fileContents, null, 2));
        
        console.log('Loading appointments via function:');
        const loaded = await loadKnownAppointments();
        console.log(JSON.stringify(loaded, null, 2));
        
        console.log(`Test result - Data loaded correctly: ${loaded.length === 1 && loaded[0].id === 1}`);
        
        // Test 2: Finding new appointments
        console.log('\n--- Test 2: Finding New Appointments ---');
        const fetchedAppointments = [
            { id: 1, termin: '01.01.2023', pruefungsstelle: 'Test 1' }, // Existing
            { id: 2, termin: '02.01.2023', pruefungsstelle: 'Test 2' }  // New
        ];
        
        console.log('Fetched appointments:', JSON.stringify(fetchedAppointments, null, 2));
        console.log('Known appointments:', JSON.stringify(loaded, null, 2));
        
        const newAppointments = await findNewAppointments(fetchedAppointments, loaded);
        console.log('New appointments found:', JSON.stringify(newAppointments, null, 2));
        console.log(`Test result - New appointment found correctly: ${newAppointments.length === 1 && newAppointments[0].id === 2}`);
        
    } catch (error) {
        console.error('Diagnostic error:', error);
    } finally {
        await cleanup();
        console.log('\n=== Diagnostic Complete ===');
    }
}

runDiagnostic();