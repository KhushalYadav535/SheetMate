// src/components/OfflineDetector.tsx
"use client";
import React, { useState, useEffect } from "react";

export default function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsOffline(!navigator.onLine);
  };

  // Avoid SSR mismatch by waiting until client-side mount
  if (!mounted) {
    return <>{children}</>;
  }

  if (isOffline) {
    return (
      <div className="offline-overlay">
        <style>{`
          .offline-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #090d16;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            color: #f8fafc;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            box-sizing: border-box;
          }
          .offline-card {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 40px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .offline-icon {
            color: var(--accent-purple, #a78bfa);
            margin-bottom: 24px;
            display: flex;
            justify-content: center;
            filter: drop-shadow(0 0 15px rgba(167, 139, 250, 0.4));
          }
          .offline-card h1 {
            font-size: 1.75rem;
            font-weight: 800;
            margin: 0 0 12px 0;
            background: linear-gradient(135deg, #f8fafc, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .offline-card p {
            font-size: 0.95rem;
            color: #94a3b8;
            margin: 0 0 28px 0;
            line-height: 1.5;
          }
          .offline-btn {
            background: linear-gradient(135deg, #7c3aed, #06b6d4);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 32px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 20px rgba(124, 58, 237, 0.2);
          }
          .offline-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 25px rgba(6, 182, 212, 0.4);
          }
          .offline-btn:active {
            transform: translateY(0);
          }
        `}</style>
        <div className="offline-card">
          <div className="offline-icon">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.83-2.84M8.53 16.03a6.002 6.002 0 0 1 6.94 0M12 20h.01"></path>
            </svg>
          </div>
          <h1>You're offline</h1>
          <p>It looks like you lost your internet connection. Please check your network and try again.</p>
          <button onClick={handleRetry} className="offline-btn">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
