"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "./site-header";

type Phase = "checking" | "ready" | "saving" | "invalid" | "error";

function createRecoveryClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
}

export function ResetPasswordForm() {
  const router = useRouter();
  const clientRef = useRef<SupabaseClient | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") !== "recovery") {
      Promise.resolve().then(() => setPhase("invalid"));
      return;
    }
    const client = createRecoveryClient();
    clientRef.current = client;
    if (!client) {
      Promise.resolve().then(() => {
        setPhase("error");
        setMessage("パスワード再設定を利用できません。");
      });
      return;
    }
    let active = true;
    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        setPhase("invalid");
        return;
      }
      window.history.replaceState(null, "", "/reset-password");
      setPhase("ready");
    });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "ready" || !clientRef.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (password.length < 8 || password.length > 128) {
      setMessage("パスワードは8～128文字で入力してください。");
      return;
    }
    if (password !== confirmation) {
      setMessage("確認用パスワードが一致しません。");
      return;
    }
    setPhase("saving");
    setMessage("");
    const { error } = await clientRef.current.auth.updateUser({ password });
    if (error) {
      setPhase("ready");
      setMessage("パスワードを更新できませんでした。リンクの有効期限をご確認ください。");
      return;
    }
    await clientRef.current.auth.signOut();
    router.replace("/login?passwordReset=success");
    router.refresh();
  }

  return <>
    <SiteHeader />
    <main className="form-page auth-flow-page">
      <section className="auth-card">
        <p className="eyebrow">NEW PASSWORD</p>
        <h1>新しいパスワードを設定</h1>
        {phase === "checking" && <div className="reset-state" role="status"><i /><p>再設定リンクを確認しています…</p></div>}
        {phase === "invalid" && <div className="reset-state"><h2>リンクを確認できませんでした</h2><p>リンクの有効期限が切れているか、すでに使用されています。再設定メールをもう一度送信してください。</p><Link className="auth-secondary-link" href="/forgot-password">再設定メールを送信</Link></div>}
        {phase === "error" && <div className="reset-state"><p>{message}</p><Link className="auth-secondary-link" href="/login">ログイン画面へ戻る</Link></div>}
        {(phase === "ready" || phase === "saving") && <form onSubmit={(event) => void submit(event)}>
          <p>8文字以上の新しいパスワードを入力してください。</p>
          <label className="field"><span>新しいパスワード</span><input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          <label className="field"><span>新しいパスワード（確認）</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          {message && <p className="form-error">{message}</p>}
          <button className="submit" type="submit" disabled={phase === "saving"}>{phase === "saving" ? "更新しています…" : "パスワードを更新"}</button>
        </form>}
      </section>
    </main>
  </>;
}
