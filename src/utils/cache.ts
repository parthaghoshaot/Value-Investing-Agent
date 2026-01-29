/**
 * Simple In-Memory Cache
 *
 * Provides basic caching to reduce API calls.
 * Cache entries expire after a configurable TTL.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support
 */
export class Cache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttlMs: number;

  /**
   * Create a new cache instance
   * @param ttlMinutes - Time to live in minutes (default: 60)
   */
  constructor(ttlMinutes = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param customTtlMs - Optional custom TTL in milliseconds
   */
  set(key: string, value: T, customTtlMs?: number): void {
    const ttl = customTtlMs ?? this.ttlMs;
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Delete a value from cache
   * @param key - Cache key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get number of entries in cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get or set with async function
   * @param key - Cache key
   * @param fetchFn - Function to fetch value if not cached
   */
  async getOrSet(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value);
    return value;
  }
}

/**
 * Global cache instances for different data types
 */
export const quoteCache = new Cache(15); // 15 minutes for quotes
export const financialsCache = new Cache(60); // 1 hour for financials
export const profileCache = new Cache(1440); // 24 hours for profiles
export const newsCache = new Cache(30); // 30 minutes for news

/**
 * Create cache key for stock data
 */
export function createCacheKey(type: string, ticker: string, ...args: (string | number)[]): string {
  return `${type}:${ticker.toUpperCase()}:${args.join(':')}`;
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  quoteCache.clear();
  financialsCache.clear();
  profileCache.clear();
  newsCache.clear();
}
