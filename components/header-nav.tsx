"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PwaInstallButton } from "./pwa-install-manager";
import { CosFindLogo } from "./cosfind-logo";

type Session = { authenticated: boolean; isAdmin?: boolean; username?: string; handle?: string; avatar?: string; avatarUrl?: string; points?: number };

export function HeaderNav() {
  const pathname = usePathname();
  const adminArea = pathname.startsWith("/admin");
  const [session, setSession] = useState<Session>({ authenticated: false });
  const [sessionChecked, setSessionChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loginNavigating, setLoginNavigating] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (adminArea) return;
    let active = true;
    const load = () => void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<Partial<Session>>)
      .then((result) => { if (active) { setSession({ authenticated: Boolean(result.authenticated), isAdmin: Boolean(result.isAdmin), username: result.username, handle: result.handle, avatar: result.avatar, avatarUrl: result.avatarUrl, points: result.points }); setSessionChecked(true); } })
      .catch(() => { if (active) { setSession({ authenticated: false }); setSessionChecked(true); } });
    load();
    window.addEventListener("focus", load);
    window.addEventListener("cosfind-profile-updated", load);
    return () => { active = false; window.removeEventListener("focus", load); window.removeEventListener("cosfind-profile-updated", load); };
  }, [adminArea]);
  useEffect(() => { setMenuOpen(false); setLoginNavigating(false); }, [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousTop = body.style.top;
    const previousLeft = body.style.left;
    body.style.top = -scrollY + "px";
    body.style.left = -scrollX + "px";
    root.classList.add("navigation-menu-open");
    const blockBackground = (event: WheelEvent | TouchEvent) => {
      if (event.target instanceof Node && drawerRef.current?.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const scrollMenu = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const target = event.target;
      if (target instanceof Element && drawer.contains(target) && target.closest("input,textarea,select,[contenteditable=true]")) return;
      const steps: Record<string, number> = { ArrowDown: 40, ArrowUp: -40, PageDown: drawer.clientHeight, PageUp: -drawer.clientHeight, Home: -drawer.scrollHeight, End: drawer.scrollHeight };
      if (!(event.key in steps)) return;
      event.preventDefault();
      event.stopPropagation();
      drawer.scrollBy({ top: steps[event.key], behavior: "instant" });
    };
    window.addEventListener("wheel", blockBackground, { capture: true, passive: false });
    window.addEventListener("touchmove", blockBackground, { capture: true, passive: false });
    window.addEventListener("keydown", scrollMenu, true);
    return () => {
      window.removeEventListener("wheel", blockBackground, true);
      window.removeEventListener("touchmove", blockBackground, true);
      window.removeEventListener("keydown", scrollMenu, true);
      root.classList.remove("navigation-menu-open");
      body.style.top = previousTop;
      body.style.left = previousLeft;
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  }, [menuOpen]);

  if (adminArea) return <nav className="header-nav admin-header-nav"><span className="admin-session-label">{pathname === "/admin/login" ? "管理画面" : "管理画面ログイン中"}</span>{pathname !== "/admin/login" && <form action="/api/admin/logout" method="post" className="header-logout admin-header-logout"><button type="submit">ログアウト</button></form>}</nav>;

  const accountLink = (drawer = false) => session.authenticated && (
    <Link href="/profile" className={`header-username${drawer ? " drawer-account" : ""}`} onClick={() => setMenuOpen(false)}>
      <i className={session.avatarUrl ? "user-image" : ""}>
        {session.avatarUrl ? <img src={session.avatarUrl} alt="" /> : (session.avatar || "✨")}
      </i>
      <span>{session.username || "ユーザー"}さん</span>
      <b className="points-badge">{session.points ?? 0}pt</b>
    </Link>
  );

  const menuItems = (drawer = false) => <>
    {drawer && <div className="drawer-profile-banner">
      <button type="button" className="mobile-menu-close"
        aria-label={"\u30e1\u30cb\u30e5\u30fc\u3092\u9589\u3058\u308b"}
        onClick={() => setMenuOpen(false)}>
        <svg width="26" height="26" viewBox="0 0 24 24"
          fill="none" aria-hidden="true">
          <path d="M5 5L19 19M19 5L5 19" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {session.authenticated ? <Link href="/profile"
        className="drawer-profile-link" onClick={() => setMenuOpen(false)}>
        <strong className="drawer-profile-name">
          {session.username || "\u30e6\u30fc\u30b6\u30fc"}{"\u3055\u3093"}
        </strong>
        {session.handle && <span className="drawer-profile-handle">
          @{session.handle.replace(/^@/, "")}
        </span>}
        <span className="drawer-profile-points">
          <b>{session.points ?? 0}</b><span>pt</span>
        </span>
      </Link> : <div className="drawer-profile-guest">
        <Link href="/" onClick={() => setMenuOpen(false)}
          className="drawer-profile-home"><CosFindLogo /></Link>
        <span>{sessionChecked
          ? "\u30b2\u30b9\u30c8\u3055\u3093"
          : "\u8aad\u307f\u8fbc\u307f\u4e2d\u2026"}</span>
      </div>}
    </div>}
    {session.authenticated && <>
      <Link href="/report" className="report-link" onClick={() => setMenuOpen(false)}>✦ 在庫を報告</Link>
      <Link href="/requests/product" className="request-link" onClick={() => setMenuOpen(false)}>商品申請</Link>
      <Link href="/requests/store" className="request-link" onClick={() => setMenuOpen(false)}>店舗申請</Link>
    </>}
    <div className="drawer-primary-navigation" aria-label="ページメニュー">
      <Link href="/products" onClick={() => setMenuOpen(false)}><span>⌕</span>商品検索</Link>
      <Link href="/brands" onClick={() => setMenuOpen(false)}><span>Aa</span>ブランド検索</Link>
      <Link href="/" onClick={() => setMenuOpen(false)}><span>⌖</span>地図検索</Link>
      <Link href="/areas" onClick={() => setMenuOpen(false)}><span>〒</span>市区町村から探す</Link>
      <Link href="/stations" onClick={() => setMenuOpen(false)}><span>駅</span>駅から探す</Link>
      <Link href="/lines" onClick={() => setMenuOpen(false)}><span>線</span>路線から探す</Link>
      <Link href="/products/new" onClick={() => setMenuOpen(false)}><span>✦</span>新作コスメ情報</Link>
      <Link href="/announcements" onClick={() => setMenuOpen(false)}><span>i</span>お知らせ</Link>
      <a href="https://docs.google.com/forms/d/e/1FAIpQLSdDOCL9VO_5t98b4fJftDz4dgXXKWj903wcX4aUtZB9jOPG1w/viewform?usp=header" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}><span>?</span>お問い合わせ</a>
      <a href="https://x.com/CosFindApp" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}><span>𝕏</span>X（@CosFindApp）</a>
      <a href="https://www.instagram.com/cosfindapp/" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}><span>IG</span>Instagram（@cosfindapp）</a>
    </div>
    {drawer && <PwaInstallButton />}
    {session.authenticated && session.isAdmin && <Link href="/admin" className="report-link admin-link" onClick={() => setMenuOpen(false)}>⚙ 管理画面へ</Link>}
    {session.authenticated && <>
      {!drawer && accountLink()}
      <form action="/api/auth/logout" method="post" className="header-logout"><button type="submit">ログアウト</button></form>
    </>}
    {drawer && sessionChecked && !session.authenticated && <Link href="/login" className={`drawer-login-link${loginNavigating ? " is-navigating" : ""}`} aria-busy={loginNavigating} onClick={() => { setMenuOpen(false); setLoginNavigating(true); }}>{loginNavigating && <i className="header-login-spinner"/>}{loginNavigating ? "移動中…" : "ログイン"}</Link>}
  </>;

  return <nav className="header-nav">
    <div className="header-menu desktop-header-menu">{menuItems()}</div>
    {sessionChecked && !session.authenticated && <Link href="/login" className={`login-link header-login-link${loginNavigating ? " is-navigating" : ""}`} aria-busy={loginNavigating} onClick={() => { setMenuOpen(false); setLoginNavigating(true); }}>{loginNavigating && <i className="header-login-spinner"/>}{loginNavigating ? "移動中…" : "ログイン"}</Link>}
    <button type="button" className="menu-toggle" aria-label="メニューを開く" aria-expanded={menuOpen} aria-controls="mobile-header-menu" onClick={() => setMenuOpen(true)}><span /><span /><span /></button>
    {mounted && createPortal(<div className={`mobile-menu-layer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <button type="button" className="menu-backdrop" aria-label="メニューを閉じる" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} />
      <aside ref={drawerRef} id="mobile-header-menu" className="mobile-menu-drawer" aria-label="メインメニュー" inert={!menuOpen ? true : undefined}>{menuItems(true)}</aside>
    </div>, document.body)}
  </nav>;
}
