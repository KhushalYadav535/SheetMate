// src/components/ThreeBackground.tsx
"use client";
import React, { useEffect, useRef } from "react";

// Soft pastel palette — professional light theme
const ORBS: {
  xRatio: number; yRatio: number;
  rRatio: number;
  rgb: [number, number, number];
  vx: number; vy: number;
  alpha: number;
}[] = [
  { xRatio: 0.12, yRatio: 0.20, rRatio: 0.40, rgb: [196, 175, 252], vx:  0.22, vy:  0.16, alpha: 0.90 }, // soft lavender
  { xRatio: 0.80, yRatio: 0.72, rRatio: 0.42, rgb: [125, 222, 242], vx: -0.18, vy:  0.14, alpha: 0.85 }, // soft cyan
  { xRatio: 0.50, yRatio: 0.48, rRatio: 0.30, rgb: [134, 239, 196], vx:  0.16, vy: -0.20, alpha: 0.70 }, // soft mint
  { xRatio: 0.18, yRatio: 0.76, rRatio: 0.28, rgb: [252, 192, 202], vx: -0.14, vy: -0.16, alpha: 0.80 }, // soft rose
  { xRatio: 0.88, yRatio: 0.16, rRatio: 0.36, rgb: [186, 198, 254], vx:  0.12, vy:  0.20, alpha: 0.75 }, // soft indigo
  { xRatio: 0.44, yRatio: 0.86, rRatio: 0.26, rgb: [153, 246, 228], vx:  0.20, vy: -0.14, alpha: 0.65 }, // soft teal
];

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    // Initialise live orb state from ratios
    const orbs = ORBS.map((o) => ({
      x:     canvas.width  * o.xRatio,
      y:     canvas.height * o.yRatio,
      r:     Math.min(canvas.width, canvas.height) * o.rRatio,
      rgb:   o.rgb,
      vx:    o.vx,
      vy:    o.vy,
      alpha: o.alpha,
    }));

    function frame() {
      const W = canvas!.width;
      const H = canvas!.height;

      // Clear with the base background colour
      ctx!.fillStyle = "#f8fafc";
      ctx!.fillRect(0, 0, W, H);

      for (const orb of orbs) {
        ctx!.globalAlpha = orb.alpha;
        ctx!.fillStyle = `rgb(${orb.rgb.join(",")})`;
        ctx!.beginPath();
        ctx!.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx!.fill();

        // Drift
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Soft boundary bounce
        if (orb.x < -orb.r * 0.3 || orb.x > W + orb.r * 0.3) orb.vx *= -1;
        if (orb.y < -orb.r * 0.3 || orb.y > H + orb.r * 0.3) orb.vy *= -1;
      }

      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(frame);
    }

    frame();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    /* The parent clips any blur-bleed at the viewport edges */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        background: "#f8fafc",
        pointerEvents: "none",
      }}
    >
      {/* Canvas renders hard circles; CSS blur blends them into a living mesh gradient */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          filter: "blur(96px)",
          opacity: 0.88,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
