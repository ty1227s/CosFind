import type { StoreResult } from "@/types/domain";

type Metadata = { businessHours?: StoreResult["businessHours"]; customName?: boolean; stationNames?: string[] };
type ResponseData = { stores?: Record<string, Metadata> };

// Public display metadata only; keep a bounded cache in each browser tab.
export function createStoreMetadataLoader(request: typeof fetch = (...args) => fetch(...args), now = Date.now) {
  const cache = new Map<string, { value: Record<string, Metadata>; expires: number }>();
  const pending = new Map<string, Promise<Record<string, Metadata>>>();
  async function batch(ids: string[]) {
    const key = ids.join(",");
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.value;
    const running = pending.get(key);
    if (running) return running;
    const load = (async () => {
      let value = cached?.value ?? {};
      let lifetime = 60000;
      try {
        const response = await request("/api/store-metadata", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }), cache: "no-store",
        });
        if (!response.ok) throw new Error("Metadata request failed");
        const data = await response.json() as ResponseData;
        if (!data.stores || typeof data.stores !== "object" || Array.isArray(data.stores)) throw new Error("Invalid metadata");
        value = data.stores;
        lifetime = 300000;
      } catch { /* Retain the last successful names/hours during an outage. */ }
      cache.delete(key);
      cache.set(key, { value, expires: now() + lifetime });
      while (cache.size > 100) cache.delete(cache.keys().next().value!);
      return value;
    })();
    pending.set(key, load);
    try { return await load; } finally { pending.delete(key); }
  }
  return async (ids: string[]): Promise<ResponseData> => {
    const ordered = [...new Set(ids)].sort();
    const stores: Record<string, Metadata> = {};
    // Keep at most two requests in flight while avoiding dozens of small
    // round trips once the public catalog grows beyond 2,000 stores.
    for (let offset = 0; offset < ordered.length; offset += 1000) {
      const chunks = [ordered.slice(offset, offset + 500), ordered.slice(offset + 500, offset + 1000)].filter(chunk => chunk.length);
      for (const result of await Promise.all(chunks.map(batch))) Object.assign(stores, result);
    }
    return { stores };
  };
}
