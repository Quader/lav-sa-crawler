import 'dotenv/config';
import schedule from 'node-schedule';
import { fetchExamData } from './modules/api/cachedApiClient.js';
import { 
    sendDiscordAlert, 
    createAppointmentEmbed, 
    createStatusEmbed, 
    DISCORD_COLORS 
} from './modules/discord/discordNotifier.js';
import {
    initializeAppointmentsCollection,
    loadKnownAppointments,
    saveAppointments,
    findNewAppointments,
    markAsNotified,
    getNotifiedAppointments,
    getMostRecentAppointments,
    pruneOldAppointments
} from './modules/data/nedbAppointmentStorage.js';
import { log } from './modules/logger/logger.js';

const EXAM_TYPE_ID = 1; // Replace with the actual fishing exam ID
const LINK_URL = process.env.LINK_URL;

async function checkFischerpruefung() {
    try {
        await initializeAppointmentsCollection();
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

        const newAppointments = await findNewAppointments(fetchedAppointments);
        const alreadyNotifiedAppointments = await getNotifiedAppointments();

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
                await markAsNotified(newAppointment.id);
            }
        } else {
            // No new appointments found
            discordContent = `\n\n\n\n ### ℹ️ Keine neuen Termine gefunden`;
            
            // Show the last two appointments when no new ones were found
            const lastTwoAppointments = await getMostRecentAppointments(2);
                
            if (lastTwoAppointments.length > 0) {
                discordContent += `\n\n ### Aktuelle Termine zur Information:`;
                lastTwoAppointments.forEach(appointment => {
                    discordEmbeds.push(createAppointmentEmbed(appointment, false, 'info'));
                });
            }
            
            // Only show last 2 most recent notified appointments
            if (alreadyNotifiedAppointments.length > 0) {
                // Sort by notifiedAt date, most recent first
                const sortedNotifiedAppointments = [...alreadyNotifiedAppointments]
                    .sort((a, b) => {
                        const dateA = a.notifiedAt ? new Date(a.notifiedAt) : new Date(0);
                        const dateB = b.notifiedAt ? new Date(b.notifiedAt) : new Date(0);
                        return dateB - dateA;
                    })
                    .slice(0, 2); // Take only 2 most recent
                
                discordContent += `\n\n ### Letzte gemeldete Termine:`;
                sortedNotifiedAppointments.forEach(appointment => {
                    discordEmbeds.push(createAppointmentEmbed(appointment, false, 'default'));
                });
            }
        }

        // Send Discord notification
        await sendDiscordAlert(discordContent, discordEmbeds);

        // Save the new appointments to the database
        if (newAppointments.length > 0) {
            await saveAppointments(newAppointments);
        }
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

// Database maintenance job: weekly on Sunday at 3:00am
schedule.scheduleJob('0 3 * * 0', async () => {
    try {
        log('Running database maintenance...');
        await pruneOldAppointments(90); // Keep appointments for 90 days
        log('Database maintenance completed.');
    } catch (error) {
        log(`Error during database maintenance: ${error.message}`);
    }
});

// Cron Job: daily at 8:00am
schedule.scheduleJob('0 8 * * *', checkFischerpruefung);

// init
checkFischerpruefung();