import { notFound } from "next/navigation";
import { BrandIndex } from "../brand-index";

export const dynamic = "force-dynamic";

export default async function BrandInitialPage({ params }: { params: Promise<{ initial: string }> }) {
  const { initial: slug } = await params;
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch {}
  const initial = decoded === "other" ? "その他" : decoded;
  if (!/^[A-Z]$/.test(initial) && !"あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".includes(initial) && initial !== "その他") notFound();
  return <BrandIndex requested={initial} />;
}
