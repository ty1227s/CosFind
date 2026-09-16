export type StoreRequestForPoints = { status: string | null; payload: unknown };

export function isPointEligibleStoreRequest(row: StoreRequestForPoints) {
  if (row.status !== "metadata") return true;
  if (!row.payload || typeof row.payload !== "object") return false;
  const metadataType = (row.payload as { metadataType?: unknown }).metadataType;
  return metadataType === "store_brand_report";
}
