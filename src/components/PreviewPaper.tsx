// src/components/PreviewPaper.tsx
"use client";
import React, { useRef, useEffect } from "react";
import gsap from "gsap";

interface PreviewPaperProps {
  board: string;
  grade: string;
  subject: string;
  topicName: string;
  difficulty: string;
  studentName?: string | null;
}

export default function PreviewPaper({
  board,
  grade,
  subject,
  topicName,
  difficulty,
  studentName
}: PreviewPaperProps) {
  const paperRef = useRef<HTMLDivElement>(null);

  // GSAP 3D tilt effect on mouse move
  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const rotX = -(y / (rect.height / 2)) * 10; // Max 10 deg rotation
      const rotY = (x / (rect.width / 2)) * 10;

      gsap.to(el, {
        rotateX: rotX,
        rotateY: rotY,
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out",
        transformPerspective: 800
      });
    };

    const onMouseLeave = () => {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.5,
        ease: "power2.out"
      });
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  // Helper to generate dynamic mock preview questions based on curriculum selections
  const getMockContent = () => {
    const isEarlyLearner = ["LKG", "UKG", "Class 1", "Class 2"].includes(grade);
    const resolvedTopic = topicName || "Select a Topic";

    if (isEarlyLearner) {
      return (
        <div style={{ fontSize: "0.8rem", color: "#334155" }}>
          <div style={{ marginBottom: "14px" }}>
            <p style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>Activity 1: Match the Following</p>
            <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "10px", color: "#64748b" }}>
              <div>1. Item A<br/>2. Item B</div>
              <div>• Sound A<br/>• Sound B</div>
            </div>
          </div>
          <div style={{ marginBottom: "14px" }}>
            <p style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>Activity 2: Fill in the Blanks</p>
            <p style={{ color: "#64748b" }}>The sheep says ______. [ Word Bank: Bleat ]</p>
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>Activity 3: Circle the Odd One</p>
            <p style={{ color: "#64748b" }}>Apple, Carrot, Banana, Orange</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ fontSize: "0.8rem", color: "#334155" }}>
        <div style={{ marginBottom: "12px", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
          <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.75rem", textTransform: "uppercase" }}>Section A: Multiple Choice Questions</p>
          <p style={{ fontWeight: 600, color: "#1e293b" }}>Q1: A curriculum-aligned query regarding "{resolvedTopic}" goes here?</p>
          <p style={{ color: "#64748b", paddingLeft: "8px" }}>a) Option A &nbsp;&nbsp; b) Option B &nbsp;&nbsp; c) Option C &nbsp;&nbsp; d) Option D</p>
        </div>
        <div style={{ marginBottom: "12px", borderBottom: "1px dashed #e2e8f0", paddingBottom: "6px" }}>
          <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.75rem", textTransform: "uppercase" }}>Section B: Short Answer Questions</p>
          <p style={{ fontWeight: 600, color: "#1e293b" }}>Q2: Describe the core concept of {resolvedTopic}.</p>
          <div style={{ height: "24px", borderBottom: "1px solid #cbd5e1", marginTop: "10px" }}></div>
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.75rem", textTransform: "uppercase" }}>Section C: Critical Application</p>
          <p style={{ fontWeight: 600, color: "#1e293b" }}>Q3: Analytical word problem targeting {difficulty.toLowerCase()} difficulty.</p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ perspective: "1000px" }}>
      <div
        ref={paperRef}
        style={{
          width: "100%",
          maxWidth: "350px",
          minHeight: "480px",
          background: "#ffffff",
          color: "#0f172a",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
          transformStyle: "preserve-3d",
          margin: "0 auto",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decorative Watermark & Header */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-45deg)",
            fontSize: studentName ? "1.6rem" : "2.4rem",
            fontWeight: 800,
            color: "rgba(79, 70, 229, 0.04)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            userSelect: "none"
          }}
        >
          {studentName ? `${studentName}'s Sheet` : "PracUp.co.in"}
        </div>

        {/* Paper Header block */}
        <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#4f46e5", background: "#e0e7ff", padding: "2px 6px", borderRadius: "4px" }}>
              {board}
            </span>
            {studentName ? (
              <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#10b981", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px" }}>
                PRO / ADAPTIVE
              </span>
            ) : (
              <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#475569", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                GUEST PREVIEW
              </span>
            )}
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#475569" }}>
              Grade: {grade}
            </span>
          </div>
          <h4 style={{ fontSize: "1rem", color: "#0f172a", marginTop: "8px", fontFamily: "var(--font-heading)" }}>
            Subject: {subject}
          </h4>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px", fontWeight: 500 }}>
            Topic: {topicName || "Select a Topic"}
          </p>
          <div style={{ display: "flex", gap: "10px", fontSize: "0.65rem", color: "#64748b", marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
              Name: {studentName ? <strong style={{ color: "#000" }}>{studentName}</strong> : "_______________"}
            </span>
            <span>Date: _________</span>
          </div>
        </div>

        {/* Dynamic Mock Questions */}
        {getMockContent()}

        {/* Mock QR footer */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "24px",
            right: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1.5px solid #cbd5e1",
            paddingTop: "10px",
            fontSize: "0.6rem",
            color: "#64748b"
          }}
        >
          <span>pracup.co.in</span>
          <span>Scan for Solutions [QR]</span>
        </div>
      </div>
    </div>
  );
}
