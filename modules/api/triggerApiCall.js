import 'dotenv/config';
import { fetchExamData } from './apiClient.js'; // Pfad relativ zum aktuellen Verzeichnis
import { log } from '../logger/logger.js';      // Pfad relativ zum aktuellen Verzeichnis

async function runApiCall() {
    log('Manuelle Auslösung des API-Aufrufs...');
    const data = await fetchExamData();
    if (data) {
        log('API-Aufruf erfolgreich. Daten erhalten:');
        // Hier könntest du die erhaltenen Daten auch ausgeben, wenn du möchtest
        // console.log(JSON.stringify(data, null, 2));
        log('Manuelle API-Überprüfung abgeschlossen.');
    } else {
        log('Fehler beim manuellen API-Aufruf.');
    }
}

runApiCall();