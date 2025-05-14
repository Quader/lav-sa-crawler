import { createRequire } from 'module';
import { log } from '../logger/logger.js';
import fetch from 'node-fetch';

// Create a require function for ES modules
const require = createRequire(import.meta.url);

// Require the discord-notification package and examine it
const discordPackage = require('@penseapp/discord-notification');
const DiscordNotification = discordPackage.DiscordNotification;

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
 * @param {string|number} [color] Die Farbe des Embeds (entweder als Dezimalzahl oder als Hex-String ohne #)
 * @returns {Object} Discord Embed Objekt
 */
function createAppointmentEmbed(appointment, isNew = false, color = 0x0099ff) {
    const emoji = isNew ? '🆕' : '🎣';
    const title = `${emoji} Fischerprüfungstermin ${isNew ? '(NEU)' : ''}`;
    
    // Für neue Termine eine andere Farbe verwenden (rot für neue Termine)
    // Discord erwartet die Farbe als dezimale Zahl, nicht als Hex-String
    const embedColor = isNew ? 0xE74C3C : color;
    
    return {
        title: title,
        url: appointment.url,
        color: embedColor,
        fields: [
            {
                name: '📅 Termin',
                value: appointment.termin || 'Kein Datum angegeben',
                inline: true
            },
            {
                name: '🏢 Prüfungsstelle',
                value: appointment.pruefungsstelle || 'Keine Angabe',
                inline: true
            },
            {
                name: '📍 Ort',
                value: appointment.pruefungsort ? 
                       `${appointment.pruefungsort}${appointment.landkreis ? ` (${appointment.landkreis})` : ''}` :
                       'Keine Ortsangabe',
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