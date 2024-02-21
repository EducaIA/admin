import { LRUCache } from "lru-cache";
import type { CacheEntry, CachifiedOptions } from "@epic-web/cachified";
import { cachified as baseCachified } from "@epic-web/cachified";

const lru = new LRUCache<string, CacheEntry>({ max: 1000 });

export function cachified<Value>(
  options: Omit<CachifiedOptions<Value>, "cache">
) {
  return baseCachified({
    cache: lru,
    ...options,
  });
}
