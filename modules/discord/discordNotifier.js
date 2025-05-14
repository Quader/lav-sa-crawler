import { Discord } from '@penseapp/discord-notification';
import { log } from '../logger/logger.js';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Sendet eine Benachrichtigung über Discord mit verbesserten Formatierungsmöglichkeiten
 * 
 * @param {string} content Der zu sendende Textinhalt (für einfache Nachrichten oder Fallback)
 * @param {Object[]} [embeds] Array von Discord Embeds für reichhaltigere Nachrichten
 * @returns {Promise<boolean>} Erfolgsstatus der Benachrichtigung
 */
async function sendDiscordAlert(content, embeds = []) {
    if (!DISCORD_WEBHOOK_URL) {
        log('🚨 Warnung: Discord Webhook URL ist nicht in der Umgebungsvariable DISCORD_WEBHOOK_URL definiert. Benachrichtigungen werden nicht gesendet.');
        return false;
    }

    // Erstellt eine neue Discord-Instanz mit dem Webhook
    const discord = new Discord({
        webhook: DISCORD_WEBHOOK_URL
    });

    try {
        // Wenn Embeds vorhanden sind, verwenden wir diese
        if (embeds.length > 0) {
            await discord.send({ 
                embeds,
                content: content || undefined  // Optionaler Haupttext
            });
        } else {
            // Ansonsten nur den Textinhalt senden
            await discord.send({ content });
        }
        
        log('✅ Discord-Benachrichtigung erfolgreich gesendet.');
        return true;
    } catch (error) {
        log(`❌ Fehler beim Senden der Discord-Nachricht: ${error.message}`);
        return false;
    }
}

/**
 * Erstellt ein Discord Embed Objekt für einen Fischerprüfungstermin
 * 
 * @param {Object} appointment Der Termin
 * @param {boolean} isNew Ob es sich um einen neuen Termin handelt
 * @param {string} [color] Die Farbe des Embeds (Hex-Code ohne #)
 * @returns {Object} Discord Embed Objekt
 */
function createAppointmentEmbed(appointment, isNew = false, color = '0099ff') {
    const emoji = isNew ? '🆕' : '🎣';
    const title = `${emoji} Fischerprüfungstermin ${isNew ? '(NEU)' : ''}`;
    
    // Für neue Termine eine andere Farbe verwenden
    const embedColor = isNew ? 'e74c3c' : color;
    
    return {
        title: title,
        url: appointment.url,
        color: embedColor,
        fields: [
            {
                name: '📅 Termin',
                value: appointment.termin,
                inline: true
            },
            {
                name: '🏢 Prüfungsstelle',
                value: appointment.pruefungsstelle,
                inline: true
            },
            {
                name: '📍 Ort',
                value: `${appointment.pruefungsort} (${appointment.landkreis})`,
                inline: true
            }
        ],
        footer: {
            text: 'Fischerprüfungs-Crawler'
        },
        timestamp: new Date().toISOString()
    };
}

export { sendDiscordAlert, createAppointmentEmbed };