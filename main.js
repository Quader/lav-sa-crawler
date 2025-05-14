import 'dotenv/config';
import schedule from 'node-schedule';
import { fetchExamData } from './modules/api/apiClient.js';
import { sendDiscordAlert } from './modules/discord/discordNotifier.js';
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

        let discordMessage = '';

        if (newAppointments.length > 0) {
            discordMessage += `🎣 **Neue Fischerprüfung-Termine gefunden!**\n\n${newAppointments.map(t =>
                `📅 **Termin:** ${t.termin}\n🏢 **Prüfungsstelle:** ${t.pruefungsstelle}\n📍 **Ort:** ${t.pruefungsort} (${t.landkreis})\n\n🔗 **Link:** ${t.url}`
            ).join('\n\n')}\n\n`;

            for (const newAppointment of newAppointments) {
                await markAsNotified(newAppointment.id, knownAppointments);
            }
        } else {
            discordMessage += 'ℹ️ Keine neuen Fischerprüfung-Termine gefunden.\n\n';
        }

        if (alreadyNotifiedAppointments.length > 0) {
            discordMessage += `**Bereits gemeldete Termine:**\n\n${alreadyNotifiedAppointments.map(t =>
                `📅 **Termin:** ${t.termin}\n🏢 **Prüfungsstelle:** ${t.pruefungsstelle}\n📍 **Ort:** ${t.pruefungsort} (${t.landkreis})\n\n🔗 **Link:** ${t.url}`
            ).join('\n\n')}`;
            
        } else {
            log('ℹ️ Keine neuen Termine und keine bereits gemeldeten Termine gefunden.');
        }
        await sendDiscordAlert(discordMessage);

        // Kombiniere bekannte und neue Termine zum Speichern
        const allAppointmentsToSave = [...knownAppointments, ...newAppointments];
        await saveKnownAppointments(allAppointmentsToSave);
        log(`✅ ${newAppointments.length} neue Fischerprüfung-Termine gefunden und ggf. gemeldet.`);

    } catch (error) {
        log(`❌ Fehler beim Überprüfen der Fischerprüfung: ${error.message}`);
        await sendDiscordAlert(`🚨 Fehler im Fischerprüfungs-Crawler:\n\`\`\`${error.message}\`\`\``);
    }
}

// Zeitplan: täglich um 8:00 Uhr
schedule.scheduleJob('* * * * *', checkFischerpruefung);

// Führt checkFischerpruefung alle 30 Sekunden aus (30000 Millisekunden)
// setInterval(checkFischerpruefung, 30000); 

checkFischerpruefung();