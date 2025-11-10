/**
 * LRU (Least Recently Used) Cache implementation
 * Provides efficient caching with automatic eviction of least recently used items
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  /**
   * Create a new LRU cache
   * @param maxSize - Maximum number of items to store
   */
  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Cache size must be greater than 0');
    }
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get value from cache
   * Moves the accessed item to the end (most recently used)
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }

  /**
   * Set value in cache
   * Evicts least recently used item if cache is full
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // Remove if already exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    // Add to end (most recently used)
    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove item from cache
   * @param key - Cache key
   * @returns True if item was removed
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   * @returns Number of items in cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get maximum cache size
   * @returns Maximum number of items
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Get all keys in cache (in LRU order)
   * @returns Array of keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in cache (in LRU order)
   * @returns Array of values
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats(): { size: number; capacity: number; utilization: number } {
    return {
      size: this.cache.size,
      capacity: this.maxSize,
      utilization: this.cache.size / this.maxSize,
    };
  }
}
