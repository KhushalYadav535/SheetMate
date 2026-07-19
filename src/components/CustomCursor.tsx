// src/components/CustomCursor.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Phase 1: Only mount on desktop non-touch devices
  useEffect(() => {
    const isTouch = navigator.maxTouchPoints > 0;
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (!isTouch && !isMobile) setMounted(true);
  }, []);

  // Phase 2: Attach GSAP logic after cursor elements render
  useEffect(() => {
    if (!mounted) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Hide default OS cursor
    document.documentElement.style.cursor = "none";

    // Center both elements relative to their own size
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });

    // Fade cursors in after page settles
    gsap.to([dot, ring], { opacity: 1, duration: 0.5, delay: 0.8 });

    // Track mouse position
    const onMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      gsap.set(dot, { x, y });
      gsap.to(ring, { x, y, duration: 0.42, ease: "power2.out" });
    };

    const INTERACTIVE =
      "button, a, input, select, textarea, " +
      ".selection-card, .faq-card, .bento-card, " +
      ".tilt-card, .magnetic-btn, .tubelight-link, .tubelight-brand";

    const onMouseOver = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) {
        gsap.to(ring, {
          scale: 1.9,
          borderColor: "rgba(124, 58, 237, 0.45)",
          backgroundColor: "rgba(124, 58, 237, 0.04)",
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.to(dot, { scale: 0, duration: 0.18 });
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const to = e.relatedTarget as Element | null;
      if (!to || !to.closest(INTERACTIVE)) {
        gsap.to(ring, {
          scale: 1,
          borderColor: "rgba(100, 116, 139, 0.28)",
          backgroundColor: "transparent",
          duration: 0.35,
          ease: "power2.out",
        });
        gsap.to(dot, { scale: 1, duration: 0.22 });
      }
    };

    const onLeaveWindow = () =>
      gsap.to([dot, ring], { opacity: 0, duration: 0.25 });
    const onEnterWindow = () =>
      gsap.to([dot, ring], { opacity: 1, duration: 0.25 });

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);

    return () => {
      document.documentElement.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <>
      {/* Precise tracking dot */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          backgroundColor: "var(--accent-purple)",
          pointerEvents: "none",
          zIndex: 99999,
          willChange: "transform",
        }}
      />
      {/* Smooth-lagging ring */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          border: "1.5px solid rgba(100, 116, 139, 0.28)",
          backgroundColor: "transparent",
          pointerEvents: "none",
          zIndex: 99998,
          willChange: "transform",
        }}
      />
    </>
  );
}
