import fs from 'fs/promises';
import path from 'path';
import { log } from '../logger/logger.js';

const DATA_FILE = path.resolve(process.env.DATA_FILE_PATH || './known-appointments.json');

async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        log('📁 known-appointments.json wird neu angelegt...');
        await saveKnownAppointments([]);
    }
}

async function loadKnownAppointments() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        log('Daten wurden geladen');
        console.log(JSON.parse(data));
        return JSON.parse(data);
    } catch {
        log('Daten wurden nicht geladen');
        return [];
    }
}

async function saveKnownAppointments(newAppointments) {
    const existingAppointments = await loadKnownAppointments();
    const uniqueAppointments = [];

    // Füge alle bestehenden Termine hinzu, die nicht in den neuen Terminen enthalten sind
    for (const existing of existingAppointments) {
        if (!newAppointments.some(newApp => newApp.id === existing.id)) {
            uniqueAppointments.push(existing);
        }
    }

    // Füge alle neuen Termine hinzu
    uniqueAppointments.push(...newAppointments);

    await fs.writeFile(DATA_FILE, JSON.stringify(uniqueAppointments, null, 2), 'utf-8');
}

async function findNewAppointments(fetchedAppointments, knownAppointments) {
    const newAppointments = [];
    for (const fetched of fetchedAppointments) {
        const isKnown = knownAppointments.some(k => k.id === fetched.id);
        if (!isKnown) {
            newAppointments.push({ ...fetched, notified: false });
        }
    }
    return newAppointments;
}

async function markAsNotified(appointmentId, knownAppointments) {
    const updatedAppointments = knownAppointments.map(k =>
        k.id === appointmentId
            ? { ...k, notified: true }
            : k
    );
    await saveKnownAppointments(updatedAppointments);
}

export {
    ensureDataFile,
    loadKnownAppointments,
    saveKnownAppointments,
    findNewAppointments,
    markAsNotified
};