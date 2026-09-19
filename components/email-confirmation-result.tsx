"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "./site-header";

type Phase = "checking" | "success" | "invalid";

export function EmailConfirmationResult() {
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const failed = Boolean(hash.get("error") || hash.get("error_code") || query.get("error") || query.get("error_code"));
    const confirmed = Boolean(hash.get("access_token") || hash.get("refresh_token") || hash.get("type") === "signup" || query.get("code"));
    window.history.replaceState(null, "", "/auth/confirm");
    setPhase(failed || !confirmed ? "invalid" : "success");
  }, []);

  return <>
    <SiteHeader />
    <main className="form-page auth-flow-page">
      <section className="auth-card email-confirmation-card">
        <p className="eyebrow">EMAIL CONFIRMATION</p>
        {phase === "checking" && <div className="reset-state" role="status"><i /><h1>メールアドレスを確認しています</h1><p>そのまま少しお待ちください。</p></div>}
        {phase === "success" && <div className="reset-state confirmation-success"><b aria-hidden="true">✓</b><h1>登録が完了しました</h1><p>メールアドレスを確認しました。登録したユーザー名またはメールアドレスでログインできます。</p><Link className="submit auth-confirm-login" href="/login?registered=confirmed">ログイン画面へ</Link></div>}
        {phase === "invalid" && <div className="reset-state"><h1>確認リンクを利用できません</h1><p>リンクの有効期限が切れているか、すでに使用されています。登録済みの場合はログインをお試しください。</p><Link className="auth-secondary-link" href="/login">ログイン画面へ戻る</Link></div>}
      </section>
    </main>
  </>;
}
