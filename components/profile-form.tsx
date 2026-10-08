"use client";
import { useEffect, useState } from "react";
import { SiteHeader } from "./site-header";
import { getClientResource, invalidateClientResource } from "@/lib/client-resource-cache";

const AVATARS = ["🌸", "💄", "✨", "🫧", "🌿", "☀️", "🎀", "💎"];

export function ProfileForm() {
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("✨");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [points,setPoints]=useState({points:0,stockReports:0,productRequests:0,storeRequests:0});
  const [state, setState] = useState<"loading" | "ready" | "saving" | "done" | "error" | "unauthorized">("loading");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void getClientResource("auth:profile", async () => { const response=await fetch("/api/auth/profile", { cache: "no-store" });
    if (response.status === 401) return setState("unauthorized");
    const data = await response.json() as { username?: string; displayName?: string; avatar?: string; avatarUrl?: string; points?:number;stockReports?:number;productRequests?:number;storeRequests?:number;error?: string };
    if (!response.ok) throw new Error(data.error || "読み込めませんでした");
    return data;
  }).then((data) => { if(!data)return;setUsername(data.username || ""); setDisplayName(data.displayName || ""); setAvatar(data.avatar || "✨"); setAvatarUrl(data.avatarUrl || "");setPoints({points:data.points??0,stockReports:data.stockReports??0,productRequests:data.productRequests??0,storeRequests:data.storeRequests??0}); setState("ready"); }).catch((error: unknown) => { setMessage(error instanceof Error ? error.message : "読み込めませんでした"); setState("error"); }); }, []);
  async function save(event: React.FormEvent) { event.preventDefault(); setState("saving"); const response = await fetch("/api/auth/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, avatar }) }); const result = await response.json() as { error?: string }; if (!response.ok) { setMessage(result.error || "保存できませんでした"); setState("error"); return; } invalidateClientResource("auth:profile"); setAvatarUrl(""); setMessage("プロフィールを保存しました"); setState("done"); window.dispatchEvent(new Event("cosfind-profile-updated")); }
  async function uploadAvatar(file: File) { setUploading(true); setMessage(""); const form = new FormData(); form.set("avatar", file); const response = await fetch("/api/auth/profile/avatar", { method: "POST", body: form }); const result = await response.json() as { avatarUrl?: string; error?: string }; setUploading(false); if (!response.ok || !result.avatarUrl) { setMessage(result.error || "画像をアップロードできませんでした"); setState("error"); return; } invalidateClientResource("auth:profile"); setAvatarUrl(result.avatarUrl); setMessage("画像アイコンを設定しました"); setState("done"); window.dispatchEvent(new Event("cosfind-profile-updated")); }
  return <><SiteHeader/><main className="form-page"><section className="profile-card"><p className="eyebrow">MY PROFILE</p><h1>プロフィール設定</h1>{state === "unauthorized" ? <p className="form-error">プロフィール設定にはログインが必要です。</p> : state === "loading" ? <p>読み込み中…</p> : <>
    <form onSubmit={save}><div className="profile-preview"><span className={avatarUrl ? "image-avatar" : ""}>{avatarUrl ? <img src={avatarUrl} alt="現在のアイコン"/> : avatar}</span><div><b>{displayName || "表示名"}</b><small>@{username}</small></div></div><label className="field avatar-upload"><span>任意の画像をアップロード</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }}/><small>JPEG・PNG・WebP・GIF、2MB以下。選択するとすぐ設定されます。</small></label><fieldset className="avatar-picker"><legend>またはプリセットアイコン</legend>{AVATARS.map((item) => <label key={item} className={!avatarUrl && avatar === item ? "selected" : ""}><input type="radio" name="avatar" value={item} checked={!avatarUrl && avatar === item} onChange={() => { setAvatar(item); setAvatarUrl(""); }}/><span>{item}</span></label>)}</fieldset><label className="field"><span>HN（表示名）</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} required/><small>1～24文字。投稿者情報として一般公開はしません。</small></label>{(state === "error" || state === "done") && <p className={state === "error" ? "form-error" : "form-message"}>{message}</p>}<button className="submit" disabled={state === "saving" || uploading}>{uploading ? "画像をアップロード中…" : state === "saving" ? "保存中…" : "プロフィールを保存"}</button></form>
    <div className="account-delete-link"><a href="/profile/settings/delete">アカウント削除について</a></div>
  </>}</section></main></>;
}
