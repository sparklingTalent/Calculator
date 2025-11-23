import NodeCache from 'node-cache';

/**
 * Cache service for managing in-memory caching
 * Default TTL: 30 minutes for data, 1 hour for sheet names
 */
class CacheService {
  constructor() {
    this.cache = new NodeCache({ 
      stdTTL: 1800, // 30 minutes default
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Better performance
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found
   */
  get(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(key, value, ttl = null) {
    if (ttl) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  /**
   * Clear all cache
   */
  flushAll() {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    return this.cache.getStats();
  }
}

// Export singleton instance
export default new CacheService();

