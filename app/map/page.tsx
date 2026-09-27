import { CosFindApp } from "@/components/cosfind-app";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const station = (await searchParams).station?.trim() || "";
  return <CosFindApp initialStation={station} />;
}
