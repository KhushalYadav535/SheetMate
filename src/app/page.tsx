// src/app/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThreeBackground from "@/components/ThreeBackground";
import PreviewPaper from "@/components/PreviewPaper";
import GeneratorWizard from "@/components/GeneratorWizard";
import ChatAgent from "@/components/ChatAgent";

export default function HomePage() {
  const router = useRouter();
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "practice" | "features" | "perks">("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      if (scrollPos < 150) {
        setActiveTab("home");
        return;
      }

      const sections: ("practice" | "features" | "perks")[] = ["practice", "features", "perks"];
      let currentSection: "home" | "practice" | "features" | "perks" = "home";

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

  // Scroll Reveal elements trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [studentProfileId]);

  // Magnetic hover effect for CTA buttons
  useEffect(() => {
    const btns = document.querySelectorAll(".magnetic-btn");
    const cleanups: (() => void)[] = [];

    btns.forEach((btn) => {
      const el = btn as HTMLElement;
      const onMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px) scale(1.03)`;
        el.style.transition = "transform 0.05s ease-out";
      };

      const onMouseLeave = () => {
        el.style.transform = "";
        el.style.transition = "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)";
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
      {/* Tubelight Floating Glassmorphic Navbar */}
      <nav className={`tubelight-nav ${mobileMenuOpen ? "open" : ""}`}>
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
                marginBottom: "16px"
              }}
              className="gradient-text display-typography"
            >
              Tailored worksheets. Aligned to school syllabus.
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "520px", lineHeight: 1.6 }}>
              {studentProfile
                ? "Your adaptive learning workspace is ready. Practice sheets are custom-weighted to target your conceptual weaknesses."
                : "Create standard curriculum-aligned printable worksheets (Class LKG - Class 8) in seconds. Lock parent analytics & grade sheets via OTP."}
            </p>
          </div>
 
          <div>
            <button
              type="button"
              className="btn-primary magnetic-btn"
              style={{ padding: "16px 36px", fontSize: "1.05rem", display: "inline-flex", gap: "10px", alignItems: "center" }}
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

        {/* Hero Right Column: Graphic badge cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px", display: "flex", gap: "18px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "1.5rem", background: "rgba(124, 58, 237, 0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(124, 58, 237, 0.2)" }}>🎒</div>
            <div>
              <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: 700 }}>LKG to Class 8 Syllabus</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>Aligned with latest NCERT patterns and textbooks.</p>
            </div>
          </div>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px", display: "flex", gap: "18px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "1.5rem", background: "rgba(6, 182, 212, 0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(6, 182, 212, 0.2)" }}>🎯</div>
            <div>
              <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: 700 }}>Adaptive Learning Paths</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>60% of questions auto-target previously missed concepts.</p>
            </div>
          </div>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px", display: "flex", gap: "18px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "1.5rem", background: "rgba(16, 185, 129, 0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>📊</div>
            <div>
              <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: 700 }}>Interactive Parent Dashboard</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>Grade worksheets on-screen & follow detailed progress charts.</p>
            </div>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "30px"
          }}
        >
          {/* Feature 1 */}
          <div className="glass-card spotlight-card scroll-reveal" onMouseMove={handleMouseMove} style={{ padding: "30px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div style={{ width: "40px", height: "40px", background: "rgba(124, 58, 237, 0.1)", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px", border: "1px solid rgba(124, 58, 237, 0.3)" }}>
              <span style={{ color: "#a78bfa", fontWeight: "bold" }}>01</span>
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>1. Curated AI Generation</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
              Worksheets align directly with school boards and syllabus guidelines across Grades LKG-Class 8. Generates high-quality exam structures and parent answer keys in seconds.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card spotlight-card scroll-reveal" onMouseMove={handleMouseMove} style={{ padding: "30px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
            <div style={{ width: "40px", height: "40px", background: "rgba(6, 182, 212, 0.1)", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
              <span style={{ color: "#22d3ee", fontWeight: "bold" }}>02</span>
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>2. Parent Grader Workspace</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
              Unlock parent mode with a secure 4-digit PIN. Instead of scoring by hand, mark questions right or wrong on our interactive screen to immediately submit grading metrics.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card spotlight-card scroll-reveal" onMouseMove={handleMouseMove} style={{ padding: "30px", border: "1px solid rgba(124, 58, 237, 0.03)" }}>
            <div style={{ width: "40px", height: "40px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <span style={{ color: "#34d399", fontWeight: "bold" }}>03</span>
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>3. Weakness Target Weighting</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
              Our personalization engine tracks concept logs. Future sheets are automatically weighted to dedicate 60% of questions targeting topics they struggled with previously.
            </p>
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

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "16px 36px" }}
                onClick={() => router.push("/dashboard?mode=signup")}
              >
                Create Free Profile (Beta)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* AI Help Agent Chatbot */}
      <ChatAgent />

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



