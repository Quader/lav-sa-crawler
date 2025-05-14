import { log } from '../logger/logger.js';

/**
 * Simple performance monitoring utility
 */
class PerformanceMonitor {
  /**
   * Start measuring performance
   * @param {string} label - Label for the measurement
   * @returns {Function} - Function to stop measurement and log results
   */
  static measure(label) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;
    
    return () => {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage().heapUsed;
      
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const memoryDiff = (endMemory - startMemory) / (1024 * 1024); // MB
      
      log(`Performance [${label}]: ${durationMs.toFixed(2)}ms, Memory: ${memoryDiff.toFixed(2)}MB`);
      
      return {
        label,
        duration: durationMs,
        memoryDiff
      };
    };
  }
  
  /**
   * Measure async function execution time
   * @param {Function} fn - Function to measure
   * @param {string} label - Label for the measurement
   * @returns {Promise<*>} - Return value of the function
   */
  static async measureAsync(fn, label) {
    const end = this.measure(label);
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }
  
  /**
   * Log current memory usage
   * @param {string} label - Label for the log entry
   */
  static logMemoryUsage(label = 'Memory Usage') {
    const memoryUsage = process.memoryUsage();
    const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
    
    log(`${label}:
      RSS: ${formatMB(memoryUsage.rss)}MB
      Heap Total: ${formatMB(memoryUsage.heapTotal)}MB
      Heap Used: ${formatMB(memoryUsage.heapUsed)}MB
      External: ${formatMB(memoryUsage.external)}MB`);
  }
}

export default PerformanceMonitor;