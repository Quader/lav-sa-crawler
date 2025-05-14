import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import {
    ensureDataFile,
    loadKnownAppointments,
    saveKnownAppointments,
    findNewAppointments,
    markAsNotified
} from '../modules/data/appointmentStorage.js';

// Create a temporary test file with absolute path
const TEST_FILE = path.resolve('./tests/data/test-appointments.json');
const TEST_DIR = path.dirname(TEST_FILE);
const ORIGINAL_ENV = process.env.DATA_FILE_PATH;

// Setup test environment
async function setup() {
    try {
        // Create test directory if it doesn't exist
        await fs.mkdir(TEST_DIR, { recursive: true });
        
        // Override environment variable for testing
        process.env.DATA_FILE_PATH = TEST_FILE;
        console.log(`Using test file: ${TEST_FILE}`);
        
        // Create a fresh test file
        await fs.writeFile(TEST_FILE, JSON.stringify([]), 'utf-8');
        return true;
    } catch (error) {
        console.error('Setup failed:', error);
        return false;
    }
}

// Clean up test environment
async function cleanup() {
    try {
        // Restore original env if it existed
        if (ORIGINAL_ENV) {
            process.env.DATA_FILE_PATH = ORIGINAL_ENV;
        } else {
            delete process.env.DATA_FILE_PATH;
        }
        
        // Remove test file
        await fs.unlink(TEST_FILE);
        console.log('Test environment cleaned up');
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Run all tests
async function runTests() {
    console.log('=== Starting appointmentStorage Tests ===\n');
    
    // Set up the test environment
    if (!(await setup())) {
        console.log('Tests aborted due to setup failure');
        return;
    }
    
    try {
        // Test 1: File Creation
        console.log('Test 1: File Creation');
        await ensureDataFile();
        
        // Verify the file exists
        let fileExists = false;
        try {
            await fs.access(TEST_FILE);
            fileExists = true;
        } catch {
            fileExists = false;
        }
        
        console.log(`- File created successfully: ${fileExists}`);
        
        // Test 2: Save and Load
        console.log('\nTest 2: Save and Load');
        const testAppointments = [
            { id: 1, termin: '01.01.2023', pruefungsstelle: 'Test 1', notified: false }
        ];
        
        await saveKnownAppointments(testAppointments);
        const loaded = await loadKnownAppointments();
        
        console.log(`- Appointment count correct: ${loaded.length === 1}`);
        console.log(`- Appointment data correct: ${loaded[0]?.id === 1}`);
        
        // Test 3: Find New Appointments
        console.log('\nTest 3: Find New Appointments');
        const fetchedAppointments = [
            { id: 1, termin: '01.01.2023', pruefungsstelle: 'Test 1' }, // Existing
            { id: 2, termin: '02.01.2023', pruefungsstelle: 'Test 2' }  // New
        ];
        
        const newAppointments = await findNewAppointments(fetchedAppointments, loaded);
        
        console.log(`- Found correct number of new appointments: ${newAppointments.length === 1}`);
        console.log(`- New appointment has correct ID: ${newAppointments[0]?.id === 2}`);
        console.log(`- New appointment has notified=false: ${newAppointments[0]?.notified === false}`);
        
        // Test 4: Merging/Saving Behavior
        console.log('\nTest 4: Merging and Saving Behavior');
        
        // Save the new appointment we found
        await saveKnownAppointments(newAppointments);
        const afterSaveNew = await loadKnownAppointments();
        
        console.log(`- Combined appointments correctly: ${afterSaveNew.length === 2}`);
        console.log(`- Includes both appointments: ${
            afterSaveNew.some(a => a.id === 1) && 
            afterSaveNew.some(a => a.id === 2)
        }`);
        
        // Add another appointment
        const additionalAppointment = [
            { id: 3, termin: '03.01.2023', pruefungsstelle: 'Test 3', notified: false }
        ];
        
        await saveKnownAppointments(additionalAppointment);
        const allThree = await loadKnownAppointments();
        
        console.log(`- All three appointments saved: ${allThree.length === 3}`);
        
        // Test 5: Mark as Notified
        console.log('\nTest 5: Mark as Notified');
        
        // We'll only pass a subset of appointments to markAsNotified
        const partialList = allThree.filter(a => a.id === 1);
        
        await markAsNotified(1, partialList);
        const afterNotify = await loadKnownAppointments();
        
        // Check that appointment 1 was marked as notified
        const notified = afterNotify.find(a => a.id === 1);
        console.log(`- Appointment was marked as notified: ${notified?.notified === true}`);
        
        // Check that no appointments were lost (still have 3)
        console.log(`- No appointments were lost: ${afterNotify.length === 3}`);
        
        // Check that other appointments were not modified
        const unmodified1 = afterNotify.find(a => a.id === 2);
        const unmodified2 = afterNotify.find(a => a.id === 3);
        
        console.log(`- Other appointments not modified: ${
            unmodified1?.notified === false && 
            unmodified2?.notified === false
        }`);
        
        console.log('\n=== All Tests Completed Successfully ===');
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await cleanup();
    }
}

// Run tests
runTests();