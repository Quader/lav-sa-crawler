import { createRequire } from 'module';
import { log } from '../logger/logger.js';
import fetch from 'node-fetch';

// Create a require function for ES modules
const require = createRequire(import.meta.url);

// Require the discord-notification package and examine it
const discordPackage = require('@penseapp/discord-notification');
const DiscordNotification = discordPackage.DiscordNotification;

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Standard Discord message colors
const DISCORD_COLORS = {
    SUCCESS: 0x57F287, // Green
    ERROR: 0xED4245,   // Red
    WARNING: 0xFEE75C, // Yellow
    INFO: 0x5865F2,    // Blue
    DEFAULT: 0x808080  // Gray
};

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

    try {
        // Bereite Payload vor
        const payload = {
            content: content
        };

        // Füge Embeds hinzu, wenn vorhanden
        if (embeds && embeds.length > 0) {
            payload.embeds = embeds;
        }

        // Log the payload for debugging (sensitive data sanitized)
        log(`Sending payload to Discord: ${JSON.stringify({
            ...payload,
            content: payload.content ? 'Content is present' : 'No content',
            embeds: payload.embeds ? `${payload.embeds.length} embeds` : 'No embeds'
        })}`);

        // Sende direkt an Discord-Webhook
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorDetails = await response.text().catch(() => 'Could not read error details');
            throw new Error(`Discord API responded with status: ${response.status}, details: ${errorDetails}`);
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
 * @param {string} [messageType='info'] Der Typ der Nachricht: 'success', 'error', 'warning', 'info', oder ein benutzerdefinierter Farbwert
 * @returns {Object} Discord Embed Objekt
 */
function createAppointmentEmbed(appointment, isNew = false, messageType = 'info') {
    const emoji = isNew ? '🆕' : '🎣';
    const title = `${emoji} Fischerprüfungstermin ${isNew ? '(NEU)' : ''}`;
    
    // Farbe basierend auf Nachrichtentyp oder benutzerdefiniertem Wert festlegen
    let embedColor;
    
    if (typeof messageType === 'number') {
        // Wenn eine Zahl übergeben wurde, verwende sie direkt als Farbwert
        embedColor = messageType;
    } else if (typeof messageType === 'string') {
        // Konvertiere String zu Großbuchstaben für Vergleich mit DISCORD_COLORS
        const colorType = messageType.toUpperCase();
        
        // Wähle Farbe basierend auf Nachrichtentyp oder Fallback auf INFO
        if (isNew) {
            // Neue Termine verwenden immer SUCCESS (grün)
            embedColor = DISCORD_COLORS.SUCCESS;
        } else if (DISCORD_COLORS[colorType]) {
            embedColor = DISCORD_COLORS[colorType];
        } else {
            embedColor = DISCORD_COLORS.INFO;
        }
    } else {
        // Fallback
        embedColor = isNew ? DISCORD_COLORS.SUCCESS : DISCORD_COLORS.INFO;
    }
    
    // Get additional information fields from the enhanced appointment object
    const fields = [
        {
            name: '📅 Termin',
            value: `${appointment.termin || 'Kein Datum'} ${appointment.formattedTime ? `um ${appointment.formattedTime} Uhr` : ''}`,
            inline: true
        },
        {
            name: '🧾 Prüfungstyp',
            value: appointment.examTypeName || appointment.examType?.name || 'Keine Angabe',
            inline: true
        },
        {
            name: '🏢 Prüfungsstelle',
            value: appointment.pruefungsstelle || appointment.officeName || 'Keine Angabe',
            inline: true
        },
        {
            name: '📍 Ort',
            value: appointment.pruefungsort ? 
                   `${appointment.pruefungsort}${appointment.landkreis ? ` (${appointment.landkreis})` : ''}` :
                   'Keine Ortsangabe',
            inline: true
        }
    ];
    
    // Add detailed address if available
    if (appointment.address || appointment.contactInfo?.address) {
        fields.push({
            name: '🗺️ Adresse',
            value: appointment.address || appointment.contactInfo?.address || 'Keine Angabe',
            inline: true
        });
    }
    
    // Add contact information if available
    const contact = appointment.contactInfo?.contact || {};
    const contactFields = [];
    
    if (contact.phone) {
        contactFields.push(`📞 ${contact.phone}`);
    }
    
    if (contact.email) {
        contactFields.push(`📧 ${contact.email}`);
    }
    
    if (contact.website) {
        contactFields.push(`🌐 [Website](${contact.website})`);
    }
    
    if (contactFields.length > 0) {
        fields.push({
            name: '📬 Kontakt',
            value: contactFields.join('\n'),
            inline: true
        });
    }
    
    // Add additional information if available
    if (appointment.additionalInfo || appointment.additionalInformation) {
        const additionalInfo = appointment.additionalInfo || appointment.additionalInformation;
        
        // Limit additional info to 1024 characters (Discord limit for field value)
        const limitedInfo = additionalInfo.length > 1020 
            ? additionalInfo.substring(0, 1020) + '...' 
            : additionalInfo;
            
        fields.push({
            name: 'ℹ️ Weitere Informationen',
            value: limitedInfo || 'Keine weiteren Informationen',
            inline: false
        });
    }

    return {
        title: title,
        url: appointment.url,
        color: embedColor,
        fields: fields,
        footer: {
            text: 'Fischerprüfungs-Crawler'
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Erstellt ein einfaches Status-Embed für Erfolgs-, Fehler- oder Infomeldungen
 * 
 * @param {string} title Der Titel des Embeds
 * @param {string} message Die Nachricht im Embed
 * @param {string} [type='info'] Der Typ der Nachricht: 'success', 'error', 'warning', 'info'
 * @param {string} [footer='Fischerprüfungs-Crawler'] Text in der Fußzeile
 * @returns {Object} Discord Embed Objekt
 */
function createStatusEmbed(title, message, type = 'info', footer = 'Fischerprüfungs-Crawler') {
    // Setze das passende Emoji je nach Nachrichtentyp
    let emoji;
    switch(type.toLowerCase()) {
        case 'success':
            emoji = '✅';
            break;
        case 'error':
            emoji = '❌';
            break;
        case 'warning':
            emoji = '⚠️';
            break;
        default:
            emoji = 'ℹ️';
    }
    
    // Konvertiere Typ zu Großbuchstaben für DISCORD_COLORS
    const colorType = type.toUpperCase();
    const color = DISCORD_COLORS[colorType] || DISCORD_COLORS.INFO;
    
    return {
        title: `${emoji} ${title}`,
        description: message,
        color: color,
        footer: {
            text: footer
        },
        timestamp: new Date().toISOString()
    };
}

export { sendDiscordAlert, createAppointmentEmbed, createStatusEmbed, DISCORD_COLORS };