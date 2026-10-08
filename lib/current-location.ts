const CURRENT_LOCATION_KEY = "cosfind_current_location_v1";
const MAX_LOCATION_AGE_MS = 24 * 60 * 60 * 1000;

export type CurrentLocation = { latitude: number; longitude: number; savedAt: number };

export function readCurrentLocation(): CurrentLocation | null {
  try {
    const value = JSON.parse(localStorage.getItem(CURRENT_LOCATION_KEY) || "null") as Partial<CurrentLocation> | null;
    if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || !Number.isFinite(value.savedAt)) return null;
    if (Date.now() - value.savedAt! > MAX_LOCATION_AGE_MS) return null;
    return { latitude: value.latitude!, longitude: value.longitude!, savedAt: value.savedAt! };
  } catch { return null; }
}

export function saveCurrentLocation(latitude: number, longitude: number) {
  try { localStorage.setItem(CURRENT_LOCATION_KEY, JSON.stringify({ latitude, longitude, savedAt: Date.now() } satisfies CurrentLocation)); }
  catch {}
}
