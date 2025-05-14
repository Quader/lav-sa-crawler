import 'dotenv/config';
import schedule from 'node-schedule';
import { fetchExamData } from './modules/api/apiClient.js';
import { 
    sendDiscordAlert, 
    createAppointmentEmbed, 
    createStatusEmbed, 
    DISCORD_COLORS 
} from './modules/discord/discordNotifier.js';
import {
    ensureDataFile,
    loadKnownAppointments,
    saveKnownAppointments,
    findNewAppointments,
    markAsNotified
} from './modules/data/appointmentStorage.js';
import { log } from './modules/logger/logger.js';

const EXAM_TYPE_ID = 1; // Ersetze durch die tatsächliche ID der Fischerprüfung
const LINK_URL = process.env.LINK_URL;

async function checkFischerpruefung() {
    try {
        await ensureDataFile();
        const knownAppointments = await loadKnownAppointments();
        const fetchedRawData = await fetchExamData();

        if (!fetchedRawData) {
            log('Fehler beim Abrufen der Prüfungsdaten. Der Prozess wird beendet.');
            return;
        }

        const fetchedAppointments = fetchedRawData
            .filter(item => item.examType.id === EXAM_TYPE_ID)
            .map(item => ({
                id: item.id,
                termin: new Date(item.date).toLocaleDateString('de-DE'),
                pruefungsstelle: item.examinationOffice.name,
                pruefungsort: item.contactInfo.area.name,
                landkreis: item.contactInfo.area.districtName,
                url: LINK_URL + `${item.id}`
            }));

        const newAppointments = await findNewAppointments(fetchedAppointments, knownAppointments);
        const alreadyNotifiedAppointments = await knownAppointments.filter(k => k.notified);

        // Discord-Nachricht Vorbereitung
        let discordContent = '';
        let discordEmbeds = [];

        if (newAppointments.length > 0) {
            // Haupt-Nachrichtentext
            discordContent = `# 🎣 ${newAppointments.length} neue Fischerprüfung-Termine gefunden!`;
            
            // Erstelle für jeden neuen Termin ein Embed
            newAppointments.forEach(appointment => {
                discordEmbeds.push(createAppointmentEmbed(appointment, true));
            });
            
            // Markiere die neuen Termine als benachrichtigt
            for (const newAppointment of newAppointments) {
                await markAsNotified(newAppointment.id, knownAppointments);
            }
        } else {
            // Keine neuen Termine gefunden
            discordContent = '# ℹ️ Keine neuen Fischerprüfung-Termine gefunden';
            
            // Zeigt die letzten beiden Termine an, wenn keine neuen gefunden wurden
            const lastTwoAppointments = [...fetchedAppointments]
                .sort((a, b) => {
                    // Konvertiere deutsche Datumsformate (DD.MM.YYYY) zu Date-Objekten für den Vergleich
                    const dateA = a.termin.split('.').reverse().join('-');
                    const dateB = b.termin.split('.').reverse().join('-');
                    return new Date(dateB) - new Date(dateA);
                })
                .slice(0, 2);
                
            if (lastTwoAppointments.length > 0) {
                discordContent += '\n\nAktuelle Termine zur Information:';
                lastTwoAppointments.forEach(appointment => {
                    discordEmbeds.push(createAppointmentEmbed(appointment, false, 'info'));
                });
            }
            
            // Füge bereits gemeldete Termine hinzu, falls vorhanden
            if (alreadyNotifiedAppointments.length > 0) {
                discordContent += '\n\nBereits gemeldete Termine:';
                alreadyNotifiedAppointments.forEach(appointment => {
                    discordEmbeds.push(createAppointmentEmbed(appointment, false, 'default'));
                });
            }
        }

        // Discord-Benachrichtigung senden
        await sendDiscordAlert(discordContent, discordEmbeds);

        // Kombiniere bekannte und neue Termine zum Speichern
        const allAppointmentsToSave = [...knownAppointments, ...newAppointments];
        await saveKnownAppointments(allAppointmentsToSave);
        log(`✅ ${newAppointments.length} neue Fischerprüfung-Termine gefunden und ggf. gemeldet.`);

    } catch (error) {
        log(`❌ Fehler beim Überprüfen der Fischerprüfung: ${error.message}`);
        // Sende einen Fehler mit rotem Embed
        const errorEmbed = createStatusEmbed(
            'Fehler im Fischerprüfungs-Crawler', 
            `\`\`\`${error.message}\`\`\``, 
            'error'
        );
        await sendDiscordAlert(`🚨 Fehler aufgetreten`, [errorEmbed]);
    }
}

// Zeitplan: täglich um 8:00 Uhr
schedule.scheduleJob('0 8 * * *', checkFischerpruefung);

// Führt checkFischerpruefung beim Start aus
checkFischerpruefung();