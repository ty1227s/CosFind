import { Suspense } from "react";
import { ProfileHistory } from "@/components/profile-history";
import { PageLoading } from "@/components/page-loading";
export default function Page() { return <Suspense fallback={<PageLoading message="在庫報告履歴を読み込んでいます…"/>}><ProfileHistory kind="reports" /></Suspense>; }
