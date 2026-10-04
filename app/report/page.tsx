import { Suspense } from "react";
import { ReportForm } from "@/components/report-form";
import { PageLoading } from "@/components/page-loading";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";
export default async function Report() { if (!(await getCurrentUser())) redirect("/login"); return <Suspense fallback={<PageLoading message="在庫報告画面を開いています…"/>}><ReportForm/></Suspense>; }
