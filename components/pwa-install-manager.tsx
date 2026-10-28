"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let pendingPrompt: BeforeInstallPromptEvent | null = null;
// Keep the PWA plumbing available, but hide Android install promotion until the
// packaged app is ready to be promoted again.
const INSTALL_PROMPT_ENABLED = false;

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

  if (!INSTALL_PROMPT_ENABLED || !available) return null;
  return <button type="button" className="pwa-menu-install" onClick={() => void requestInstall()}>⬇ CosFindをインストール</button>;
}

export function PwaInstallManager() {
  const pathname = usePathname();
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [sessionState, setSessionState] = useState<"checking" | "guest" | "authenticated">("checking");

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ authenticated?: boolean }>)
      .then((session) => { if (active) setSessionState(session.authenticated ? "authenticated" : "guest"); })
      .catch(() => { if (active) setSessionState("guest"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (sessionState === "checking") return;
    const key = sessionState === "guest" ? "cosfind-signup-banner-dismissed" : "cosfind-pwa-banner-dismissed";
    queueMicrotask(() => setDismissed(sessionStorage.getItem(key) === "1"));
  }, [sessionState]);

  useEffect(() => {
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

  const registrationPage = pathname === "/login" || pathname.startsWith("/admin") || pathname === "/forgot-password" || pathname === "/reset-password";
  const showSignup = sessionState === "guest" && !registrationPage;
  const showInstall = INSTALL_PROMPT_ENABLED && sessionState === "authenticated" && available;
  if ((!showSignup && !showInstall) || dismissed) return null;
  const storageKey = showSignup ? "cosfind-signup-banner-dismissed" : "cosfind-pwa-banner-dismissed";
  return <aside className={`pwa-install-banner${showSignup ? " signup-banner" : ""}`} aria-label={showSignup ? "新規ユーザー登録の案内" : "Androidアプリのインストール案内"}>
    <Image src="/icons/icon-192.png" alt="" width={44} height={44} />
    {showSignup
      ? <><span><b>見つけたコスメ情報をシェアしよう</b><small>無料登録して、みんなのコスメ探しをもっと便利に</small></span><Link className="pwa-install-action" href="/login?mode=signup">新規登録</Link></>
      : <><span><b>CosFindをアプリとして使う</b><small>Androidのホーム画面からすぐ開けます</small></span><button type="button" className="pwa-install-action" onClick={() => void requestInstall()}>インストール</button></>}
    <button type="button" className="pwa-install-dismiss" aria-label="閉じる" onClick={() => { sessionStorage.setItem(storageKey, "1"); setDismissed(true); }}>×</button>
  </aside>;
}
