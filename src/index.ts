/**
 * @module @ben-bradley/c-cache-lru
 *
 * LRU storage adapter for [c-cache](https://www.npmjs.com/package/@ben-bradley/c-cache).
 *
 * Wraps the popular [`lru-cache`](https://www.npmjs.com/package/lru-cache)
 * package and implements the `CacheStorage` contract so it can be passed
 * to `createCache({ storage })`.
 *
 * Core c-cache stays dependency-free; this package is optional and adds
 * the `lru-cache` dependency only when you need a full-featured LRU.
 *
 * @packageDocumentation
 *
 * @example
 * ```ts
 * import { createCache } from '@ben-bradley/c-cache';
 * import { LruStorage } from '@ben-bradley/c-cache-lru';
 *
 * const cache = createCache({
 *   storage: new LruStorage({
 *     max: 10_000,
 *     ttl: 5 * 60_000,
 *     updateAgeOnGet: true,
 *   }),
 * });
 * ```
 */

export { LruStorage } from './lru-storage.js';
export type { LruStorageOptions, CacheStorage } from './lru-storage.js';
