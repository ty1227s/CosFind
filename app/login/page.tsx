import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return <Suspense fallback={<main className="center-page">読み込み中...</main>}><LoginForm /></Suspense>;
}
