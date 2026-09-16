import { useCallback, useEffect, useRef, useState } from "react";

type ScanResult = { found: boolean; message: string };
type Controls = { stop: () => void };

export function BarcodeScanner({ onDetected }: { onDetected: (jan: string) => ScanResult }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const handled = useRef(false);
  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setOpen(false);
  }, []);
  const accept = useCallback((raw: string) => {
    const jan = raw.replace(/\D/g, "");
    if (!jan) {
      setStatus("JANコードを入力してください。");
      return;
    }
    const result = onDetected(jan);
    setStatus(result.message);
    if (result.found) {
      handled.current = true;
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
          if (result && !handled.current) accept(result.getText());
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
    handled.current = false;
    setStatus("カメラを商品のバーコードに向けてください。");
    setOpen(true);
  }
  return <div className="barcode-tool"><button type="button" className="barcode-open" onClick={start}><span>▥</span><b>バーコードで商品を選ぶ</b><small>JANコードから商品・カラーを自動選択</small></button>{status&&!open&&<p className="barcode-result">{status}</p>}{open&&<div className="barcode-layer"><button type="button" className="barcode-backdrop" aria-label="閉じる" onClick={stop}/><section role="dialog" aria-modal="true"><button type="button" className="barcode-close" onClick={stop}>×</button><h2>バーコードを読み取る</h2><div className="barcode-camera"><video ref={videoRef} muted playsInline/><i/><span>バーコードを枠内に合わせてください</span></div><p>{status}</p><div className="barcode-manual"><label>JANコード<input value={manual} inputMode="numeric" maxLength={14} onChange={event=>setManual(event.target.value.replace(/\D/g,""))}/></label><button type="button" onClick={()=>accept(manual)}>商品を照合</button></div></section></div>}</div>;
}
