import { LRUCache } from 'lru-cache';

/**
 * Minimal storage contract matching `@ben-bradley/c-cache`'s CacheStorage.
 * Declared locally so this package can type-check without a hard dependency
 * on the core package (peer is optional for consumers who only need the
 * storage class).
 */
export interface CacheStorage<K = string, V = unknown> {
  get(key: K): Promise<V | undefined> | V | undefined;
  set(key: K, value: V): Promise<void> | void;
  delete(key: K): Promise<boolean> | boolean;
  has(key: K): Promise<boolean> | boolean;
  clear(): Promise<void> | void;
}

/**
 * Options for {@link LruStorage}.
 *
 * Mirrors the most common knobs from `lru-cache` and aligns naming with
 * c-cache's MapStorage where possible (`max`, `ttl`,
 * `updateAgeOnGet`, `allowStale`).
 *
 * At least one of `max`, `ttl`, or `maxSize` must be set (enforced by
 * `lru-cache` itself) to prevent unbounded growth.
 *
 * Note: `lru-cache` requires keys and values to be non-nullish (`{}`).
 * Option validation is deferred to `lru-cache` — invalid values throw
 * from its constructor with its own messages.
 */
export interface LruStorageOptions<K extends {} = string, V extends {} = object> {
  /**
   * Maximum number of entries to keep.
   * When exceeded, the least-recently-used entry is evicted.
   */
  max?: number;

  /**
   * Default time-to-live for entries, in milliseconds.
   * Expired entries are treated as missing on `get` / `has`
   * (and removed).
   */
  ttl?: number;

  /**
   * When `true` and `ttl` is set, successful `get` calls refresh
   * the entry's age to `now + ttl`.
   *
   * @defaultValue false
   */
  updateAgeOnGet?: boolean;

  /**
   * When `true` and an entry is expired, `get` still returns the
   * stale value once (the entry is then deleted).
   * `has` always reports `false` for expired keys.
   *
   * @defaultValue false
   */
  allowStale?: boolean;

  /**
   * Maximum total size of all entries (sum of per-item sizes).
   * Requires `sizeCalculation` (or per-`set` size) when used.
   */
  maxSize?: number;

  /**
   * Function that returns the size of a value for `maxSize` accounting.
   * Must return a positive integer.
   */
  sizeCalculation?: (value: V, key: K) => number;

  /**
   * Called when an entry is evicted or deleted.
   * `reason` is one of: `'evict' | 'set' | 'delete' | 'expire' | 'fetch'`.
   */
  dispose?: (value: V, key: K, reason: LRUCache.DisposeReason) => void;

  /**
   * When `true`, refresh TTL on `has` as well as `get`.
   *
   * @defaultValue false
   */
  updateAgeOnHas?: boolean;

  /**
   * Automatically purge expired items on a timer.
   * Off by default (lazy expiry on access).
   *
   * @defaultValue false
   */
  ttlAutopurge?: boolean;
}

/**
 * {@link CacheStorage} implementation backed by the popular
 * [`lru-cache`](https://www.npmjs.com/package/lru-cache) package (v10).
 *
 * Use this when you need a production-grade LRU with size limits,
 * TTL, disposal hooks, and other advanced options that go beyond
 * the lightweight MapStorage built into core c-cache.
 *
 * The adapter is intentionally thin: it maps the `CacheStorage`
 * contract onto `LRUCache` methods and forwards options. Validation
 * of bounds (`max`, `ttl`, `maxSize`, …) is left to `lru-cache`.
 *
 * @typeParam K - Key type (must be non-nullish; defaults to `string`)
 * @typeParam V - Value type (must be non-nullish; defaults to `object`)
 *
 * @example
 * ```ts
 * import { createCache } from '@ben-bradley/c-cache';
 * import { LruStorage } from '@ben-bradley/c-cache-lru';
 *
 * const cache = createCache({
 *   storage: new LruStorage({ max: 10_000, ttl: 5 * 60_000 }),
 * });
 * ```
 */
export class LruStorage<K extends {} = string, V extends {} = object>
  implements CacheStorage<K, V>
{
  readonly #cache: LRUCache<K, V>;

  /**
   * @param options - LRU / TTL / size configuration
   * @throws {TypeError} If options are invalid (thrown by `lru-cache`)
   */
  constructor(options: LruStorageOptions<K, V> = {}) {
    // Pass through to lru-cache. Its Options type is a union of limited
    // shapes (requires at least one of max / ttl / maxSize), so a cast
    // is needed; runtime validation stays with lru-cache.
    this.#cache = new LRUCache<K, V>(options as LRUCache.Options<K, V, unknown>);
  }

  /**
   * Retrieve the value associated with `key`.
   * Updates recency; respects TTL / allowStale from the underlying cache.
   */
  get(key: K): V | undefined {
    return this.#cache.get(key);
  }

  /**
   * Store a value under `key`. Overwrites any existing value.
   * May evict the least-recently-used entry when bounds are exceeded.
   */
  set(key: K, value: V): void {
    this.#cache.set(key, value);
  }

  /**
   * Remove the entry for `key`.
   *
   * @returns `true` if the key existed and was deleted, otherwise `false`
   */
  delete(key: K): boolean {
    return this.#cache.delete(key);
  }

  /**
   * Check whether `key` exists and is not considered expired.
   */
  has(key: K): boolean {
    return this.#cache.has(key);
  }

  /**
   * Remove every entry from the storage.
   */
  clear(): void {
    this.#cache.clear();
  }

  /**
   * Current number of entries (for diagnostics / tests).
   * Not part of the CacheStorage contract.
   */
  get size(): number {
    return this.#cache.size;
  }

  /**
   * Access the underlying `LRUCache` instance for advanced use
   * (e.g. `dump`, `load`, iterators). Prefer the CacheStorage
   * methods for normal operation.
   */
  get underlying(): LRUCache<K, V> {
    return this.#cache;
  }
}
