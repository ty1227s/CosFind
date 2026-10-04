import { Suspense } from "react";
import { ProfileHistory } from "@/components/profile-history";
import { PageLoading } from "@/components/page-loading";
export default function Page() { return <Suspense fallback={<PageLoading message="商品申請履歴を読み込んでいます…"/>}><ProfileHistory kind="products" /></Suspense>; }
