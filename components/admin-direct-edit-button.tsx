"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminDirectEditTarget } from "./admin-manager";

const DirectEditor = dynamic(
  () => import("./admin-manager").then((module) => module.AdminManager),
  { ssr: false },
);

type SessionResponse = { authenticated?: boolean; isAdmin?: boolean };

export function AdminDirectEditButton({ entity, id }: AdminDirectEditTarget) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as SessionResponse : null)
      .then((session) => { if (active) setIsAdmin(Boolean(session?.authenticated && session.isAdmin)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const saved = useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  if (!isAdmin) return null;
  return <>
    <button type="button" className="admin-public-edit-button" onClick={() => setOpen(true)}>
      ✎ {entity === "product" ? "商品情報を編集" : "店舗情報を編集"}
    </button>
    {open && <DirectEditor directEdit={{ entity, id }} onDirectEditClose={close} onDirectEditSaved={saved}/>} 
  </>;
}
