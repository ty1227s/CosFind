import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { PageLoading } from "@/components/page-loading";

export default function Page() {
  return <Suspense fallback={<PageLoading message="ログイン画面を開いています…"/>}><LoginForm /></Suspense>;
}
