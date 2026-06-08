// src/components/CustomCursor.tsx
"use client";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Disable custom cursor on touch/mobile devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!cursor || !dot || !label) return;

    // Initially hide cursor until first movement
    gsap.set([cursor, dot], { opacity: 0 });
    gsap.set(label, { opacity: 0, scale: 0 });

    const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3.out" });

    const dotToX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3.out" });
    const dotToY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3.out" });

    let isMoving = false;
    let activeTarget: HTMLElement | null = null;

    const onMouseMove = (e: MouseEvent) => {
      if (!isMoving) {
        gsap.set([cursor, dot], { opacity: 1 });
        isMoving = true;
      }
      
      // Keep exact tracking dot on target center
      dotToX(e.clientX);
      dotToY(e.clientY);

      if (activeTarget) {
        // Elastic lock-on tracking: Follow the target's bounding box + 15% cursor drift
        const rect = activeTarget.getBoundingClientRect();
        const driftX = (e.clientX - (rect.left + rect.width / 2)) * 0.15;
        const driftY = (e.clientY - (rect.top + rect.height / 2)) * 0.15;

        gsap.to(cursor, {
          x: rect.left + driftX,
          y: rect.top + driftY,
          duration: 0.2,
          overwrite: "auto"
        });
      } else {
        // Standard circle center tracking
        xTo(e.clientX);
        yTo(e.clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    // Magnetic Lock-On Snapping Action
    const onMouseEnter = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      if (!target) return;

      activeTarget = target;
      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);
      const borderRad = style.borderRadius || "8px";

      // Context tags and visual properties
      let tagText = "CLICK";
      let themeColor = "rgba(124, 58, 237, 0.04)"; // violet glow tint
      let borderColor = "rgba(124, 58, 237, 0.7)";

      if (target.classList.contains("tubelight-link") || target.tagName === "A") {
        tagText = "EXPLORE";
      } else if (target.classList.contains("selection-card")) {
        tagText = "SELECT";
        themeColor = "rgba(6, 182, 212, 0.04)"; // cyan glow tint
        borderColor = "rgba(6, 182, 212, 0.7)";
      } else if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        tagText = "TYPE";
      } else if (target.classList.contains("bento-card") || target.classList.contains("spotlight-card")) {
        tagText = "VIEW";
        themeColor = "rgba(16, 185, 129, 0.04)"; // emerald glow tint
        borderColor = "rgba(16, 185, 129, 0.7)";
      } else if (target.classList.contains("btn-primary") || target.classList.contains("border-beam-inner")) {
        tagText = "LAUNCH";
        themeColor = "rgba(6, 182, 212, 0.04)";
        borderColor = "rgba(6, 182, 212, 0.7)";
      }

      label.innerText = tagText;

      // Physically morph outer ring to wrap around the active element borders
      gsap.to(cursor, {
        top: 0,
        left: 0,
        width: rect.width,
        height: rect.height,
        borderRadius: borderRad,
        backgroundColor: themeColor,
        borderColor: borderColor,
        xPercent: 0,
        yPercent: 0,
        boxShadow: "0 0 20px rgba(124, 58, 237, 0.1)",
        duration: 0.35,
        ease: "power2.out"
      });

      // Show action tag on hover (subtle scale-up)
      gsap.to(label, {
        opacity: 0.9,
        scale: 1,
        duration: 0.25
      });

      // Hide the dot tracker
      gsap.to(dot, { scale: 0, duration: 0.2 });
    };

    const onMouseLeave = () => {
      activeTarget = null;

      // Morph back to default circle shape
      gsap.to(cursor, {
        top: -16,
        left: -16,
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: "transparent",
        borderColor: "rgba(167, 139, 250, 0.6)",
        xPercent: 0,
        yPercent: 0,
        boxShadow: "none",
        duration: 0.3,
        ease: "power2.out"
      });

      // Hide label
      gsap.to(label, {
        opacity: 0,
        scale: 0,
        duration: 0.2
      });

      // Restore dot tracker
      gsap.to(dot, { scale: 1, duration: 0.2 });
    };

    // Bind listeners to all actionable items in DOM
    const attachHoverListeners = () => {
      const targets = document.querySelectorAll(
        "a, button, [role='button'], input, select, textarea, .magnetic-btn, .glass-card, .faq-header, .selection-card, .accordion-trigger, .bento-card, .spotlight-card"
      );
      targets.forEach((node) => {
        const el = node as HTMLElement;
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
        el.addEventListener("mouseenter", onMouseEnter);
        el.addEventListener("mouseleave", onMouseLeave);
      });
    };

    attachHoverListeners();

    // Observe layout updates to bind dynamic elements
    const observer = new MutationObserver(attachHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      observer.disconnect();
      const targets = document.querySelectorAll(
        "a, button, [role='button'], input, select, textarea, .magnetic-btn, .glass-card, .faq-header, .selection-card, .accordion-trigger, .bento-card, .spotlight-card"
      );
      targets.forEach((node) => {
        const el = node as HTMLElement;
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
      });
    };
  }, []);

  return (
    <>
      {/* Morphing Outer Lock-On Ring */}
      <div
        ref={cursorRef}
        className="custom-cursor-ring"
        style={{
          position: "fixed",
          top: -16,
          left: -16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid rgba(167, 139, 250, 0.6)",
          pointerEvents: "none",
          zIndex: 999999,
          mixBlendMode: "difference",
          willChange: "transform, width, height, border-radius, background-color, border-color, top, left",
          transform: "translate(-100px, -100px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        {/* Micro Text Label */}
        <span
          ref={labelRef}
          style={{
            color: "#ffffff",
            fontFamily: "var(--font-heading)",
            fontSize: "8px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textAlign: "center",
            display: "block",
            pointerEvents: "none",
            transformOrigin: "center center"
          }}
        />
      </div>

      {/* Central tracking dot */}
      <div
        ref={dotRef}
        className="custom-cursor-dot"
        style={{
          position: "fixed",
          top: -4,
          left: -4,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "var(--accent-cyan)",
          pointerEvents: "none",
          zIndex: 999999,
          mixBlendMode: "difference",
          willChange: "transform, scale",
          transform: "translate(-100px, -100px)",
        }}
      />
    </>
  );
}
