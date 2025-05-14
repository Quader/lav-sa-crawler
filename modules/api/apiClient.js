import fetch from 'node-fetch';
import { log } from '../logger/logger.js';

const API_URL = process.env.API_URL;

async function fetchExamData() {
    try {
        if (!API_URL) {
            throw new Error('Die API-URL ist nicht in der Umgebungsvariable API_URL definiert.');
        }

        const res = await fetch(API_URL);
        if (!res.ok) {
            throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
        }
        const jsonResponse = await res.json();
        // console.log('API Response:', jsonResponse);
        return jsonResponse.data; // Wir gehen davon aus, dass die relevanten Daten im 'data'-Feld der Antwort liegen
    } catch (error) {
        const errorMessage = `Fehler beim Abrufen der API-Daten: ${error.message}`;
        await log(errorMessage);
        return null; // Im Fehlerfall null zurückgeben, damit die Hauptanwendung den Fehler behandeln kann
    }
}

export { fetchExamData };