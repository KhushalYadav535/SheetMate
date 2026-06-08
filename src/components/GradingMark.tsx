// src/components/GradingMark.tsx
"use client";
import React from "react";

interface GradingMarkProps {
  type: "correct" | "incorrect" | null;
}

export default function GradingMark({ type }: GradingMarkProps) {
  if (!type) return <div style={{ width: "28px", height: "28px" }} />;

  return (
    <div 
      style={{ 
        width: "28px", 
        height: "28px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        flexShrink: 0 
      }}
    >
      {type === "correct" ? (
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M4 12.5L9.5 18L20 6" 
            stroke="#10b981" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="draw-checkmark" 
          />
        </svg>
      ) : (
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M18 6L6 18" 
            stroke="#ef4444" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            className="draw-cross-line-1" 
          />
          <path 
            d="M6 6L18 18" 
            stroke="#ef4444" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            className="draw-cross-line-2" 
          />
        </svg>
      )}
    </div>
  );
}
