import { describe, test, expect, beforeEach } from '@jest/globals';
import { LruStorage } from '../lru-storage.js';

describe('LruStorage', () => {
  let storage: LruStorage<string, number>;

  beforeEach(() => {
    storage = new LruStorage<string, number>({ max: 100 });
  });

  test('set and get a value', () => {
    storage.set('a', 1);
    expect(storage.get('a')).toBe(1);
  });

  test('get missing key returns undefined', () => {
    expect(storage.get('missing')).toBeUndefined();
  });

  test('has returns true for existing key', () => {
    storage.set('b', 2);
    expect(storage.has('b')).toBe(true);
  });

  test('has returns false for missing key', () => {
    expect(storage.has('missing')).toBe(false);
  });

  test('delete removes key and returns true', () => {
    storage.set('c', 3);
    expect(storage.delete('c')).toBe(true);
    expect(storage.has('c')).toBe(false);
    expect(storage.get('c')).toBeUndefined();
  });

  test('delete missing key returns false', () => {
    expect(storage.delete('missing')).toBe(false);
  });

  test('clear removes all keys', () => {
    storage.set('x', 10);
    storage.set('y', 20);
    storage.clear();
    expect(storage.has('x')).toBe(false);
    expect(storage.has('y')).toBe(false);
    expect(storage.size).toBe(0);
  });

  test('overwrites existing value', () => {
    storage.set('k', 1);
    storage.set('k', 99);
    expect(storage.get('k')).toBe(99);
  });

  test('size tracks entry count', () => {
    expect(storage.size).toBe(0);
    storage.set('a', 1);
    storage.set('b', 2);
    expect(storage.size).toBe(2);
    storage.delete('a');
    expect(storage.size).toBe(1);
  });
});

describe('LruStorage max', () => {
  test('evicts least-recently-used when over max', () => {
    const storage = new LruStorage<string, number>({ max: 2 });
    storage.set('a', 1);
    storage.set('b', 2);
    storage.set('c', 3); // should evict 'a'
    expect(storage.has('a')).toBe(false);
    expect(storage.get('b')).toBe(2);
    expect(storage.get('c')).toBe(3);
    expect(storage.size).toBe(2);
  });

  test('get refreshes recency so a recent key is not evicted', () => {
    const storage = new LruStorage<string, number>({ max: 2 });
    storage.set('a', 1);
    storage.set('b', 2);
    storage.get('a'); // a becomes most-recent
    storage.set('c', 3); // should evict b, not a
    expect(storage.has('b')).toBe(false);
    expect(storage.get('a')).toBe(1);
    expect(storage.get('c')).toBe(3);
  });

  // Validation is owned by lru-cache; assert it rejects bad bounds.
  test('rejects non-positive max (via lru-cache)', () => {
    expect(() => new LruStorage({ max: 0 })).toThrow();
    expect(() => new LruStorage({ max: -1 })).toThrow();
  });

  test('requires at least one bound (via lru-cache)', () => {
    expect(() => new LruStorage({})).toThrow();
  });
});

describe('LruStorage ttl', () => {
  /**
   * lru-cache measures TTL with `performance.now()` and caches that
   * reading for `ttlResolution` ms (default 1) via setTimeout.
   * Jest fake-timer / performance.now spies fight that internal cache,
   * so these tests use short real delays instead.
   */
  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  test('expired entry is treated as miss', async () => {
    const storage = new LruStorage<string, string>({ ttl: 50, max: 10 });
    storage.set('k', 'v');
    expect(storage.get('k')).toBe('v');

    await delay(60);
    expect(storage.get('k')).toBeUndefined();
    expect(storage.has('k')).toBe(false);
  });

  test('updateAgeOnGet extends life', async () => {
    const storage = new LruStorage<string, string>({
      ttl: 80,
      max: 10,
      updateAgeOnGet: true,
    });
    storage.set('k', 'v');

    await delay(40);
    expect(storage.get('k')).toBe('v'); // refreshes TTL

    await delay(40); // would have expired without the refresh
    expect(storage.get('k')).toBe('v');
  });

  test('allowStale returns value once then removes', async () => {
    const storage = new LruStorage<string, string>({
      ttl: 50,
      max: 10,
      allowStale: true,
    });
    storage.set('k', 'v');

    await delay(60);
    // Stale hit — value is still returned once
    expect(storage.get('k')).toBe('v');
    // Entry was removed after the stale read
    expect(storage.get('k')).toBeUndefined();
  });

  test('rejects non-positive ttl (via lru-cache)', () => {
    expect(() => new LruStorage({ ttl: 0 })).toThrow();
    expect(() => new LruStorage({ ttl: -5 })).toThrow();
  });
});

describe('LruStorage dispose', () => {
  test('dispose is called on eviction', () => {
    const disposed: Array<{ key: string; value: number }> = [];
    const storage = new LruStorage<string, number>({
      max: 2,
      dispose: (value, key) => {
        disposed.push({ key, value });
      },
    });

    storage.set('a', 1);
    storage.set('b', 2);
    storage.set('c', 3); // evicts a

    expect(disposed).toEqual([{ key: 'a', value: 1 }]);
  });
});
