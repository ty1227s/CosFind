import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function Page() {
  return <Suspense fallback={<main className="center-page">読み込み中...</main>}><ForgotPasswordForm /></Suspense>;
}
