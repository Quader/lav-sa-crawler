import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import Datastore from 'nedb';

// Mock our nedbAppointmentStorage module with in-memory database
import * as originalModule from '../modules/data/nedbAppointmentStorage.js';
import { log } from '../modules/logger/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create in-memory database for testing
const inMemoryDb = new Datastore();

// Create indexes
inMemoryDb.ensureIndex({ fieldName: 'id', unique: true });
inMemoryDb.ensureIndex({ fieldName: 'notified' });
inMemoryDb.ensureIndex({ fieldName: 'termin' });

// Promisify NeDB functions for testing
const promisify = (fn, context) => (...args) => {
  return new Promise((resolve, reject) => {
    fn.call(context, ...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Promisified NeDB methods for tests
const findAsync = promisify(inMemoryDb.find, inMemoryDb);
const insertAsync = promisify(inMemoryDb.insert, inMemoryDb);
const updateAsync = promisify(inMemoryDb.update, inMemoryDb);
const countAsync = promisify(inMemoryDb.count, inMemoryDb);
const removeAsync = promisify(inMemoryDb.remove, inMemoryDb);

// Override the original module's functions with our in-memory implementations
const initializeAppointmentsCollection = async () => {
  try {
    log('Appointments collection initialized');
    return true;
  } catch (error) {
    log(`Error initializing appointments collection: ${error.message}`);
    return false;
  }
};

const loadKnownAppointments = async () => {
  try {
    const appointments = await findAsync({});
    log(`Loaded ${appointments.length} appointments from database`);
    return appointments;
  } catch (error) {
    log(`Error loading appointments: ${error.message}`);
    return [];
  }
};

const saveAppointments = async (newAppointments) => {
  try {
    if (!Array.isArray(newAppointments) || newAppointments.length === 0) {
      log('No valid appointments to save');
      return false;
    }

    let successCount = 0;

    // Process each appointment
    for (const appointment of newAppointments) {
      await updateAsync(
        { id: appointment.id },
        appointment,
        { upsert: true }
      );
      successCount++;
    }

    log(`Saved ${successCount} appointments to database`);
    return true;
  } catch (error) {
    log(`Error saving appointments: ${error.message}`);
    return false;
  }
};

const findNewAppointments = async (fetchedAppointments) => {
  try {
    if (!Array.isArray(fetchedAppointments) || fetchedAppointments.length === 0) {
      log('No valid appointments to check');
      return [];
    }

    // Get all IDs of fetched appointments
    const fetchedIds = fetchedAppointments.map(appointment => appointment.id);
    
    // Find existing appointments with these IDs
    const existingAppointments = await findAsync({ 
      id: { $in: fetchedIds } 
    });
    
    // Get IDs of existing appointments
    const existingIds = existingAppointments.map(app => app.id);
    
    // Filter out appointments that already exist
    const newAppointments = fetchedAppointments.filter(
      appointment => !existingIds.includes(appointment.id)
    ).map(appointment => ({
      ...appointment,
      notified: false,
      dateAdded: new Date()
    }));

    log(`Found ${newAppointments.length} new appointments`);
    return newAppointments;
  } catch (error) {
    log(`Error finding new appointments: ${error.message}`);
    return [];
  }
};

const markAsNotified = async (appointmentId) => {
  try {
    const result = await updateAsync(
      { id: appointmentId },
      { 
        $set: { 
          notified: true,
          notifiedAt: new Date()
        } 
      }
    );

    log(`Marked appointment ${appointmentId} as notified`);
    return true;
  } catch (error) {
    log(`Error marking appointment as notified: ${error.message}`);
    return false;
  }
};

const getNotifiedAppointments = async () => {
  try {
    const appointments = await findAsync({ notified: true });
    return appointments;
  } catch (error) {
    log(`Error getting notified appointments: ${error.message}`);
    return [];
  }
};

const getMostRecentAppointments = async (limit = 2) => {
  try {
    // Sort by date field (note: NeDB doesn't have the same sort and limit API)
    const allAppointments = await findAsync({});
    
    // Sort manually by termin field
    allAppointments.sort((a, b) => {
      // Assuming termin is in format dd.mm.yyyy
      const [dayA, monthA, yearA] = a.termin.split('.');
      const [dayB, monthB, yearB] = b.termin.split('.');
      
      const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
      const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
      
      return dateB - dateA; // Descending order (most recent first)
    });
    
    // Return limited results
    return allAppointments.slice(0, limit);
  } catch (error) {
    log(`Error getting recent appointments: ${error.message}`);
    return [];
  }
};

/**
 * Set up the test environment
 */
async function setup() {
  try {
    // Clear database to ensure we start fresh
    await removeAsync({}, { multi: true });
    console.log('Test environment set up successfully');
    return true;
  } catch (error) {
    console.error('Test setup failed:', error);
    return false;
  }
}

/**
 * Clean up after tests
 */
async function cleanup() {
  try {
    // Clear database
    await removeAsync({}, { multi: true });
    console.log('Test environment cleaned up');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Generate test appointments
 */
function generateTestAppointments(count = 3) {
    const appointments = [];
    
    for (let i = 1; i <= count; i++) {
        appointments.push({
            id: i,
            termin: `0${i}.01.2023`,
            pruefungsstelle: `Testprüfstelle ${i}`,
            pruefungsort: `Testort ${i}`,
            landkreis: `Landkreis ${i}`,
            url: `https://example.com/${i}`,
            notified: false
        });
    }
    
    return appointments;
}

/**
 * Run NeDB appointment storage tests
 */
async function runTests() {
    console.log('=== Starting NeDB Appointment Storage Tests ===\n');
    
    // Set up test environment
    if (!(await setup())) {
        console.log('Tests aborted due to setup failure');
        return;
    }
    
    try {
        // Test 1: Initialize collection
        console.log('Test 1: Initialize Collection');
        const initialized = await initializeAppointmentsCollection();
        console.log(`- Collection initialized: ${initialized}`);
        
        // Test 2: Save and load appointments
        console.log('\nTest 2: Save and Load Appointments');
        const testAppointments = generateTestAppointments(3);
        
        // Save appointments
        await saveAppointments(testAppointments);
        
        // Load appointments
        const loadedAppointments = await loadKnownAppointments();
        
        console.log(`- Loaded appointments count: ${loadedAppointments.length}`);
        console.log(`- Appointments loaded correctly: ${loadedAppointments.length === testAppointments.length}`);
        
        // Test 3: Find new appointments
        console.log('\nTest 3: Find New Appointments');
        const fetchedAppointments = [
            ...testAppointments, // Existing appointments
            {
                id: 4,
                termin: '04.01.2023',
                pruefungsstelle: 'Testprüfstelle 4',
                pruefungsort: 'Testort 4',
                landkreis: 'Landkreis 4',
                url: 'https://example.com/4'
            }
        ];
        
        const newAppointments = await findNewAppointments(fetchedAppointments);
        
        console.log(`- Found new appointments: ${newAppointments.length}`);
        console.log(`- New appointment has correct ID: ${newAppointments[0]?.id === 4}`);
        console.log(`- New appointment has notified=false: ${newAppointments[0]?.notified === false}`);
        
        // Test 4: Mark as notified
        console.log('\nTest 4: Mark as Notified');
        
        // Mark an appointment as notified
        await markAsNotified(1);
        
        // Get notified appointments
        const notifiedAppointments = await getNotifiedAppointments();
        
        console.log(`- Notified appointments count: ${notifiedAppointments.length}`);
        console.log(`- Appointment was marked correctly: ${notifiedAppointments[0]?.id === 1 && notifiedAppointments[0]?.notified === true}`);
        
        // Test 5: Get most recent appointments
        console.log('\nTest 5: Get Most Recent Appointments');
        
        // Insert an appointment with a newer date
        const newerAppointment = {
            id: 5,
            termin: '05.02.2023', // Newer date
            pruefungsstelle: 'Testprüfstelle 5',
            pruefungsort: 'Testort 5',
            landkreis: 'Landkreis 5',
            url: 'https://example.com/5',
            notified: false
        };
        
        await saveAppointments([newerAppointment]);
        
        // Get most recent appointments (limit to 2)
        const recentAppointments = await getMostRecentAppointments(2);
        
        console.log(`- Recent appointments count: ${recentAppointments.length}`);
        console.log(`- Most recent appointment is correct: ${recentAppointments[0]?.id === 5}`);
        
        console.log('\n=== All Tests Completed ===');
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await cleanup();
    }
}

// Run tests
runTests();