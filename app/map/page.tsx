import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const station = (await searchParams).station?.trim() || "";
  permanentRedirect(station ? `/?station=${encodeURIComponent(station)}` : "/");
}
