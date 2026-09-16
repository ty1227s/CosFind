"use client";
import { useEffect, useState, type ReactNode } from "react";

export function AuthenticatedOnly({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { let active = true; const load = () => void fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json() as Promise<{ authenticated?: boolean }>).then((session) => { if (active) setAuthenticated(Boolean(session.authenticated)); }).catch(() => { if (active) setAuthenticated(false); }); load(); window.addEventListener("focus", load); return () => { active = false; window.removeEventListener("focus", load); }; }, []);
  return authenticated ? <>{children}</> : null;
}
