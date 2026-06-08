// src/app/page.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ThreeBackground from "@/components/ThreeBackground";
import PreviewPaper from "@/components/PreviewPaper";
import GeneratorWizard from "@/components/GeneratorWizard";
import ChatAgent from "@/components/ChatAgent";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger safely on the client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}


// Word-staggered premium text split reveal component with animated gradient support
function SplitTextReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const words = el.querySelectorAll(".word-reveal-inner");
    gsap.fromTo(words, 
      { y: "115%", rotate: 2 },
      { 
        y: "0%", 
        rotate: 0,
        stagger: 0.08, 
        duration: 0.95, 
        delay, 
        ease: "power4.out" 
      }
    );
  }, [text, delay]);

  const words = text.split(" ");
  return (
    <span ref={containerRef} style={{ display: "inline-block" }}>
      {words.map((word, idx) => (
        <span 
          key={idx} 
          style={{ 
            display: "inline-block", 
            overflow: "hidden", 
            verticalAlign: "bottom", 
            marginRight: "0.22em",
            paddingBottom: "0.08em"
          }}
        >
          <span 
            className="word-reveal-inner animated-gradient-text" 
            style={{ 
              display: "inline-block", 
              transform: "translateY(115%)",
              willChange: "transform"
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}




// 3D Parallax Floating App Mockup Component
// 3D Parallax Floating App Mockup Component
interface HeroAppMockupProps {
  studentProfile: any | null;
  studentStats: {
    sheetsCount: number;
    avgAccuracy: number;
    weakestTopic: string;
    weakestAccuracy: number;
  } | null;
}

function HeroAppMockup({ studentProfile, studentStats }: HeroAppMockupProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeView, setActiveView] = useState<"analytics" | "weaknesses" | "progress">("analytics");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const transformStyle = isHovered
    ? `rotateY(${coords.x * 24}deg) rotateX(${-coords.y * 24}deg) translateZ(10px)`
    : "rotateY(0deg) rotateX(0deg) translateZ(0px)";

  const avatarChar = studentProfile?.name ? studentProfile.name[0].toUpperCase() : "A";
  const displayName = studentProfile?.name ? studentProfile.name : "Aarav K.";
  const displayGradeBoard = studentProfile
    ? `${studentProfile.grade} • ${studentProfile.board}`
    : "Class 6 • CBSE";

  const sheetsPracticeCount = studentProfile
    ? (studentStats ? studentStats.sheetsCount : 0)
    : 18;
  const avgAccuracyPercent = studentProfile
    ? (studentStats ? `${studentStats.avgAccuracy}%` : "0%")
    : "88%";
  
  const masteryTopicName = studentProfile
    ? (studentStats?.weakestTopic ? `${studentStats.weakestTopic} Mastery` : "Practice Path")
    : "Decimals Mastery";
  
  const masteryProgressPercent = studentProfile
    ? (studentStats ? studentStats.weakestAccuracy : 72)
    : 72;

  return (
    <div
      style={{
        perspective: "1200px",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          width: "100%",
          background: "rgba(18, 18, 30, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(124, 58, 237, 0.08)",
          backdropFilter: "blur(16px)",
          transform: transformStyle,
          transition: isHovered ? "transform 0.05s ease-out" : "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
          transformStyle: "preserve-3d",
          cursor: "pointer"
        }}
      >
        {/* Mock Title / Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px", marginBottom: "14px", transform: "translateZ(20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold", color: "#fff" }}>
              {avatarChar}
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>{displayName}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>{displayGradeBoard}</div>
            </div>
          </div>
          {studentProfile ? (
            <span style={{ fontSize: "0.6rem", background: "rgba(16, 185, 129, 0.12)", color: "#34d399", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>Parent Mode</span>
          ) : (
            <span style={{ fontSize: "0.6rem", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>Demo Profile</span>
          )}
        </div>

        {/* Dashboard Tabs Selector */}
        <div 
          style={{ 
            display: "flex", 
            background: "rgba(10, 10, 15, 0.5)", 
            borderRadius: "20px", 
            padding: "3px", 
            marginBottom: "16px", 
            gap: "2px",
            border: "1px solid rgba(255,255,255,0.04)",
            transform: "translateZ(25px)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(["analytics", "weaknesses", "progress"] as const).map(view => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              style={{
                flex: 1,
                background: activeView === view ? "linear-gradient(135deg, var(--accent-purple) 0%, rgba(124,58,237,0.4) 100%)" : "transparent",
                border: "none",
                color: activeView === view ? "#fff" : "var(--text-secondary)",
                borderRadius: "18px",
                padding: "6px 0",
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "capitalize",
                cursor: "pointer",
                boxShadow: activeView === view ? "0 2px 10px rgba(124,58,237,0.25)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Tab 1: Analytics Content */}
        {activeView === "analytics" && (
          <div style={{ transform: "translateZ(30px)" }}>
            {/* Mock KPI Mini Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", margin: 0 }}>Sheets Practice</p>
                <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: "2px 0 0 0" }}>{sheetsPracticeCount}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", margin: 0 }}>Avg. Accuracy</p>
                <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-cyan)", margin: "2px 0 0 0" }}>{avgAccuracyPercent}</p>
              </div>
            </div>

            {/* Mock Analytics Mini SVG Curve */}
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 600 }}>Score History Curve</p>
              <svg viewBox="0 0 200 60" style={{ width: "100%", height: "auto", display: "block" }}>
                <path
                  d="M 10 45 Q 40 40 70 30 T 130 15 T 190 10"
                  fill="none"
                  stroke="url(#hero-gradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="190" cy="10" r="3" fill="var(--accent-cyan)" stroke="#fff" strokeWidth="1" />
                <defs>
                  <linearGradient id="hero-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-purple)" />
                    <stop offset="100%" stopColor="var(--accent-cyan)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Mock Learning Path Mastery Progress */}
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{masteryTopicName}</span>
                <span style={{ color: "var(--accent-purple)", fontWeight: "bold" }}>{masteryProgressPercent}%</span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${masteryProgressPercent}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))", borderRadius: "2px", boxShadow: "0 0 8px var(--accent-cyan-glow)", transition: "width 0.5s ease" }} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Weaknesses Heatmap Content */}
        {activeView === "weaknesses" && (
          <div style={{ transform: "translateZ(30px)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", fontWeight: 600 }}>Concept Diagnostic Heatmap</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Topic 1: Fractions */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "4px" }}>
                    <span style={{ color: "#f8fafc", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", background: "#ef4444", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #ef4444" }} className="pulse-dot" />
                      Fractions Math
                    </span>
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>42% (Critical)</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: "42%", height: "100%", background: "#ef4444", borderRadius: "2px" }} />
                  </div>
                  <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "4px" }}>Alert: High error rates in subtraction calculations</p>
                </div>

                {/* Topic 2: Decimals */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "4px" }}>
                    <span style={{ color: "#f8fafc", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", background: "#fbbf24", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #fbbf24" }} />
                      Decimals & Parts
                    </span>
                    <span style={{ color: "#fbbf24", fontWeight: "bold" }}>68% (Targeted)</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: "68%", height: "100%", background: "#fbbf24", borderRadius: "2px" }} />
                  </div>
                  <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "4px" }}>Suggest creating customized practice worksheets</p>
                </div>

                {/* Topic 3: Integers */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "4px" }}>
                    <span style={{ color: "#f8fafc", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", background: "#10b981", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #10b981" }} />
                      Integers Addition
                    </span>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>94% (Mastered)</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: "94%", height: "100%", background: "#10b981", borderRadius: "2px" }} />
                  </div>
                  <p style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "4px" }}>Concept locked. Dynamic auto-weight reduced</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Recent Worksheets Content */}
        {activeView === "progress" && (
          <div style={{ transform: "translateZ(30px)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", fontWeight: 600 }}>Worksheets Feed</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Worksheet 1 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.02)" }}>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>WS-102: Decimals Focus</p>
                    <p style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>Math • Class 6 • 10 questions</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.65rem", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>Graded 9/10</span>
                  </div>
                </div>

                {/* Worksheet 2 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.02)" }}>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>WS-101: Fractions Match</p>
                    <p style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>Math • Class 6 • 12 questions</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.65rem", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>Graded 7/10</span>
                  </div>
                </div>

                {/* Worksheet 3 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.02)" }}>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>WS-100: Math Diagnostics</p>
                    <p style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>Math • Class 6 • 15 questions</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.65rem", background: "rgba(124, 58, 237, 0.15)", color: "#c084fc", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold" }}>Pending Grader</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [studentStats, setStudentStats] = useState<{
    sheetsCount: number;
    avgAccuracy: number;
    weakestTopic: string;
    weakestAccuracy: number;
  } | null>(null);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "practice" | "features" | "perks" | "faq">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [scrollRatio, setScrollRatio] = useState(0);

  // Dynamic stats state (defaulting to premium placeholders)
  const [rawStats, setRawStats] = useState({
    worksheets: 12400,
    subjects: 6,
    gradeLevels: 10,
    avgAccuracy: 88
  });

  // Fetch real statistics from database on load
  useEffect(() => {
    fetch("/api/stats")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Stats request failed");
      })
      .then(data => {
        if (data) {
          setRawStats({
            worksheets: data.worksheets > 0 ? data.worksheets : 12400,
            subjects: data.subjects > 0 ? data.subjects : 6,
            gradeLevels: data.gradeLevels > 0 ? data.gradeLevels : 10,
            avgAccuracy: data.avgAccuracy > 0 ? data.avgAccuracy : 88
          });
        }
      })
      .catch(err => console.error("Error loading homepage stats:", err));
  }, []);

  // Animated counter values bound to rawStats
  const worksheetsCount = useAnimatedCounter(rawStats.worksheets, 2000, statsVisible);
  const subjectsCount = useAnimatedCounter(rawStats.subjects, 1200, statsVisible);
  const gradeLevels = useAnimatedCounter(rawStats.gradeLevels, 1000, statsVisible);
  const accuracyRate = useAnimatedCounter(rawStats.avgAccuracy, 1600, statsVisible);

  // Observe when stat section comes into view
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);




  // Sync profile ID on load
  useEffect(() => {
    const savedId = localStorage.getItem("sheetmate_profile_id");
    if (savedId) {
      setStudentProfileId(savedId);
      fetch(`/api/student/dashboard?id=${savedId}`)
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(data => {
          if (data && data.profile) {
            setStudentProfile(data.profile);

            // Calculate stats for the hero mockup
            const sheetsCount = data.worksheets ? data.worksheets.length : 0;
            let totalAcc = 0;
            let gradedCount = 0;
            data.worksheets?.forEach((ws: any) => {
              if (ws.score !== null && ws.totalMarks !== null && ws.totalMarks > 0) {
                totalAcc += (ws.score / ws.totalMarks) * 100;
                gradedCount++;
              }
            });
            const avgAccuracy = gradedCount > 0 ? Math.round(totalAcc / gradedCount) : 0;

            // Calculate weakest topic
            let weakestTopic = "";
            let weakestAccuracy = 0;
            if (data.weaknesses && data.weaknesses.length > 0) {
              const weak = data.weaknesses[0];
              weakestTopic = weak.topic || weak.subtopic || "";
              const errors = weak.errorCount || 0;
              const successes = weak.successCount || 0;
              const total = errors + successes;
              weakestAccuracy = total > 0 ? Math.max(5, Math.min(95, Math.round((successes / total) * 100))) : 40;
            } else {
              weakestTopic = "Practice Path";
              weakestAccuracy = 72;
            }

            setStudentStats({
              sheetsCount,
              avgAccuracy,
              weakestTopic,
              weakestAccuracy
            });
          }
        })
        .catch(err => console.error("Error loading profile:", err));
    }
  }, []);

  // Check for logout flag in localStorage on load
  useEffect(() => {
    const showToast = localStorage.getItem("sheetmate_show_logout_toast");
    if (showToast === "true") {
      setShowLogoutToast(true);
      localStorage.removeItem("sheetmate_show_logout_toast");
      // Auto-hide after 6 seconds
      const timer = setTimeout(() => {
        setShowLogoutToast(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Scroll Spy to sync active navbar tab dynamically
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      
      // Calculate scroll ratio
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? scrollPos / maxScroll : 0;
      setScrollRatio(ratio);
      
      // Update scrolled state for sticky navbar shrink
      if (scrollPos > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Highlight FAQ when scrolled to the very bottom of the page
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
      if (isAtBottom) {
        setActiveTab("faq");
        return;
      }

      if (scrollPos < 150) {
        setActiveTab("home");
        return;
      }

      const sections: ("practice" | "features" | "perks" | "faq")[] = ["practice", "features", "perks", "faq"];
      let currentSection: "home" | "practice" | "features" | "perks" | "faq" = "home";

      for (const sec of sections) {
        const el = document.getElementById(`${sec}-section`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.4 && rect.bottom >= window.innerHeight * 0.4) {
            currentSection = sec;
          }
        }
      }
      setActiveTab(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [studentProfileId]);

  // GSAP-powered ScrollTrigger reveals for sections and elements
  useEffect(() => {
    if (typeof window === "undefined") return;

    const elements = document.querySelectorAll(".scroll-reveal");
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      // Eagerly reveal all elements on mobile to prevent scroll triggers delay
      gsap.set(elements, { opacity: 1, y: 0, scale: 1, transition: "none" });
      return;
    }
    
    // Clear CSS transition so GSAP can take over smoothly
    gsap.set(elements, { transition: "none" });

    const triggers: any[] = [];
    const sections = ["practice-section", "features-section", "perks-section", "faq-section"];
    
    sections.forEach((secId) => {
      const section = document.getElementById(secId);
      if (!section) return;

      const secElements = section.querySelectorAll(".scroll-reveal");
      if (secElements.length === 0) return;

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        onEnter: () => {
          gsap.fromTo(
            secElements,
            { opacity: 0, y: 35, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              stagger: 0.12,
              ease: "power3.out",
              overwrite: "auto"
            }
          );
        },
        onLeaveBack: () => {
          gsap.set(secElements, { opacity: 0, y: 35, scale: 0.98 });
        }
      });
      triggers.push(st);
    });

    // Handle any loose scroll-reveal elements outside these sections
    elements.forEach((el) => {
      let parentHasSection = false;
      sections.forEach((secId) => {
        if (document.getElementById(secId)?.contains(el)) {
          parentHasSection = true;
        }
      });

      if (!parentHasSection) {
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          onEnter: () => {
            gsap.fromTo(
              el,
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                duration: 0.75,
                ease: "power2.out",
                overwrite: "auto"
              }
            );
          },
          onLeaveBack: () => {
            gsap.set(el, { opacity: 0, y: 30 });
          }
        });
        triggers.push(st);
      }
    });

    // Refresh ScrollTrigger positions
    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((st) => st.kill());
    };
  }, [studentProfileId]);

  // GSAP-powered Magnetic hover effect for CTA buttons and Navbar Links
  useEffect(() => {
    const targets = document.querySelectorAll(".magnetic-btn, .tubelight-link");
    const cleanups: (() => void)[] = [];

    targets.forEach((target) => {
      const el = target as HTMLElement;
      
      const onMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const isLink = el.classList.contains("tubelight-link");
        const factor = isLink ? 0.35 : 0.25;
        const scaleVal = isLink ? 1.0 : 1.04;

        // Button flashlight coordinates tracking
        const btnX = e.clientX - rect.left;
        const btnY = e.clientY - rect.top;
        el.style.setProperty("--btn-x", `${btnX}px`);
        el.style.setProperty("--btn-y", `${btnY}px`);

        gsap.to(el, {
          x: x * factor,
          y: y * factor,
          scale: scaleVal,
          duration: 0.3,
          ease: "power2.out"
        });
      };

      const onMouseLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.45)" // Elegant bouncy snapback
        });
      };

      el.addEventListener("mousemove", onMouseMove);
      el.addEventListener("mouseleave", onMouseLeave);

      cleanups.push(() => {
        el.removeEventListener("mousemove", onMouseMove);
        el.removeEventListener("mouseleave", onMouseLeave);
      });
    });

    return () => {
      cleanups.forEach((cb) => cb());
    };
  }, [studentProfileId]);

  // GSAP-powered 3D Tilt & spotlight coordinate tracking for cards
  useEffect(() => {
    const cards = document.querySelectorAll(".tilt-card, .spotlight-card");
    const cleanups: (() => void)[] = [];

    cards.forEach((card) => {
      const el = card as HTMLElement;
      
      const onMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Set spotlight coordinates
        el.style.setProperty("--mouse-x", `${x}px`);
        el.style.setProperty("--mouse-y", `${y}px`);

        // Apply 3D tilt if it has the tilt-card class
        if (el.classList.contains("tilt-card")) {
          const centerX = x - rect.width / 2;
          const centerY = y - rect.height / 2;
          const rotX = -(centerY / (rect.height / 2)) * 8; // Max 8 deg tilt
          const rotY = (centerX / (rect.width / 2)) * 8;

          gsap.to(el, {
            rotateX: rotX,
            rotateY: rotY,
            scale: 1.015,
            duration: 0.35,
            ease: "power2.out",
            transformPerspective: 1000
          });
        }
      };

      const onMouseLeave = () => {
        if (el.classList.contains("tilt-card")) {
          gsap.to(el, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out"
          });
        }
      };

      el.addEventListener("mousemove", onMouseMove);
      el.addEventListener("mouseleave", onMouseLeave);

      cleanups.push(() => {
        el.removeEventListener("mousemove", onMouseMove);
        el.removeEventListener("mouseleave", onMouseLeave);
      });
    });

    return () => {
      cleanups.forEach((cb) => cb());
    };
  }, [studentProfileId]);

  const handleLogOut = () => {
    localStorage.removeItem("sheetmate_profile_id");
    setStudentProfileId(null);
    setStudentProfile(null);
    setStudentStats(null);
    setShowLogoutToast(true);
    // Auto-hide after 6 seconds
    setTimeout(() => {
      setShowLogoutToast(false);
    }, 6000);
  };
  
  // Selection states synced from the Wizard to the Preview paper
  const [selections, setSelections] = useState({
    board: "CBSE",
    grade: "Class 6",
    subject: "SCIENCE",
    topicNames: ["Select Chapters"] as string[],
    difficulty: "MEDIUM"
  });

  const handleSelectionChange = (newSelections: typeof selections) => {
    setSelections(newSelections);
  };

  const handleGenerationSuccess = (worksheetId: string) => {
    // Route to the print-preview & grader workspace for this worksheet
    router.push(`/worksheets/${worksheetId}`);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <main style={{ minHeight: "100vh", position: "relative" }} className="responsive-container">
      {/* 3D WebGL Floating Background */}
      <ThreeBackground />
      {/* Premium Fading Grid Overlay */}
      <div className="grid-bg-overlay" />

      {/* Ambient Aurora Light Glows */}
      <div style={{
        position: "absolute",
        top: "10%",
        right: "10%",
        width: "350px",
        height: "350px",
        borderRadius: "50%",
        background: `radial-gradient(circle, hsla(${260 + scrollRatio * 100}, 85%, 60%, 0.08) 0%, transparent 80%)`,
        filter: "blur(140px)",
        pointerEvents: "none",
        zIndex: -3,
        transition: "background 0.3s ease"
      }} />
      <div style={{
        position: "absolute",
        top: "40%",
        left: "5%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: `radial-gradient(circle, hsla(${190 - scrollRatio * 90}, 85%, 60%, 0.08) 0%, transparent 80%)`,
        filter: "blur(150px)",
        pointerEvents: "none",
        zIndex: -3,
        transition: "background 0.3s ease"
      }} />

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @media (max-width: 480px) {
          .mockup-scale-wrapper {
            --scale-mockup: 0.85;
          }
        }
        @media (max-width: 380px) {
          .mockup-scale-wrapper {
            --scale-mockup: 0.72;
          }
        }
      `}</style>

      {/* Tubelight Floating Glassmorphic Navbar */}
      <nav className={`tubelight-nav ${scrolled ? "scrolled" : ""} ${mobileMenuOpen ? "open" : ""}`}>
        <div className="tubelight-brand" onClick={() => router.push("/")}>
          <div className="tubelight-brand-logo" />
          <span className="tubelight-brand-text">
            Sheet<span style={{ color: "var(--accent-purple)" }}>Mate</span>
          </span>
        </div>
        
        <div className="tubelight-links-group">
          <span
            className={`tubelight-link ${activeTab === "home" ? "active" : ""}`}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setActiveTab("home");
            }}
          >
            Home
          </span>
          <span
            className={`tubelight-link ${activeTab === "practice" ? "active" : ""}`}
            onClick={() => {
              const el = document.getElementById("practice-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              setActiveTab("practice");
            }}
          >
            Practice
          </span>
          <span
            className={`tubelight-link ${activeTab === "features" ? "active" : ""}`}
            onClick={() => {
              const el = document.getElementById("features-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              setActiveTab("features");
            }}
          >
            Features
          </span>
          {!studentProfileId && (
            <span
              className={`tubelight-link ${activeTab === "perks" ? "active" : ""}`}
              onClick={() => {
                const el = document.getElementById("perks-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                setActiveTab("perks");
              }}
            >
              Perks
            </span>
          )}
          {studentProfileId && (
            <span
              className="tubelight-link"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </span>
          )}
          <span
            className={`tubelight-link ${activeTab === "faq" ? "active" : ""}`}
            onClick={() => {
              const el = document.getElementById("faq-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              setActiveTab("faq");
            }}
          >
            FAQ
          </span>
        </div>

        <div className="tubelight-actions">
          {studentProfileId ? (
            <>
              {/* Profile Avatar Chip */}
              <div 
                onClick={() => router.push("/dashboard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  transition: "var(--transition-smooth)"
                }}
              >
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "#fff"
                }}>
                  {studentProfile?.name ? studentProfile.name[0].toUpperCase() : "S"}
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }} className="no-print">
                  {studentProfile?.name || "Student"}
                </span>
                <span style={{ width: "6px", height: "6px", background: "#10b981", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #10b981" }} className="pulse-dot" />
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 14px", fontSize: "0.78rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#fca5a5", borderRadius: "20px" }}
                onClick={handleLogOut}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 14px", fontSize: "0.78rem", borderRadius: "20px" }}
                onClick={() => router.push("/dashboard")}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "0.78rem", borderRadius: "20px", boxShadow: "none" }}
                onClick={() => router.push("/dashboard?mode=signup")}
              >
                Register
              </button>
            </>
          )}
        </div>

        {/* Hamburger Menu Toggle for Mobile */}
        <button 
          type="button"
          className={`tubelight-hamburger ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile Drawer */}
        <div className="tubelight-mobile-drawer">
          <span
            className={`tubelight-mobile-link ${activeTab === "home" ? "active" : ""}`}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setActiveTab("home");
              setMobileMenuOpen(false);
            }}
          >
            Home
          </span>
          <span
            className={`tubelight-mobile-link ${activeTab === "practice" ? "active" : ""}`}
            onClick={() => {
              const el = document.getElementById("practice-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              setActiveTab("practice");
              setMobileMenuOpen(false);
            }}
          >
            Practice
          </span>
          <span
            className={`tubelight-mobile-link ${activeTab === "features" ? "active" : ""}`}
            onClick={() => {
              const el = document.getElementById("features-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              setActiveTab("features");
              setMobileMenuOpen(false);
            }}
          >
            Features
          </span>
          {!studentProfileId && (
            <span
              className={`tubelight-mobile-link ${activeTab === "perks" ? "active" : ""}`}
              onClick={() => {
                const el = document.getElementById("perks-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                setActiveTab("perks");
                setMobileMenuOpen(false);
              }}
            >
              Perks
            </span>
          )}
          {studentProfileId && (
            <span
              className="tubelight-mobile-link"
              onClick={() => {
                router.push("/dashboard");
                setMobileMenuOpen(false);
              }}
            >
              Dashboard
            </span>
          )}
          <span
            className={`tubelight-mobile-link ${activeTab === "faq" ? "active" : ""}`}
            onClick={() => {
              const el = document.getElementById("faq-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              setActiveTab("faq");
              setMobileMenuOpen(false);
            }}
          >
            FAQ
          </span>
          
          <div className="tubelight-mobile-actions">
            {studentProfileId ? (
              <>
                <div 
                  onClick={() => {
                    router.push("/dashboard");
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "rgba(124, 58, 237, 0.12)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    color: "#fff",
                    fontWeight: 700
                  }}
                >
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#fff"
                  }}>
                    {studentProfile?.name ? studentProfile.name[0].toUpperCase() : "S"}
                  </div>
                  <span>{studentProfile?.name || "Student"}</span>
                  <span style={{ width: "6px", height: "6px", background: "#10b981", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #10b981" }} className="pulse-dot" />
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#fca5a5", borderRadius: "20px" }}
                  onClick={() => {
                    handleLogOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderRadius: "20px" }}
                  onClick={() => {
                    router.push("/dashboard");
                    setMobileMenuOpen(false);
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderRadius: "20px", boxShadow: "none" }}
                  onClick={() => {
                    router.push("/dashboard?mode=signup");
                    setMobileMenuOpen(false);
                  }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 1. Hero Section (Home fold) */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          minHeight: "75vh",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "50px",
          alignItems: "center",
          paddingBottom: "40px",
          paddingTop: "40px"
        }}
      >
        {/* Hero Left Column: Copy & Call to Action */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            {studentProfile ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(16, 185, 129, 0.12)", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                <span style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 8px #10b981" }} className="pulse-dot" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Active Profile: {studentProfile.name} ({studentProfile.grade})
                </span>
              </div>
            ) : (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--accent-cyan)",
                  background: "rgba(6, 182, 212, 0.12)",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  border: "1px solid rgba(6, 182, 212, 0.2)"
                }}
              >
                Guest Workspace (Limited Mode)
              </span>
            )}
            <h1
              style={{
                fontSize: "clamp(2.6rem, 5.8vw, 3.8rem)",
                lineHeight: 1.05,
                marginTop: "16px",
                marginBottom: "16px",
                color: "#fff"
              }}
              className="display-typography"
            >
              <SplitTextReveal text="Tailored worksheets. Aligned to school syllabus." delay={0.15} />
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "520px", lineHeight: 1.6 }}>
              {studentProfile
                ? "Your adaptive learning workspace is ready. Practice sheets are custom-weighted to target your conceptual weaknesses."
                : "Create standard curriculum-aligned printable worksheets (Class LKG - Class 8) in seconds. Lock parent analytics & grade sheets via OTP."}
            </p>
          </div>
 
          <div>
            <div className="border-beam-wrapper magnetic-btn" style={{ borderRadius: "8px" }}>
              <button
                type="button"
                className="border-beam-inner"
                style={{
                  padding: "15px 35px",
                  fontSize: "1.05rem",
                  display: "inline-flex",
                  gap: "10px",
                  alignItems: "center",
                  background: "rgba(10, 10, 15, 0.95)",
                  color: "#fff",
                  border: "none",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                onClick={() => {
                  const el = document.getElementById("practice-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  setActiveTab("practice");
                }}
              >
                <span>Create Practice Sheet</span>
                <span>⚡</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hero Right Column: 3D App UI Mockup */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }} className="hide-mobile">
          <HeroAppMockup studentProfile={studentProfile} studentStats={studentStats} />
        </div>
      </section>

      {/* 21st.dev Infinite Scrolling Board & Syllabus Trust Marquee */}
      <section style={{ width: "100%", overflow: "hidden", margin: "20px 0 60px 0" }}>
        <div className="marquee-container">
          <div className="marquee-content">
            {[
              "NCERT Curriculum Aligned",
              "CBSE Syllabus Integrated",
              "ICSE & SCERT Coverage",
              "Class LKG - Class 8 Support",
              "Adaptive AI Question Bank",
              "Interactive Parent Grader Logs",
              "Mathematics Practice Sheets",
              "Science Lab Core Concepts",
              "EVS & Social Science Blocks",
              "Hindi Rimjhim & Vasant Chapters",
              "English Grammatical Progress"
            ].map((text, idx) => (
              <span key={idx} style={{ 
                fontSize: "0.8rem", 
                fontWeight: 700, 
                color: "var(--text-secondary)", 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "10px",
                background: "rgba(255, 255, 255, 0.02)",
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid rgba(255, 255, 255, 0.04)"
              }}>
                <span style={{ width: "6px", height: "6px", background: "var(--accent-purple)", borderRadius: "50%" }}></span>
                {text}
              </span>
            ))}
          </div>
          <div className="marquee-content">
            {[
              "NCERT Curriculum Aligned",
              "CBSE Syllabus Integrated",
              "ICSE & SCERT Coverage",
              "Class LKG - Class 8 Support",
              "Adaptive AI Question Bank",
              "Interactive Parent Grader Logs",
              "Mathematics Practice Sheets",
              "Science Lab Core Concepts",
              "EVS & Social Science Blocks",
              "Hindi Rimjhim & Vasant Chapters",
              "English Grammatical Progress"
            ].map((text, idx) => (
              <span key={`dup-${idx}`} style={{ 
                fontSize: "0.8rem", 
                fontWeight: 700, 
                color: "var(--text-secondary)", 
                display: "inline-flex", 
                alignItems: "center", 
                gap: "10px",
                background: "rgba(255, 255, 255, 0.02)",
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid rgba(255, 255, 255, 0.04)"
              }}>
                <span style={{ width: "6px", height: "6px", background: "var(--accent-purple)", borderRadius: "50%" }}></span>
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Worksheet Generator Section */}
      <section
        id="practice-section"
        style={{
          maxWidth: "1200px",
          margin: "40px auto 80px auto",
          padding: "60px 20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--accent-cyan)",
              background: "rgba(6, 182, 212, 0.12)",
              padding: "6px 12px",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "1px solid rgba(6, 182, 212, 0.2)"
            }}
          >
            Practice Workspace
          </span>
          <h2 className="gradient-text" style={{ fontSize: "2.1rem", marginTop: "12px", marginBottom: "12px" }}>
            Generate Customized Worksheet
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
            Select your syllabus details below. SheetMate AI will construct a targeted practice sheet instantly.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "50px",
            alignItems: "flex-start"
          }}
        >
          {/* Left Column: Generator Wizard */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <GeneratorWizard
              studentProfileId={studentProfileId}
              onSelectionChange={handleSelectionChange}
              onGenerationSuccess={handleGenerationSuccess}
            />
          </div>

          {/* Right Column: Live interactive 3D paper mockup */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} className="hide-mobile">
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Interactive Live Preview
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Hover to tilt sheet &amp; syncs with wizard selections
              </p>
            </div>
            <div style={{ transform: "scale(var(--scale-mockup, 1))", transformOrigin: "center", transition: "transform 0.3s ease", width: "100%", display: "flex", justifyContent: "center" }} className="mockup-scale-wrapper">
              <PreviewPaper
                board={selections.board}
                grade={selections.grade}
                subject={selections.subject}
                topicName={selections.topicNames.length > 1 ? `${selections.topicNames.length} Chapters` : (selections.topicNames[0] || "Select Chapters")}
                difficulty={selections.difficulty}
                studentName={studentProfile?.name}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── ANIMATED STAT COUNTER SECTION ── */}
      <section
        ref={statsRef}
        style={{
          maxWidth: "1200px",
          margin: "0 auto 80px auto",
          padding: "0 20px"
        }}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px"
        }}>
          {[
            { value: worksheetsCount, suffix: "+", label: "Worksheets Generated" },
            { value: subjectsCount, suffix: "", label: "NCERT Subjects Covered" },
            { value: gradeLevels, suffix: "", label: "Grade Levels Supported" },
            { value: accuracyRate, suffix: "%", label: "Avg. Grading Accuracy" },
          ].map((stat, i) => (
            <div key={i} className="stat-counter-card scroll-reveal">
              <div className="stat-counter-value">
                {stat.value.toLocaleString()}{stat.suffix}
              </div>
              <div className="stat-counter-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features & Practice Loop Section */}
      <section
        id="features-section"
        style={{
          maxWidth: "1200px",
          margin: "0 auto 60px auto",
          padding: "0 20px",
          position: "relative"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--accent-purple)",
              background: "rgba(124, 58, 237, 0.12)",
              padding: "6px 12px",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "1px solid rgba(124, 58, 237, 0.2)"
            }}
          >
            How it works
          </span>
          <h2 className="gradient-text" style={{ fontSize: "2.1rem", marginTop: "12px", marginBottom: "12px" }}>
            The SheetMate Personalization Loop
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
            Three core steps that build a tailored conceptual learning path for your child.
          </p>
        </div>

        <div className="bento-grid">
          {/* Bento Card 1: Adaptive AI Engine */}
          <div className="bento-card spotlight-card scroll-reveal tilt-card" onMouseMove={handleMouseMove} style={{ border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div>
              <div className="bento-icon-wrap" style={{ background: "rgba(124, 58, 237, 0.12)", border: "1px solid rgba(124, 58, 237, 0.3)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#a78bfa"/>
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "8px", color: "#fff" }}>Adaptive Learning Engine</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6" }}>
                SheetMate tracks child practice errors and builds a custom syllabus focus map, targeting weak topics in subsequent sheet generations.
              </p>
            </div>
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #a78bfa", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>AI-Powered Weakness Detection</span>
            </div>
          </div>

          {/* Bento Card 2: Instant PDF Scanner */}
          <div className="bento-card spotlight-card scroll-reveal tilt-card" onMouseMove={handleMouseMove} style={{ border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div>
              <div className="bento-icon-wrap" style={{ background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z" fill="#22d3ee"/>
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "8px", color: "#fff" }}>Instant PDF Scanner</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6" }}>
                Upload solved worksheet photos or PDFs. SheetMate extracts written answers and grades the full sheet instantly.
              </p>
            </div>
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 6px #22d3ee", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>OCR + AI Grader in Seconds</span>
            </div>
          </div>

          {/* Bento Card 3: Syllabus Aligned */}
          <div className="bento-card spotlight-card scroll-reveal tilt-card" onMouseMove={handleMouseMove} style={{ border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div>
              <div className="bento-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#34d399"/>
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "8px", color: "#fff" }}>Syllabus Aligned</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6" }}>
                Practice questions align dynamically with CBSE, NCERT, and State Board curriculum guidelines.
              </p>
            </div>
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>CBSE / NCERT / State Board</span>
            </div>
          </div>

          {/* Bento Card 4: Parent Portal */}
          <div className="bento-card spotlight-card scroll-reveal tilt-card" onMouseMove={handleMouseMove} style={{ border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div>
              <div className="bento-icon-wrap" style={{ background: "rgba(124, 58, 237, 0.12)", border: "1px solid rgba(124, 58, 237, 0.3)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#a78bfa"/>
                </svg>
              </div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "8px", color: "#fff" }}>Parent Portal</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6" }}>
                Track subject-wise grades, accuracy trends, and target conceptual weaknesses with automated alerts.
              </p>
            </div>
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #a78bfa", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>OTP-Secured Analytics Dashboard</span>
            </div>
          </div>
        </div>
      </section>

      {/* Guest vs. Profile Perks Comparison Section */}
      {!studentProfileId && (
        <section
          id="perks-section"
          style={{
            maxWidth: "1200px",
            margin: "40px auto 80px auto",
            padding: "0 20px",
            position: "relative"
          }}
        >
          <div className="glass-card" style={{ padding: "40px 30px", border: "1px solid rgba(124, 58, 237, 0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--accent-cyan)",
                  background: "rgba(6, 182, 212, 0.12)",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  border: "1px solid rgba(6, 182, 212, 0.2)"
                }}
              >
                Why create a profile?
              </span>
              <h2 className="gradient-text" style={{ fontSize: "2rem", marginTop: "12px", marginBottom: "12px" }}>
                Unlock Adaptive Learning & Custom Reports
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
                Registered profiles enable personalization that adapts worksheets to your child's specific weaknesses.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
                marginBottom: "40px"
              }}
            >
              {/* Guest Practice Perks */}
              <div
                className="scroll-reveal"
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid rgba(255, 255, 255, 0.03)",
                  borderRadius: "var(--radius-md)",
                  padding: "30px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <h3 style={{ color: "var(--text-secondary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1rem" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-muted)" }}></span>
                  Guest Practice (No Login)
                </h3>
                
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#ef4444" }}>✕</span>
                    <span><strong>Limited Practice:</strong> Max 4 worksheets per 24 hours (tracked by IP address).</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#ef4444" }}>✕</span>
                    <span><strong>Generic Content:</strong> Worksheets do not adapt to mistakes.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#ef4444" }}>✕</span>
                    <span><strong>No Analytics:</strong> Historical grades and weak topics are not logged.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#ef4444" }}>✕</span>
                    <span><strong>Print Only:</strong> Grading must be done offline using the printed key.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#ef4444" }}>✕</span>
                    <span><strong>Manual Configuration:</strong> Re-select grade and board on every generate run.</span>
                  </li>
                </ul>
              </div>

              {/* Registered Profile Perks */}
              <div
                className="scroll-reveal"
                style={{
                  background: "rgba(124, 58, 237, 0.03)",
                  border: "1px solid rgba(124, 58, 237, 0.15)",
                  borderRadius: "var(--radius-md)",
                  padding: "30px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <h3 style={{ color: "#a78bfa", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1rem" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-purple)" }}></span>
                  Student Profile (Free during Beta)
                </h3>
                
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                    <span><strong>Unlimited Practice:</strong> Generate infinite worksheets with no rate limits.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                    <span><strong>Adaptive Questions:</strong> 60% of new sheets target previous mistakes automatically.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                    <span><strong>Mistake Logs & Heatmap:</strong> Detailed breakdown of concept strengths and weaknesses.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                    <span><strong>Interactive Parent Grader:</strong> Mark questions correct/incorrect on-screen inside dashboard.</span>
                  </li>
                  <li style={{ display: "flex", gap: "10px", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                    <span><strong>1-Click Workspace:</strong> Instantly prepopulates details. Quick practice cycles.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AI Help Agent Chatbot */}
      <ChatAgent />

      {/* ── FAQ SECTION ── */}
      <section
        id="faq-section"
        style={{
          maxWidth: "800px",
          margin: "0 auto 100px auto",
          padding: "0 20px"
        }}
      >
        <h2 className="faq-section-title gradient-text scroll-reveal">Frequently Asked Questions</h2>
        <p className="faq-section-subtitle scroll-reveal">Got questions? We've got answers.</p>

        <div className="faq-container">
          {[
            {
              q: "What is SheetMate and who is it for?",
              a: "SheetMate is an AI-powered worksheet generator specifically aligned with the Indian NCERT (CBSE) syllabus for LKG, UKG, and Classes 1 to 8. It's designed for parents and teachers who want to generate personalized, curriculum-accurate math, science, and English practice papers."
            },
            {
              q: "How does the AI personalize worksheets for my child?",
              a: "When you create a student profile, SheetMate automatically tracks your child's scoring trends and concept errors. For every new worksheet generated, the system intelligently adapts up to 60% of the questions to target their specific conceptual weaknesses, reinforcing learning where they need it most."
            },
            {
              q: "Is it really free during the Beta phase?",
              a: "Yes! SheetMate is completely free to use during our Beta period. You can create a profile, generate unlimited worksheets, access dashboard insights, and grade student papers online without any subscription fees or limits."
            },
            {
              q: "How does the interactive grading work?",
              a: "No offline answer key scanning needed! You can open a student's generated worksheet on any device (phone, tablet, or PC) and click correct/incorrect directly on the digital checklist. The student's stats, weaknesses list, and history update immediately."
            },
            {
              q: "Can I use SheetMate as a guest without signing up?",
              a: "Absolutely. You can try our generator as a guest right from the landing page. However, guest generation is limited to 4 worksheets per day, and your child's progress, adaptive learning features, and dashboard stats will not be saved."
            }
          ].map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className={`faq-card scroll-reveal ${isOpen ? "open" : ""}`}
                onClick={() => setOpenFaqIndex(isOpen ? null : index)}
              >
                <button 
                  type="button" 
                  className="faq-trigger"
                  aria-expanded={isOpen}
                >
                  <span className="faq-question">{item.q}</span>
                  <svg
                    className="faq-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className={`faq-content-wrapper ${isOpen ? "open" : ""}`}>
                  <div className="faq-content-inner">
                    <p className="faq-answer">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── GLOW CTA SECTION ── */}
      {!studentProfileId && (
        <section style={{ maxWidth: "1200px", margin: "0 auto 80px auto", padding: "0 20px" }}>
          <div className="glow-cta-section">
            <div style={{ position: "relative", zIndex: 1 }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--accent-purple)",
                  background: "rgba(124, 58, 237, 0.12)",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  display: "inline-block",
                  marginBottom: "24px"
                }}
              >
                🎓 Free during Beta
              </span>
              <h2
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 3rem)",
                  fontWeight: 900,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.04em",
                  marginBottom: "16px",
                  lineHeight: 1.1
                }}
                className="shimmer-headline"
              >
                Start learning smarter today.
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "520px", margin: "0 auto 36px auto", lineHeight: 1.65 }}>
                Join thousands of students using SheetMate to practice, track, and master their school curriculum.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <div className="border-beam-wrapper magnetic-btn" style={{ borderRadius: "10px" }}>
                  <button
                    type="button"
                    className="border-beam-inner"
                    style={{
                      padding: "14px 32px",
                      fontSize: "1rem",
                      background: "rgba(10, 10, 15, 0.95)",
                      color: "#fff",
                      border: "none",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                    onClick={() => router.push("/dashboard?mode=signup")}
                  >
                    <span>Create Free Profile</span>
                    <span>→</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-secondary magnetic-btn"
                  style={{ padding: "14px 28px", fontSize: "1rem", borderRadius: "10px" }}
                  onClick={() => {
                    const el = document.getElementById("practice-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Try as Guest
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FLOATING STREAK ORBIT WIDGET ── */}
      {studentProfileId && (
        <div 
          className="streak-orbit-widget hide-mobile"
          style={{
            position: "fixed",
            bottom: "105px",
            right: "24px",
            zIndex: 99,
            cursor: "pointer"
          }}
          onClick={() => router.push("/dashboard")}
        >
          <div 
            style={{
              position: "relative",
              width: "60px",
              height: "60px",
              background: "rgba(10, 10, 15, 0.85)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(124, 58, 237, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(16px)"
            }}
          >
            {/* Circular SVG Progress Ring */}
            <svg 
              width="60" 
              height="60" 
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: "rotate(-90deg)"
              }}
            >
              <circle 
                cx="30" 
                cy="30" 
                r="27" 
                stroke="rgba(255, 255, 255, 0.05)" 
                strokeWidth="2.5" 
                fill="transparent" 
              />
              <circle 
                cx="30" 
                cy="30" 
                r="27" 
                stroke="url(#streakGradient)" 
                strokeWidth="2.5" 
                fill="transparent" 
                strokeDasharray="170"
                strokeDashoffset={170 - (170 * Math.min(1, (studentStats?.sheetsCount || 0) / 5))}
                style={{
                  transition: "stroke-dashoffset 0.8s ease-out"
                }}
              />
              <defs>
                <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-purple)" />
                  <stop offset="100%" stopColor="var(--accent-cyan)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Streak flame details */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
              <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>🔥</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                {studentStats?.sheetsCount || 0}
              </span>
            </div>
            
            {/* Tooltip on hover */}
            <div 
              className="streak-tooltip"
              style={{
                position: "absolute",
                right: "70px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(10, 10, 15, 0.95)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "0.72rem",
                color: "#fff",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                opacity: 0,
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.5)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
                zIndex: 100
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: "var(--accent-cyan)" }}>
                {studentStats?.sheetsCount ? `${studentStats.sheetsCount}-Worksheet streak!` : "Start practicing!"}
              </p>
              <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)" }}>
                Goal: Complete 5 sheets to fill progress.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Landing footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "40px 0",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          maxWidth: "1200px",
          margin: "0 auto"
        }}
      >
        <p>&copy; {new Date().getFullYear()} SheetMate (sheetmate.in). All rights reserved. English-medium MVP v1.0.0.</p>
      </footer>
    </main>
  );
}



