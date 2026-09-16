"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function HomeQuickLink({ href, className, icon, title, description }: { href: string; className: string; icon: string; title: string; description: string }) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  useEffect(() => { router.prefetch(href); }, [href, router]);
  return <Link href={href} className={`${className}${moving ? " is-navigating" : ""}`} onPointerEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)} onClick={() => setMoving(true)} aria-busy={moving}><span>{moving ? <i className="quick-link-spinner"/> : icon}</span><b>{moving ? "表示しています…" : title}</b><small>{moving ? "しばらくお待ちください" : description}</small></Link>;
}
