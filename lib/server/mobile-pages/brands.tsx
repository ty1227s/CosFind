import "server-only";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
type Brand = { id: string; name: string; name_kana: string | null };
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
const smallKana: Record<string, string> = { ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ", ゎ: "わ" };
function kanaInitial(value: string) {
  const first = value.trim().normalize("NFKC")[0];
  if (!first) return "その他";
  const code = first.charCodeAt(0);
  const kana = code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : first;
  const plain = kana.normalize("NFD").replace(/[\u3099\u309a]/g, "").normalize("NFC");
  return smallKana[plain] || (hiragana.includes(plain) ? plain : "その他");
}
function brandInitial(brand: Brand) {
  const first = brand.name.trim().normalize("NFKC")[0] || "";
  if (/^[A-Za-z]$/.test(first)) return first.toUpperCase();
  return brand.name_kana ? kanaInitial(brand.name_kana) : "その他";
}
export async function loadPage({ requested = "" }: { requested?: string }){
  const selected = [...alphabet, ...hiragana, "その他"].includes(requested) ? requested : "";
  let brands: Brand[] = [];
  let error = "";
  try {
    const result = await createSupabaseAdminClient().from("brands").select("id,name,name_kana").order("name");
    if (result.error) throw result.error;
    brands = (result.data ?? []) as Brand[];
  } catch { error = "ブランド一覧を取得できませんでした。"; }
  const counts = new Map<string, number>();
  brands.forEach((brand) => { const key = brandInitial(brand); counts.set(key, (counts.get(key) || 0) + 1); });
  const initialCounts = Object.fromEntries(counts);
  const shown = selected ? brands.filter((brand) => brandInitial(brand) === selected) : [];
  return {selected,error,initialCounts,shown};
}
