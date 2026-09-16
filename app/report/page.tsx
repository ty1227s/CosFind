import { Suspense } from "react";
import { ReportForm } from "@/components/report-form";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";
export default async function Report() { if (!(await getCurrentUser())) redirect("/login"); return <Suspense fallback={<main className="center-page">読み込み中...</main>}><ReportForm/></Suspense>; }
