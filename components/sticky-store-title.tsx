"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeToHydration = () => () => undefined;

export function StickyStoreTitle({ name }: { name: string }) {
  const markerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    let observer: IntersectionObserver | null = null;

    const observe = () => {
      observer?.disconnect();
      const headerHeight = document.querySelector<HTMLElement>(".topbar")?.getBoundingClientRect().height ?? 0;
      observer = new IntersectionObserver(
        ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= headerHeight),
        { rootMargin: `-${Math.ceil(headerHeight)}px 0px 0px`, threshold: 0 },
      );
      observer.observe(marker);
    };

    observe();
    window.addEventListener("resize", observe);
    return () => {
      window.removeEventListener("resize", observe);
      observer?.disconnect();
    };
  }, []);

  return <>
    <div ref={markerRef} className="sticky-store-title-marker" aria-hidden="true" />
    {mounted && createPortal(<div className={`sticky-store-title${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      <strong>{name}</strong>
    </div>, document.body)}
  </>;
}
