import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { PageLoading } from "@/components/page-loading";

export default function Page() {
  return <Suspense fallback={<PageLoading message="パスワード再設定画面を開いています…"/>}><ForgotPasswordForm /></Suspense>;
}
