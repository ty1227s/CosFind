type CacheEntry = { value: unknown };

const values = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<unknown>>();

export function getClientResource<T>(key: string, loader: () => Promise<T>, force = false): Promise<T> {
  if (force) { values.delete(key); pending.delete(key); }
  const cached = values.get(key);
  if (cached) return Promise.resolve(cached.value as T);
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const request = loader().then((value) => { values.set(key, { value }); return value; }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function invalidateClientResource(keyOrPrefix: string) {
  for (const key of values.keys()) if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) values.delete(key);
  for (const key of pending.keys()) if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) pending.delete(key);
}
