import 'dotenv/config';
import { sendDiscordAlert, createAppointmentEmbed } from './modules/discord/discordNotifier.js';
import { log } from './modules/logger/logger.js';

/**
 * Test-Script für die Discord-Benachrichtigungen
 * 
 * Dieses Script testet verschiedene Varianten der Discord-Benachrichtigungen,
 * von einfachen Textnachrichten bis hin zu komplexen Embeds.
 */
async function testDiscordNotifier() {
    try {
        log('--- DISCORD WEBHOOK TEST ---');
        log(`DISCORD_WEBHOOK_URL defined: ${!!process.env.DISCORD_WEBHOOK_URL}`);
        
        // Test 1: Simple text message
        log('Test 1: Senden einer einfachen Textnachricht...');
        const simpleMessage = '📊 **Test-Nachricht** vom Fischerprüfungs-Crawler';
        const simpleResult = await sendDiscordAlert(simpleMessage);
        log(`Test 1 Ergebnis: ${simpleResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
        
        // Pause to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 2: Create an example appointment
        log('Test 2: Senden eines Discord Embeds mit einem Beispiel-Termin...');
        const testAppointment = {
            id: 12345,
            termin: '01.06.2023',
            pruefungsstelle: 'Testprüfstelle',
            pruefungsort: 'Musterstadt',
            landkreis: 'Landkreis Test',
            url: 'https://example.com/12345'
        };
        
        // Create the embed
        const testEmbed = createAppointmentEmbed(testAppointment, true);
        
        // Print the embed for debugging
        log(`Test Embed: ${JSON.stringify(testEmbed, null, 2)}`);
        
        // Send the embed
        const embedResult = await sendDiscordAlert('🧪 Test eines Embed-Formats', [testEmbed]);
        log(`Test 2 Ergebnis: ${embedResult ? 'Erfolgreich' : 'Fehlgeschlagen'}`);
        
    } catch (error) {
        log(`❌ Fehler beim Testen der Discord-Benachrichtigungen: ${error.message}`);
    }
}

// Run the test
testDiscordNotifier();