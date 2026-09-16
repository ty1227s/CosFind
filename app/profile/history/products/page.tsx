import { Suspense } from "react";
import { ProfileHistory } from "@/components/profile-history";
export default function Page() { return <Suspense fallback={<main className="center-page">読み込み中...</main>}><ProfileHistory kind="products" /></Suspense>; }
