import Datastore from 'nedb';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { log } from '../logger/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get data file path
const getDataFilePath = () => {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      log(`Created data directory: ${dataDir}`);
    } catch (err) {
      log(`Error creating data directory: ${err.message}`);
    }
  }
  
  return path.resolve(dataDir, 'appointments.db');
};

// Collection for appointment data
const appointmentsDb = new Datastore({ 
  filename: getDataFilePath(),
  autoload: true 
});

// Promisify NeDB functions
const promisify = (fn, context) => (...args) => {
  return new Promise((resolve, reject) => {
    fn.call(context, ...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Promisified NeDB methods
const findAsync = promisify(appointmentsDb.find, appointmentsDb);
const insertAsync = promisify(appointmentsDb.insert, appointmentsDb);
const updateAsync = promisify(appointmentsDb.update, appointmentsDb);
const countAsync = promisify(appointmentsDb.count, appointmentsDb);

/**
 * Initialize the appointments collection
 * Creates indexes for efficient querying
 */
async function initializeAppointmentsCollection() {
  try {
    // Create unique index on id field
    appointmentsDb.ensureIndex({ fieldName: 'id', unique: true }, (err) => {
      if (err) log(`Error creating id index: ${err.message}`);
    });

    // Create index on notified field
    appointmentsDb.ensureIndex({ fieldName: 'notified' }, (err) => {
      if (err) log(`Error creating notified index: ${err.message}`);
    });

    // Create index on termin field
    appointmentsDb.ensureIndex({ fieldName: 'termin' }, (err) => {
      if (err) log(`Error creating termin index: ${err.message}`);
    });

    log('Appointments collection initialized');
    return true;
  } catch (error) {
    log(`Error initializing appointments collection: ${error.message}`);
    return false;
  }
}

/**
 * Load all known appointments from the database
 * @returns {Array} Array of appointment objects
 */
async function loadKnownAppointments() {
  try {
    const appointments = await findAsync({});
    log(`Loaded ${appointments.length} appointments from database`);
    return appointments;
  } catch (error) {
    log(`Error loading appointments: ${error.message}`);
    return [];
  }
}

/**
 * Save new appointments to the database
 * @param {Array} newAppointments - Array of appointment objects to save
 * @returns {Boolean} Success status
 */
async function saveAppointments(newAppointments) {
  try {
    if (!Array.isArray(newAppointments) || newAppointments.length === 0) {
      log('No valid appointments to save');
      return false;
    }

    let successCount = 0;

    // Process each appointment (NeDB doesn't have bulkWrite)
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
}

/**
 * Find new appointments that aren't already in the database
 * @param {Array} fetchedAppointments - Appointments fetched from API
 * @returns {Array} Array of new appointments
 */
async function findNewAppointments(fetchedAppointments) {
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
}

/**
 * Mark an appointment as notified
 * @param {Number|String} appointmentId - ID of the appointment to mark
 * @returns {Boolean} Success status
 */
async function markAsNotified(appointmentId) {
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

    if (result === 0) {
      log(`Warning: Appointment with ID ${appointmentId} not found`);
      return false;
    }

    log(`Marked appointment ${appointmentId} as notified`);
    return true;
  } catch (error) {
    log(`Error marking appointment as notified: ${error.message}`);
    return false;
  }
}

/**
 * Get all appointments that have been notified
 * @returns {Array} Array of notified appointment objects
 */
async function getNotifiedAppointments() {
  try {
    const appointments = await findAsync({ notified: true });
    return appointments;
  } catch (error) {
    log(`Error getting notified appointments: ${error.message}`);
    return [];
  }
}

/**
 * Get the most recent appointments
 * @param {Number} limit - Number of appointments to return
 * @returns {Array} Array of appointment objects
 */
async function getMostRecentAppointments(limit = 2) {
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
}

// For backward compatibility
const ensureDataFile = initializeAppointmentsCollection;
const saveKnownAppointments = saveAppointments;

export {
  initializeAppointmentsCollection,
  loadKnownAppointments,
  saveAppointments,
  findNewAppointments,
  markAsNotified,
  getNotifiedAppointments,
  getMostRecentAppointments,
  // Backward compatibility exports
  ensureDataFile,
  saveKnownAppointments
};