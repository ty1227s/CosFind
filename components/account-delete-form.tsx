"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "./site-header";

export function AccountDeleteForm() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "deleting" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/auth/profile", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) { setState("unauthorized"); return; }
      const data = await response.json() as { username?: string; error?: string };
      if (!response.ok || !data.username) throw new Error(data.error || "アカウント情報を読み込めませんでした");
      setState("ready");
    }).catch((error: unknown) => { setMessage(error instanceof Error ? error.message : "アカウント情報を読み込めませんでした"); setState("error"); });
  }, []);

  async function deleteAccount() {
    if (!password || state === "deleting") return;
    setState("deleting"); setMessage("");
    const response = await fetch("/api/auth/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error || "アカウントを削除できませんでした"); setState("error"); return; }
    window.location.assign("/");
  }

  return <><SiteHeader/><main className="form-page"><section className="profile-card account-delete-page"><p className="eyebrow">DELETE ACCOUNT</p><h1>アカウントを削除</h1><a className="account-delete-back" href="/profile/settings">← プロフィール設定に戻る</a>{state === "loading" ? <p>読み込み中…</p> : state === "unauthorized" ? <p className="form-error">アカウント削除にはログインが必要です。</p> : <><div className="account-delete-warning"><strong>この操作は取り消せません</strong><p>プロフィール、在庫報告、商品・店舗申請、お気に入り、アップロードしたアイコンが完全に削除されます。承認後に正式登録された商品・店舗は残ります。</p></div><label className="field"><span>確認のため現在のパスワードを入力</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={state === "deleting"}/></label>{message && <p className="form-error">{message}</p>}<button type="button" className="delete-account-button" disabled={!password || state === "deleting"} onClick={() => void deleteAccount()}>{state === "deleting" ? "削除中…" : "アカウントを完全に削除"}</button></>}</section></main></>;
}
