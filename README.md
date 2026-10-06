# @ben-bradley/c-cache-lru

LRU storage adapter for [c-cache](https://www.npmjs.com/package/@ben-bradley/c-cache).

Wraps the popular [`lru-cache`](https://www.npmjs.com/package/lru-cache) package and implements the `CacheStorage` contract so it can be passed to `createCache({ storage })`.

Core c-cache stays dependency-free. This package is optional and pulls in `lru-cache` only when you need a full-featured LRU (size limits, disposal hooks, `maxSize`, autopurge, etc.) beyond the lightweight `MapStorage` that ships with the core.

## Install

```bash
npm install @ben-bradley/c-cache @ben-bradley/c-cache-lru
```

## Quick start

```ts
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import { createCache } from '@ben-bradley/c-cache';
import { LruStorage } from '@ben-bradley/c-cache-lru';

const cache = createCache({
  storage: new LruStorage({
    max: 10_000,
    ttl: 5 * 60_000, // 5 minutes
    updateAgeOnGet: true,
  }),
});

if (cluster.isPrimary) {
  const n = availableParallelism();
  for (let i = 0; i < n; i++) cluster.fork();
} else {
  await cache.set('user:42', { name: 'Ada' });
  console.log(await cache.get('user:42')); // visible to every worker
}
```

Call `createCache()` in **both** the primary and workers (same rule as core c-cache). The primary owns the `LruStorage` instance; workers talk over cluster IPC.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max` | `number` | — | Max entries; LRU eviction when full |
| `ttl` | `number` | — | TTL in ms; expired entries treated as miss |
| `updateAgeOnGet` | `boolean` | `false` | Refresh TTL on successful `get` |
| `allowStale` | `boolean` | `false` | Return expired value once on `get` |
| `maxSize` | `number` | — | Max total size (requires `sizeCalculation`) |
| `sizeCalculation` | `(value, key) => number` | — | Per-item size for `maxSize` |
| `dispose` | `(value, key, reason) => void` | — | Called on eviction / delete |
| `updateAgeOnHas` | `boolean` | `false` | Refresh TTL on `has` |
| `ttlAutopurge` | `boolean` | `false` | Proactively purge expired items |

At least one of `max`, `ttl`, or `maxSize` is required. Option validation is deferred to `lru-cache` (invalid values throw from its constructor).

```ts
const storage = new LruStorage({
  max: 5000,
  ttl: 60_000,
  dispose: (value, key) => {
    // e.g. close a handle, free external resources
  },
});
```

## Why a separate package?

- Core c-cache has **zero runtime dependencies**.
- Many users only need the simple `MapStorage` (already LRU-ish via Map insertion order).
- Users who need the full `lru-cache` feature set (size accounting, dispose, iterators, dump/load, etc.) opt in to this adapter.

## API

```ts
import { LruStorage } from '@ben-bradley/c-cache-lru';
import type { LruStorageOptions } from '@ben-bradley/c-cache-lru';

const storage = new LruStorage<K, V>(options?: LruStorageOptions<K, V>);

storage.get(key);    // V | undefined
storage.set(key, value);
storage.delete(key); // boolean
storage.has(key);    // boolean
storage.clear();

storage.size;        // number (extra, not on CacheStorage)
storage.underlying;  // the raw LRUCache instance
```

## Example

See [`examples/basic-cluster.mjs`](./examples/basic-cluster.mjs) for a runnable
multi-process demo (same shape as core c-cache's cluster example, using
`LruStorage` as the backend).

```bash
npm run build
node examples/basic-cluster.mjs
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
