"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let pendingPrompt: BeforeInstallPromptEvent | null = null;

function emitAvailability() {
  window.dispatchEvent(new CustomEvent("cosfind-pwa-availability", { detail: Boolean(pendingPrompt) }));
}

async function requestInstall() {
  if (!pendingPrompt) return;
  const prompt = pendingPrompt;
  pendingPrompt = null;
  emitAvailability();
  await prompt.prompt();
  await prompt.userChoice;
}

export function PwaInstallButton() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const update = (event: Event) => setAvailable(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("cosfind-pwa-availability", update);
    return () => window.removeEventListener("cosfind-pwa-availability", update);
  }, []);

  if (!available) return null;
  return <button type="button" className="pwa-menu-install" onClick={() => void requestInstall()}>⬇ CosFindをインストール</button>;
}

export function PwaInstallManager() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setDismissed(sessionStorage.getItem("cosfind-pwa-banner-dismissed") === "1"));

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => registration.update()).catch(() => undefined);
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      pendingPrompt = event as BeforeInstallPromptEvent;
      setAvailable(true);
      emitAvailability();
    };
    const installed = () => {
      pendingPrompt = null;
      setAvailable(false);
      emitAvailability();
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!available || dismissed) return null;
  return <aside className="pwa-install-banner" aria-label="Androidアプリのインストール案内">
    <Image src="/icons/icon-192.png" alt="" width={44} height={44} />
    <span><b>CosFindをアプリとして使う</b><small>Androidのホーム画面からすぐ開けます</small></span>
    <button type="button" className="pwa-install-action" onClick={() => void requestInstall()}>インストール</button>
    <button type="button" className="pwa-install-dismiss" aria-label="閉じる" onClick={() => { sessionStorage.setItem("cosfind-pwa-banner-dismissed", "1"); setDismissed(true); }}>×</button>
  </aside>;
}
