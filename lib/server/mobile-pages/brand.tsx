import "server-only";
import {notFound} from "next/navigation";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
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
  const [brandResult, productsResult] = await Promise.all([
    db.from("brands").select("id,name").eq("id", id).maybeSingle(),
    db.from("products")
      .select("id,name,category,additional_categories,product_variants(id)")
      .eq("brand_id", id)
      .eq("is_active", true)
      .order("name"),
  ]);

  if (brandResult.error || !brandResult.data) notFound();
  if (productsResult.error) throw productsResult.error;

  const brand = brandResult.data as BrandRow;
  const products = (productsResult.data ?? []) as unknown as ProductRow[];

  return {id,brand,products};
}
