import { CosFindApp } from "@/components/cosfind-app";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const station = (await searchParams).station?.trim() || "";
  return <CosFindApp initialStation={station} />;
}
