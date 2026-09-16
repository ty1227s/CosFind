import "server-only";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > max) return null;
  return normalized;
}

export function optionalJan(value: unknown) {
  const normalized = text(value, 13);
  return normalized !== null && (!normalized || /^\d{8,13}$/.test(normalized)) ? normalized : null;
}

export function finiteCoordinate(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}
