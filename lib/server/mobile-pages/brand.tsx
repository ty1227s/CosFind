import "server-only";
import {notFound} from "next/navigation";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {fetchAllSupabaseRows} from "@/lib/supabase-pagination";
type BrandRow = {
  id: string;
  name: string;
};
type ProductRow = {
  id: string;
  name: string;
  category: string;
  additional_categories: string[] | null;
  product_variants: { id: string }[];
};
export async function loadPage({ params }: { params: Promise<{ id: string }> }){
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [brandResult, products] = await Promise.all([
    db.from("brands").select("id,name").eq("id", id).maybeSingle(),
    fetchAllSupabaseRows<ProductRow>((from,to)=>db.from("products")
      .select("id,name,category,additional_categories,product_variants(id)")
      .eq("brand_id", id)
      .eq("is_active", true)
      .order("name")
      .order("id")
      .range(from,to)),
  ]);

  if (brandResult.error || !brandResult.data) notFound();

  const brand = brandResult.data as BrandRow;

  return {id,brand,products};
}
