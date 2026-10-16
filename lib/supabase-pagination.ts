type SupabasePage<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

const DEFAULT_PAGE_SIZE = 1000;

/** Fetch every row without being truncated by Supabase's per-request row limit. */
export async function fetchAllSupabaseRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<SupabasePage<T>>,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (page.error) throw new Error(page.error.message);
    const data = page.data ?? [];
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}
