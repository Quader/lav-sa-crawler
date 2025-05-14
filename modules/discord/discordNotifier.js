import fetch from 'node-fetch';
import { log } from '../logger/logger.js';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendDiscordAlert(content) {
    if (!DISCORD_WEBHOOK_URL) {
        log('🚨 Warnung: Discord Webhook URL ist nicht in der Umgebungsvariable DISCORD_WEBHOOK_URL definiert. Benachrichtigungen werden nicht gesendet.');
        return;
    }

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            log(`❌ Fehler beim Senden der Discord-Nachricht: ${response.status} ${response.statusText}`);
        } else {
            log('ℹ️ Discord-Benachrichtigung erfolgreich gesendet.');
        }
    } catch (error) {
        log(`❌ Fehler beim Senden der Discord-Nachricht: ${error.message}`);
    }
}

export { sendDiscordAlert };