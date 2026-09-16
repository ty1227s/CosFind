"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScanResult = { found: boolean; message: string };
type ScannerControls = { stop: () => void };

export function BarcodeScanner({ onDetected }: { onDetected: (janCode: string) => ScanResult }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const handledRef = useRef(false);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setOpen(false);
  }, []);

  const accept = useCallback((raw: string) => {
    const code = raw.replace(/\D/g, "");
    if (!code) {
      setStatus("JANコードを入力してください。");
      return;
    }
    const result = onDetected(code);
    setStatus(result.message);
    if (result.found) {
      handledRef.current = true;
      window.setTimeout(stop, 650);
    }
  }, [onDetected, stop]);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    void import("@zxing/browser").then(async ({ BrowserMultiFormatReader }) => {
      if (disposed || !videoRef.current) return;
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result) => {
          if (result && !handledRef.current) accept(result.getText());
        },
      );
      if (disposed) controls.stop();
      else controlsRef.current = controls;
    }).catch(() => {
      if (!disposed) setStatus("カメラを開始できません。権限を確認するか、JANコードを入力してください。");
    });
    return () => {
      disposed = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [accept, open]);

  function start() {
    handledRef.current = false;
    setStatus("カメラを商品のバーコードに向けてください。");
    setOpen(true);
  }

  return <div className="barcode-mobile-tool"><button type="button" className="barcode-open" onClick={start}><span aria-hidden="true">▥</span><b>バーコードで商品を選ぶ</b><small>JANコードから商品・カラーを自動選択</small></button>{status&&!open&&<p className="barcode-last-result">{status}</p>}{open&&<div className="barcode-layer" role="dialog" aria-modal="true" aria-label="バーコードを読み取る"><button type="button" className="barcode-backdrop" aria-label="閉じる" onClick={stop}/><section><button type="button" className="barcode-close" aria-label="閉じる" onClick={stop}>×</button><h2>バーコードを読み取る</h2><div className="barcode-camera"><video ref={videoRef} muted playsInline/><i/><span>バーコードを枠内に合わせてください</span></div><p className={status.includes("見つかりません")?"is-error":""}>{status}</p><div className="barcode-manual"><label><span>JANコードを入力</span><input value={manual} onChange={event=>setManual(event.target.value.replace(/\D/g,""))} inputMode="numeric" maxLength={14} placeholder="例：4901234567890"/></label><button type="button" onClick={()=>accept(manual)}>商品を照合</button></div></section></div>}</div>;
}
