"use client";

import { usePathname } from "next/navigation";

export function MobileBottomActionSpace() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <div className="mobile-bottom-action-space" aria-hidden="true" />;
}
