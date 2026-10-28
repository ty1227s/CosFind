import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandIndex } from "../brand-index";
import { publicSiteOrigin } from "@/lib/area-links";

export const dynamic = "force-dynamic";

function decodeInitial(slug: string) {
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch {}
  return decoded === "other" ? "その他" : decoded;
}

export async function generateMetadata({ params }: { params: Promise<{ initial: string }> }): Promise<Metadata> {
  const slug = (await params).initial;
  const initial = decodeInitial(slug);
  const canonical = `${publicSiteOrigin}/brands/${encodeURIComponent(slug === "other" ? "other" : initial)}`;
  const title = `${initial}から始まるコスメブランド | CosFind`;
  const description = `${initial}から始まるブランドの商品を一覧で確認し、取扱店舗や最近の在庫報告を探せます。`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website" } };
}

export default async function BrandInitialPage({ params }: { params: Promise<{ initial: string }> }) {
  const { initial: slug } = await params;
  const initial = decodeInitial(slug);
  if (!/^[A-Z]$/.test(initial) && !"あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".includes(initial) && initial !== "その他") notFound();
  return <BrandIndex requested={initial} />;
}
