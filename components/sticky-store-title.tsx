"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeToHydration = () => () => undefined;

export function StickyStoreTitle({ name }: { name: string }) {
  const markerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    const marker = markerRef.current;
    const bar = barRef.current;
    const header = document.querySelector<HTMLElement>(".topbar");
    if (!mounted || !marker || !bar || !header) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const headerBottom = Math.max(0, header.getBoundingClientRect().bottom);
      bar.style.top = `${headerBottom}px`;
      const nextVisible = marker.getBoundingClientRect().bottom <= headerBottom;
      if (visibleRef.current !== nextVisible) {
        visibleRef.current = nextVisible;
        setVisible(nextVisible);
      }
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const resizeObserver = new ResizeObserver(scheduleUpdate);

    resizeObserver.observe(header);
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mounted]);

  return <>
    <div ref={markerRef} className="sticky-store-title-marker" aria-hidden="true" />
    {mounted && createPortal(<div ref={barRef} className={`sticky-store-title${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      <strong>{name}</strong>
    </div>, document.body)}
  </>;
}
