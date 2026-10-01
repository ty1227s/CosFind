"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useUnsavedCloseGuard({ active, close, disabled = false }: { active: boolean; close: () => void; disabled?: boolean }) {
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dirtyRef = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const requestClose = useCallback(() => {
    if (disabled) return;
    if (dirtyRef.current) setConfirming(true);
    else closeRef.current();
  }, [disabled]);

  const cancelClose = useCallback(() => setConfirming(false), []);
  const discardAndClose = useCallback(() => {
    dirtyRef.current = false;
    setDirty(false);
    setConfirming(false);
    closeRef.current();
  }, []);

  useEffect(() => {
    if (active) return;
    dirtyRef.current = false;
    setDirty(false);
    setConfirming(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const handleCloseRequest = () => requestClose();
    window.addEventListener("cosfind-close-modal", handleCloseRequest);
    return () => window.removeEventListener("cosfind-close-modal", handleCloseRequest);
  }, [active, requestClose]);

  useEffect(() => {
    if (!confirming) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        discardAndClose();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [cancelClose, confirming, discardAndClose]);

  return { dirty, confirming, markDirty, requestClose, cancelClose, discardAndClose };
}

export function DiscardChangesDialog({ cancel, discard }: { cancel: () => void; discard: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => { dialogRef.current?.querySelector<HTMLButtonElement>("button[data-discard]")?.focus(); }, []);
  function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    if (!buttons.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="admin-discard-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
    <section ref={dialogRef} className="admin-discard-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-dialog-title" aria-describedby="discard-dialog-description" onKeyDown={trapFocus}>
      <p>UNSAVED CHANGES</p>
      <h2 id="discard-dialog-title">入力内容を保存せず閉じますか？</h2>
      <p id="discard-dialog-description">この画面で変更した内容は失われます。</p>
      <div>
        <button type="button" className="discard-cancel" onClick={cancel}>キャンセル（Esc）</button>
        <button type="button" className="discard-confirm" data-discard onClick={discard}>保存せず閉じる（Enter）</button>
      </div>
    </section>
  </div>;
}
