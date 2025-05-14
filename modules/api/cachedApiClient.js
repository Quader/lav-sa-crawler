import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../logger/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL;
const CACHE_DIR = process.env.CACHE_DIR || path.resolve(__dirname, '../../cache');
const CACHE_TTL = process.env.CACHE_TTL || 3600000; // 1 hour in milliseconds

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    log(`Created cache directory: ${CACHE_DIR}`);
  } catch (err) {
    log(`Error creating cache directory: ${err.message}`);
  }
}

/**
 * Get cache file path for the given URL
 * @param {string} url - API URL
 * @returns {string} - Cache file path
 */
function getCacheFilePath(url) {
  // Create a filename from the URL by hashing it
  const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
  return path.join(CACHE_DIR, `${urlHash}.json`);
}

/**
 * Check if cache is valid
 * @param {string} cacheFilePath - Path to cache file
 * @returns {boolean} - True if cache is valid, false otherwise
 */
function isCacheValid(cacheFilePath) {
  try {
    if (!fs.existsSync(cacheFilePath)) {
      return false;
    }

    const stats = fs.statSync(cacheFilePath);
    const cacheAge = Date.now() - stats.mtime.getTime();
    return cacheAge < CACHE_TTL;
  } catch (error) {
    log(`Error checking cache validity: ${error.message}`);
    return false;
  }
}

/**
 * Read data from cache
 * @param {string} cacheFilePath - Path to cache file
 * @returns {object|null} - Cached data or null if cache read fails
 */
function readFromCache(cacheFilePath) {
  try {
    const cacheData = fs.readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(cacheData);
  } catch (error) {
    log(`Error reading from cache: ${error.message}`);
    return null;
  }
}

/**
 * Write data to cache
 * @param {string} cacheFilePath - Path to cache file
 * @param {object} data - Data to cache
 */
function writeToCache(cacheFilePath, data) {
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    log(`Error writing to cache: ${error.message}`);
  }
}

/**
 * Fetch with retry and exponential backoff
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithRetry(url, maxRetries = 3, initialDelay = 1000) {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      
      // If status is 429 (too many requests) or 5xx (server error), retry
      if ((response.status === 429 || response.status >= 500) && retries < maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          delay = parseInt(retryAfter, 10) * 1000;
        }
      } else {
        throw new Error(`API-Fehler: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // If we've reached max retries, throw the error
      if (retries >= maxRetries) {
        throw error;
      }
      
      log(`Retry ${retries + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Exponential backoff
    retries++;
    delay *= 2;
  }
}

/**
 * Fetch data from API with caching and retry
 * @returns {Promise<Array|null>} - API response data or null on error
 */
async function fetchExamData() {
  try {
    if (!API_URL) {
      throw new Error('Die API-URL ist nicht in der Umgebungsvariable API_URL definiert.');
    }

    const cacheFilePath = getCacheFilePath(API_URL);

    // Check if we have a valid cache
    if (isCacheValid(cacheFilePath)) {
      const cachedData = readFromCache(cacheFilePath);
      if (cachedData) {
        log('Returning data from cache');
        return cachedData;
      }
    }

    // Fetch fresh data from API with retry
    const res = await fetchWithRetry(API_URL);
    const jsonResponse = await res.json();
    const data = jsonResponse.data;
    
    // Cache the data
    writeToCache(cacheFilePath, data);
    
    return data;
  } catch (error) {
    const errorMessage = `Fehler beim Abrufen der API-Daten: ${error.message}`;
    log(errorMessage);
    
    // On error, try to use cached data even if expired
    const cacheFilePath = getCacheFilePath(API_URL);
    if (fs.existsSync(cacheFilePath)) {
      log('Fetching from API failed, using expired cache as fallback');
      const cachedData = readFromCache(cacheFilePath);
      if (cachedData) {
        return cachedData;
      }
    }
    
    return null;
  }
}

// Also export the original uncached function for testing or direct use
async function fetchExamDataNoCache() {
  try {
    if (!API_URL) {
      throw new Error('Die API-URL ist nicht in der Umgebungsvariable API_URL definiert.');
    }

    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
    }
    const jsonResponse = await res.json();
    return jsonResponse.data;
  } catch (error) {
    const errorMessage = `Fehler beim Abrufen der API-Daten: ${error.message}`;
    log(errorMessage);
    return null;
  }
}

export { fetchExamData, fetchExamDataNoCache };