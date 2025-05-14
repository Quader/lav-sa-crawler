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

const EXAM_TYPE_ID = 1; // Replace with the actual fishing exam ID
const LINK_URL = process.env.LINK_URL;

async function checkFischerpruefung() {
    try {
        await ensureDataFile();
        const knownAppointments = await loadKnownAppointments();
        const fetchedRawData = await fetchExamData();

        if (!fetchedRawData) {
            log('Error retrieving exam data. Process terminated.');
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

        // Discord message preparation
        let discordContent = '';
        let discordEmbeds = [];

        if (newAppointments.length > 0) {
            // Main message text
            discordContent = `\n\n\n\n ### 🎣 ${newAppointments.length} neue Termine gefunden!`;
            
            // Create an embed for each new appointment
            newAppointments.forEach(appointment => {
                discordEmbeds.push(createAppointmentEmbed(appointment, true));
            });
            
            // Mark the new appointments as notified
            for (const newAppointment of newAppointments) {
                await markAsNotified(newAppointment.id, knownAppointments);
            }
        } else {
            // No new appointments found
            discordContent = `\n\n\n\n ### ℹ️ Keine neuen Termine gefunden`;
            
            // Show the last two appointments when no new ones were found
            const lastTwoAppointments = [...fetchedAppointments]
                .sort((a, b) => {
                    // Convert German date formats (DD.MM.YYYY) to Date objects for comparison
                    const dateA = a.termin.split('.').reverse().join('-');
                    const dateB = b.termin.split('.').reverse().join('-');
                    return new Date(dateB) - new Date(dateA);
                })
                .slice(0, 2);
                
            if (lastTwoAppointments.length > 0) {
                discordContent += `\n\n ### Aktuelle Termine zur Information:`;
                lastTwoAppointments.forEach(appointment => {
                    discordEmbeds.push(createAppointmentEmbed(appointment, false, 'info'));
                });
            }
            
            // Add already notified appointments, if any
            if (alreadyNotifiedAppointments.length > 0) {
                discordContent += `\n\n ### Bereits gemeldete Termine:`;
                alreadyNotifiedAppointments.forEach(appointment => {
                    discordEmbeds.push(createAppointmentEmbed(appointment, false, 'default'));
                });
            }
        }

        // Send Discord notification
        await sendDiscordAlert(discordContent, discordEmbeds);

        // Combine known and new appointments for saving
        const allAppointmentsToSave = [...knownAppointments, ...newAppointments];
        await saveKnownAppointments(allAppointmentsToSave);
        log(`✅ ${newAppointments.length} neue Termine gefunden und ggf. gemeldet.`);

    } catch (error) {
        log(`❌ Fehler beim Überprüfen der Fischerprüfung: ${error.message}`);
        // Send an error with red embed
        const errorEmbed = createStatusEmbed(
            'Fehler im Fischerprüfungs-Crawler', 
            `\`\`\`${error.message}\`\`\``, 
            'error'
        );
        await sendDiscordAlert(`🚨 Fehler aufgetreten`, [errorEmbed]);
    }
}

// Cron Job: daily at 8:00am
schedule.scheduleJob('0 8 * * *', checkFischerpruefung);

// init
checkFischerpruefung();