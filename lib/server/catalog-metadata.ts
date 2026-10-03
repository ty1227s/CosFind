import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogMetadataRow = { user_id?: string; payload: unknown; created_at: string };

export async function readLatestCatalogMetadata(
  db: SupabaseClient,
  metadataTypes: string[],
  includeUserId = false,
  entityKeys?: string[],
): Promise<CatalogMetadataRow[]> {
  const rpc = await db.rpc("catalog_metadata_latest", { requested_types: metadataTypes, requested_keys: entityKeys?.length ? entityKeys : null });
  if (!rpc.error) return (rpc.data ?? []) as CatalogMetadataRow[];
  if (rpc.error.code !== "PGRST202" && rpc.error.code !== "42883") throw rpc.error;

  const rows: CatalogMetadataRow[] = [];
  const columns = includeUserId ? "user_id,payload,created_at" : "payload,created_at";
  for (let from = 0; ; from += 1000) {
    const page = await db.from("store_requests").select(columns).eq("status", "metadata").order("created_at", { ascending: true }).range(from, from + 999);
    if (page.error) throw page.error;
    rows.push(...((page.data ?? []) as unknown as CatalogMetadataRow[]));
    if ((page.data?.length ?? 0) < 1000) break;
  }
  const requested = new Set(metadataTypes);
  const keys = entityKeys?.length ? new Set(entityKeys) : null;
  return rows.filter((row) => {
    const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
    const type = typeof payload.metadataType === "string" ? payload.metadataType : typeof payload.storeId === "string" ? "store_provisional_brands" : "";
    const key = typeof payload.storeId === "string" ? payload.storeId : typeof payload.stationName === "string" ? payload.stationName : typeof payload.lineName === "string" ? payload.lineName : typeof payload.companyName === "string" ? payload.companyName : "";
    return requested.has(type) && (!keys || keys.has(key));
  });
}
