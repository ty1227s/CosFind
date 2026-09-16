"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HeaderProductSearch } from "./header-product-search";
import { PwaInstallButton } from "./pwa-install-manager";

type Session = { authenticated: boolean; isAdmin?: boolean; username?: string; avatar?: string; avatarUrl?: string; points?: number };

export function HeaderNav() {
  const pathname = usePathname();
  const adminArea = pathname.startsWith("/admin");
  const [session, setSession] = useState<Session>({ authenticated: false });
  const [sessionChecked, setSessionChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginNavigating, setLoginNavigating] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (adminArea) return;
    let active = true;
    const load = () => void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<Partial<Session>>)
      .then((result) => { if (active) { setSession({ authenticated: Boolean(result.authenticated), isAdmin: Boolean(result.isAdmin), username: result.username, avatar: result.avatar, avatarUrl: result.avatarUrl, points: result.points }); setSessionChecked(true); } })
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  if (adminArea) return <nav className="header-nav admin-header-nav"><span className="admin-session-label">{pathname === "/admin/login" ? "管理画面" : "管理画面ログイン中"}</span>{pathname !== "/admin/login" && <form action="/api/admin/logout" method="post" className="header-logout admin-header-logout"><button type="submit">ログアウト</button></form>}</nav>;

  const menuItems = (drawer = false) => <>
    {drawer && <button type="button" className="mobile-menu-close" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)}>×</button>}
    {drawer && <HeaderProductSearch mobile />}
    <div className="drawer-primary-navigation" aria-label="ページメニュー">
      <Link href="/products" onClick={() => setMenuOpen(false)}><span>⌕</span>商品検索</Link>
      <Link href="/brands" onClick={() => setMenuOpen(false)}><span>Aa</span>ブランド検索</Link>
      <Link href="/" onClick={() => setMenuOpen(false)}><span>⌖</span>地図検索</Link>
      <Link href="/products/new" onClick={() => setMenuOpen(false)}><span>✦</span>新作コスメ情報</Link>
    </div>
    {drawer && <PwaInstallButton />}
    {session.authenticated && session.isAdmin && <Link href="/admin" className="report-link admin-link" onClick={() => setMenuOpen(false)}>⚙ 管理画面へ</Link>}
    {session.authenticated && !session.isAdmin && <>
      <Link href="/report" className="report-link" onClick={() => setMenuOpen(false)}>✦ 在庫を報告</Link>
      <Link href="/requests/product" className="request-link" onClick={() => setMenuOpen(false)}>商品申請</Link>
      <Link href="/requests/store" className="request-link" onClick={() => setMenuOpen(false)}>店舗申請</Link>
    </>}
    {session.authenticated && <>
      <Link href="/profile" className="header-username" onClick={() => setMenuOpen(false)}><i className={session.avatarUrl ? "user-image" : ""}>{session.avatarUrl ? <img src={session.avatarUrl} alt="" /> : (session.avatar || "✨")}</i>{session.username || "ユーザー"}さん <b className="points-badge">{session.points ?? 0}pt</b></Link>
      <form action="/api/auth/logout" method="post" className="header-logout"><button type="submit">ログアウト</button></form>
    </>}
  </>;

  return <nav className="header-nav">
    <div className="header-menu desktop-header-menu">{menuItems()}</div>
    {sessionChecked && !session.authenticated && <Link href="/login" className={`login-link header-login-link${loginNavigating ? " is-navigating" : ""}`} aria-busy={loginNavigating} onClick={() => { setMenuOpen(false); setLoginNavigating(true); }}>{loginNavigating && <i className="header-login-spinner"/>}{loginNavigating ? "移動中…" : "ログイン"}</Link>}
    <button type="button" className="menu-toggle" aria-label="メニューを開く" aria-expanded={menuOpen} aria-controls="mobile-header-menu" onClick={() => setMenuOpen(true)}><span /><span /><span /></button>
    {mounted && createPortal(<div className={`mobile-menu-layer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <button type="button" className="menu-backdrop" aria-label="メニューを閉じる" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} />
      <aside id="mobile-header-menu" className="mobile-menu-drawer" aria-label="メインメニュー" inert={!menuOpen ? true : undefined}>{menuItems(true)}</aside>
    </div>, document.body)}
  </nav>;
}
