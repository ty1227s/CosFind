export type CoordinatePair = { latitude: number; longitude: number };

export function parseCoordinatePair(value: string): CoordinatePair | null {
  const normalized = value.normalize("NFKC").trim().replace(/^\(|\)$/g, "");
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
