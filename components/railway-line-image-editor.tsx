"use client";

import { useState } from "react";

export function RailwayLineImageEditor({ initialUrl = "" }: { initialUrl?: string }) {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.set("symbol", file);
    try {
      const response = await fetch("/api/admin/railway-line-image", { method: "POST", body: form });
      const result = await response.json() as { imageUrl?: string; error?: string };
      if (!response.ok || !result.imageUrl) throw new Error(result.error || "画像をアップロードできませんでした");
      setImageUrl(result.imageUrl);
      setMessage("路線記号画像をアップロードしました。最後に保存してください。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像をアップロードできませんでした");
    } finally {
      setUploading(false);
    }
  }

  return <fieldset className="railway-line-image-editor">
    <legend>路線記号画像</legend>
    <input type="hidden" name="imageUrl" value={imageUrl}/>
    <div className="railway-line-image-preview">{imageUrl ? <img src={imageUrl} alt="登録中の路線記号"/> : <span>画像未登録</span>}</div>
    <label><span>{uploading ? "アップロード中…" : "画像を選択"}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { const file=event.target.files?.[0];if(file)void upload(file);event.currentTarget.value=""; }}/></label>
    {imageUrl&&<button type="button" onClick={()=>{setImageUrl("");setMessage("画像の解除は、最後に保存すると反映されます。")}}>画像を解除</button>}
    <small>PNG・JPEG・WebP、1MB以下。正方形または横長の透過PNGを推奨します。</small>
    {message&&<p>{message}</p>}
  </fieldset>;
}
