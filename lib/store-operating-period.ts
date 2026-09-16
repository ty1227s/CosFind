export type StoreOperatingPeriod = {
  openingDate?: string | null;
  closingDate?: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dateInJapan(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isValidOperatingDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

export function isStorePubliclyVisible(store: StoreOperatingPeriod, today = dateInJapan()) {
  const openingDate = isValidOperatingDate(store.openingDate) ? store.openingDate : null;
  const closingDate = isValidOperatingDate(store.closingDate) ? store.closingDate : null;
  return (!openingDate || openingDate <= today) && (!closingDate || closingDate > today);
}

export function operatingPeriodQuery<T extends { or: (filters: string) => T }>(query: T, today = dateInJapan()) {
  return query
    .or(`opening_date.is.null,opening_date.lte.${today}`)
    .or(`closing_date.is.null,closing_date.gt.${today}`);
}
