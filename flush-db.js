import Datastore from 'nedb';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { log } from './modules/logger/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get data file path
const getDataFilePath = () => {
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, './data');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    } catch (err) {
      console.log(`Error creating data directory: ${err.message}`);
    }
  }
  
  return path.resolve(dataDir, 'appointments.db');
};

/**
 * Flush the NeDB database
 */
async function flushDatabase() {
  try {
    const dbPath = getDataFilePath();
    console.log(`Database file path: ${dbPath}`);
    
    // Create a backup if the file exists
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.backup-${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      console.log(`Created backup at: ${backupPath}`);
    }
    
    // Initialize the database with the same file path
    const db = new Datastore({ filename: dbPath });
    
    // Load the database
    await new Promise((resolve, reject) => {
      db.loadDatabase(err => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Remove all documents from the database
    await new Promise((resolve, reject) => {
      db.remove({}, { multi: true }, (err, numRemoved) => {
        if (err) reject(err);
        else {
          console.log(`Removed ${numRemoved} documents from database`);
          resolve(numRemoved);
        }
      });
    });
    
    // Compact the database to reclaim space
    await new Promise((resolve, reject) => {
      db.persistence.compactDatafile();
      db.once('compaction.done', () => {
        console.log('Database compaction complete');
        resolve();
      });
    });
    
    console.log('Database successfully flushed.');
  } catch (error) {
    console.error(`Error flushing database: ${error.message}`);
  }
}

// Execute the function
flushDatabase();