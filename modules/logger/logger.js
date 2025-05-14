import fs from 'fs/promises';
import path from 'path';

const LOG_FILE = path.resolve(process.env.LOG_FILE_PATH || './crawler.log');

async function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    console.log(entry.trim()); // Weiterhin zur lokalen Ausgabe
    await fs.appendFile(LOG_FILE, entry);
}

export { log };