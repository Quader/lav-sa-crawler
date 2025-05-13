import fetch from 'node-fetch';
import schedule from 'node-schedule';
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

// === CONFIG ===
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const API_URL = process.env.API_URL;
const DATA_FILE = path.resolve(process.env.DATA_FILE_PATH || './known-appointments.json');
const LOG_FILE = path.resolve(process.env.LOG_FILE_PATH || './crawler.log');
const GEWUENSCHTE_PRUEFUNGSART = 'Fischerprüfung'; // Achte auf exakte Schreibweise!

// === Hilfsfunktionen ===
async function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    console.log(entry.trim());
    await fs.appendFile(LOG_FILE, entry);
}

async function sendDiscordAlert(content) {
    await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}

async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await log('📁 known-appointments.json wird neu angelegt...');
        await saveKnownAppointments([]);
    }
}

async function loadKnownAppointments() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveKnownAppointments(appointments) {
    await fs.writeFile(DATA_FILE, JSON.stringify(appointments, null, 2), 'utf-8');
}

// === Hauptfunktion: API-Abruf und JSON-Verarbeitung ===
async function checkFischerpruefung() {
    try {
        await ensureDataFile();

        const res = await fetch(API_URL);
        if (!res.ok) {
            throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
        }
        const jsonResponse = await res.json();
        const termine = jsonResponse.data
            .filter(item => item.examType.name === GEWUENSCHTE_PRUEFUNGSART)
            .map(item => ({
                pruefungsart: item.examType.name,
                termin: new Date(item.date).toLocaleDateString('de-DE'), // Formatierung des Datums
                pruefungsstelle: item.examinationOffice.name,
                pruefungsort: item.contactInfo.area.name,
                landkreis: item.contactInfo.area.districtName
            }));

        const known = await loadKnownAppointments();
        const neueTermine = termine.filter(
            t => !known.some(k =>
                k.termin === t.termin &&
                k.pruefungsstelle === t.pruefungsstelle &&
                k.pruefungsort === t.pruefungsort &&
                k.landkreis === t.landkreis
            )
        );

        if (neueTermine.length > 0) {
            const message = {
                content: `🎣 **Neue Fischerprüfung-Termine gefunden!**\n\n${neueTermine.map(t =>
                    `📅 **Termin:** ${t.termin}\n🏢 **Prüfungsstelle:** ${t.pruefungsstelle}\n📍 **Ort:** ${t.pruefungsort} (${t.landkreis})`
                ).join('\n\n')}`
            };

            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });

            const updatedAppointments = [...known, ...neueTermine];
            await saveKnownAppointments(updatedAppointments);
            await log(`✅ ${neueTermine.length} neue Fischerprüfung-Termine gespeichert und gemeldet.`);
        } else {
            await log('ℹ️ Keine neuen Fischerprüfung-Termine gefunden.');
        }

    } catch (error) {
        const errorMessage = `❌ Fehler beim Abrufen: ${error.message}`;
        await log(errorMessage);
        await sendDiscordAlert(`🚨 Fehler im Fischerprüfungs-Crawler:\n\`\`\`${error.message}\`\`\``);
    }
}

// === Zeitplan: täglich um 8:00 Uhr ===
schedule.scheduleJob('0 8 * * *', checkFischerpruefung);

// === Direkt beim Start prüfen ===
checkFischerpruefung();