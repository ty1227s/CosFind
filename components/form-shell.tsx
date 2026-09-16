"use client";
import { useState, type ReactNode } from "react";
import { SiteHeader } from "./site-header";

export function FormShell({ title, description, children, success = "送信が完了しました", onSubmit }: { title: string; description: string; children: ReactNode; success?: string; onSubmit?: (data: FormData) => void | Promise<void> }) {
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await onSubmit?.(new FormData(event.currentTarget));
      setDone(true); window.dispatchEvent(new Event("cosfind-profile-updated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "送信できませんでした");
    } finally { setSaving(false); }
  }
  return <><SiteHeader/><main className="form-page"><section><p className="eyebrow">COSFIND COMMUNITY DATABASE</p><h1>{title}</h1><p>{description}</p>{done ? <div className="success"><b>✓</b><h2>{success}</h2><p>申請内容は運営が確認し、承認後に公開されます。+3ポイント獲得しました。</p></div> : <form onSubmit={submit}>{children}{error && <p className="form-error">{error}</p>}<button className="submit" type="submit" disabled={saving}>{saving ? "送信中…" : "送信する"}</button></form>}</section></main></>;
}
export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="field"><span>{label}</span>{children}</label>;
