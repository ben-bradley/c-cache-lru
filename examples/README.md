# Examples

## basic-cluster.mjs

Minimal multi-process demo using `LruStorage` (lru-cache) as the data store
behind c-cache's cluster IPC layer.

```bash
# from this package root
npm run build
node examples/basic-cluster.mjs
```

Requires `@ben-bradley/c-cache` installed (peer dependency).

`createCache()` runs at module scope in **every** process. On the primary that
registers the `LruStorage` instance and installs IPC handlers; on workers it
proxies operations to the primary.

Each worker writes `worker:<index>` into the shared cache and reads `worker:0`,
showing that data is visible across processes — same behaviour as core
c-cache's MapStorage demo, with a full LRU backend.
