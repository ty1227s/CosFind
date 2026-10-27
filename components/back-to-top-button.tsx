"use client";

import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 320;

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
  };

  return <button
    type="button"
    className={`back-to-top-button${visible ? " is-visible" : ""}`}
    onClick={scrollToTop}
    aria-label="ページの最上部へ戻る"
    title="ページの最上部へ戻る"
    tabIndex={visible ? 0 : -1}
  ><span aria-hidden="true">↑</span></button>;
}
