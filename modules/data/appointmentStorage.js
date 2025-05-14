import fs from 'fs/promises';
import path from 'path';
import { log } from '../logger/logger.js';

// Use environment variable or default to './known-appointments.json'
// This allows for testing with different file paths
const getDataFilePath = () => path.resolve(process.env.DATA_FILE_PATH || './known-appointments.json');

/**
 * Ensures the data file exists, creating it if necessary
 */
async function ensureDataFile() {
    const dataFile = getDataFilePath();
    try {
        await fs.access(dataFile);
    } catch {
        log(`📁 ${dataFile} wird neu angelegt...`);
        await fs.writeFile(dataFile, JSON.stringify([]), 'utf-8');
    }
}

/**
 * Loads all known appointments from the data file
 * @returns {Array} Array of appointment objects
 */
async function loadKnownAppointments() {
    const dataFile = getDataFilePath();
    try {
        const data = await fs.readFile(dataFile, 'utf-8');
        const parsedData = JSON.parse(data);
        log('Daten wurden geladen');
        return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
        log(`Daten wurden nicht geladen: ${error.message}`);
        return [];
    }
}

/**
 * Saves appointments to the data file, merging with existing appointments
 * @param {Array} newAppointments - The appointments to save
 * @returns {Boolean} Success status
 */
async function saveKnownAppointments(newAppointments) {
    const dataFile = getDataFilePath();
    try {
        if (!Array.isArray(newAppointments)) {
            log('Warnung: Keine gültigen Termineinträge zum Speichern erhalten');
            return false;
        }
        
        const existingAppointments = await loadKnownAppointments();
        const uniqueAppointments = [];

        // Add existing appointments that aren't being updated
        for (const existing of existingAppointments) {
            if (!newAppointments.some(newApp => newApp.id === existing.id)) {
                uniqueAppointments.push(existing);
            }
        }

        // Add all new appointments
        uniqueAppointments.push(...newAppointments);

        await fs.writeFile(dataFile, JSON.stringify(uniqueAppointments, null, 2), 'utf-8');
        return true;
    } catch (error) {
        log(`Fehler beim Speichern der Termine: ${error.message}`);
        return false;
    }
}

/**
 * Finds appointments in fetched data that aren't in known appointments
 * @param {Array} fetchedAppointments - The appointments fetched from API
 * @param {Array} knownAppointments - The known appointments
 * @returns {Array} Array of new appointments
 */
async function findNewAppointments(fetchedAppointments, knownAppointments) {
    if (!Array.isArray(fetchedAppointments) || !Array.isArray(knownAppointments)) {
        log('Warnung: Ungültige Eingabedaten beim Vergleich der Termine');
        return [];
    }
    
    const newAppointments = [];
    for (const fetched of fetchedAppointments) {
        const isKnown = knownAppointments.some(k => k.id === fetched.id);
        if (!isKnown) {
            newAppointments.push({ ...fetched, notified: false });
        }
    }
    return newAppointments;
}

/**
 * Marks an appointment as notified
 * @param {Number|String} appointmentId - The ID of the appointment to mark
 * @param {Array} knownAppointments - The set of appointments being updated
 * @returns {Boolean} Success status
 */
async function markAsNotified(appointmentId, knownAppointments) {
    try {
        // Get the complete set of appointments to avoid data loss
        const allAppointments = await loadKnownAppointments();
        
        // Find the appointment that needs to be updated
        let appointmentUpdated = false;
        
        // Create the updated appointments list
        const updatedAppointments = allAppointments.map(appointment => {
            if (appointment.id === appointmentId) {
                appointmentUpdated = true;
                return { ...appointment, notified: true };
            }
            return appointment;
        });
        
        if (!appointmentUpdated) {
            log(`Warnung: Termin mit ID ${appointmentId} wurde nicht gefunden`);
        }
        
        // Save all appointments with the updated one
        await saveKnownAppointments(updatedAppointments);
        return true;
    } catch (error) {
        log(`Fehler beim Markieren des Termins als benachrichtigt: ${error.message}`);
        return false;
    }
}

export {
    ensureDataFile,
    loadKnownAppointments,
    saveKnownAppointments,
    findNewAppointments,
    markAsNotified
};