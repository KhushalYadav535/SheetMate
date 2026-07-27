// src/components/GeneratorWizard.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { CURRICULUM_DATA, Subject } from "@/lib/curriculumData";

interface GeneratorWizardProps {
  studentProfileId?: string | null;
  onSelectionChange: (selections: {
    board: string;
    grade: string;
    subject: string;
    topicNames: string[];
    difficulty: string;
  }) => void;
  onGenerationSuccess: (worksheetId: string, worksheetData: any) => void;
}


const GRADES = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
const SUBJECTS: { id: Subject; name: string }[] = [
  { id: "MATH", name: "Mathematics" },
  { id: "SCIENCE", name: "Science" },
  { id: "ENGLISH", name: "English" },
  { id: "EVS", name: "EVS" },
  { id: "HINDI", name: "Hindi" },
  { id: "SST", name: "Social Science" }
];

export default function GeneratorWizard({
  studentProfileId,
  onSelectionChange,
  onGenerationSuccess
}: GeneratorWizardProps) {
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState("Class 6");
  const [subject, setSubject] = useState<Subject>("SCIENCE");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  
  // Custom generation configurations
  const [questionFormat, setQuestionFormat] = useState<"MCQ" | "SHORT" | "LONG" | "MIXED">("MIXED");
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalMsg, setLimitModalMsg] = useState("");
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UX states for loading profiles and progress indicator
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [progressMsg, setProgressMsg] = useState("Consulting syllabus guidelines...");
  const [progressPercent, setProgressPercent] = useState(10);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Force includeAnswerKey to false for guest users
  useEffect(() => {
    if (!studentProfileId) {
      setIncludeAnswerKey(false);
    } else {
      setIncludeAnswerKey(true);
    }
  }, [studentProfileId]);

  // Auto-prefill grade and jump to step 2 if a student profile is active
  useEffect(() => {
    const savedId = localStorage.getItem("pracup_profile_id");
    if (!savedId) {
      setStep(1);
      setLoadingProfile(false);
      return;
    }

    async function loadActiveProfile() {
      try {
        setLoadingProfile(true);
        const res = await fetch(`/api/student/dashboard?id=${savedId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setGrade(data.profile.grade);
            setStep(2); // Jump straight to Subject & Chapter
          }
        }
      } catch (err) {
        console.error("Failed to prefill wizard details:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadActiveProfile();
  }, [studentProfileId]);

  // Progress message cycler for worksheet generation
  useEffect(() => {
    if (!loading) {
      setProgressPercent(10);
      setProgressMsg("Consulting syllabus guidelines...");
      return;
    }
    
    const msgs = [
      { text: "Consulting syllabus guidelines...", pct: 15 },
      { text: "Structuring exam paper layout...", pct: 35 },
      { text: "Generating high-quality questions with AI...", pct: 60 },
      { text: "Drafting correct answer keys & explanations...", pct: 80 },
      { text: "Formatting print-ready PDF configurations...", pct: 95 }
    ];
    
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < msgs.length - 1) {
        currentIdx++;
        setProgressMsg(msgs[currentIdx].text);
        setProgressPercent(msgs[currentIdx].pct);
      }
    }, 2200);
    
    return () => clearInterval(interval);
  }, [loading]);


  // Retrieve chapters list (flat structure — no board key)
  const getTopics = (): { id: string; name: string }[] => {
    return CURRICULUM_DATA[grade]?.[subject] || [];
  };

  // Sync to parent preview
  useEffect(() => {
    const allTopics = getTopics();
    const names = selectedTopicIds
      .map(id => allTopics.find(t => t.id === id)?.name)
      .filter(Boolean) as string[];
    onSelectionChange({ board: "CBSE", grade, subject, topicNames: names.length ? names : ["Select Chapters"], difficulty });
  }, [grade, subject, selectedTopicIds, difficulty]);

  const handleGradeChange = (newGrade: string, autoAdvance = false) => {
    setGrade(newGrade);
    setSelectedTopicIds([]);
    
    // Check if the current subject exists for the new grade
    const isEarlyGrade = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].includes(newGrade);
    const isSSTGrade = ["Class 6", "Class 7", "Class 8"].includes(newGrade);
    
    let isSubjectValid = true;
    if (subject === "EVS" && !isEarlyGrade) isSubjectValid = false;
    if (subject === "SST" && !isSSTGrade) isSubjectValid = false;
    
    const availableTopics = CURRICULUM_DATA[newGrade]?.[subject] || [];
    if (availableTopics.length === 0) isSubjectValid = false;

    if (!isSubjectValid) {
      const fallbackSub = SUBJECTS.find(sub => {
        if (sub.id === "EVS" && !isEarlyGrade) return false;
        if (sub.id === "SST" && !isSSTGrade) return false;
        return (CURRICULUM_DATA[newGrade]?.[sub.id] || []).length > 0;
      });
      if (fallbackSub) setSubject(fallbackSub.id);
    }

    // Auto-advance to step 2 after a brief flash so user sees their selection
    if (autoAdvance) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => setStep(2), 220);
    }
  };

  const handleSubjectChange = (newSubject: Subject) => {
    setSubject(newSubject);
    setSelectedTopicIds([]);
  };

  const toggleTopic = (id: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const all = getTopics().map(t => t.id);
    if (selectedTopicIds.length === all.length) {
      setSelectedTopicIds([]);
    } else {
      setSelectedTopicIds(all);
    }
  };

  const triggerGenerate = async () => {
    if (selectedTopicIds.length === 0) {
      setError("Please select at least one chapter.");
      return;
    }

    const mcqCountVal = questionFormat === "MCQ" || questionFormat === "MIXED" ? mcqCount : 0;
    const shortCountVal = questionFormat === "SHORT" || questionFormat === "MIXED" ? shortCount : 0;
    const longCountVal = questionFormat === "LONG" || questionFormat === "MIXED" ? longCount : 0;

    const totalCount = mcqCountVal + shortCountVal + longCountVal;
    if (totalCount < 5) {
      setError("Please select a combined minimum of 5 questions in total for the worksheet.");
      return;
    }

    setLoading(true);
    setError(null);

    const allTopics = getTopics();
    const topicNames = selectedTopicIds
      .map(id => allTopics.find(t => t.id === id)?.name)
      .filter(Boolean) as string[];

    try {
      const res = await fetch("/api/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId,
          board: "CBSE",
          grade,
          subject,
          topics: topicNames,
          difficulty,
          includeAnswerKey,
          mcqCount: mcqCountVal,
          shortCount: shortCountVal,
          longCount: longCountVal
        })
      });

      const result = await res.json();
      if (!res.ok) {
        if (res.status === 429 || result.error?.toLowerCase().includes("limit") || result.error?.toLowerCase().includes("quota")) {
          setLimitModalMsg(result.error || "You have reached your worksheet generation limit.");
          setShowLimitModal(true);
          throw new Error("Quota exceeded");
        }
        throw new Error(result.error || "Worksheet generation failed.");
      }
      onGenerationSuccess(result.worksheetId, result.data);
    } catch (err) {
      if ((err as Error).message !== "Quota exceeded") {
        setError((err as Error).message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const topics = getTopics();
  const allSelected = topics.length > 0 && selectedTopicIds.length === topics.length;

  if (loadingProfile) {
    return (
      <div className="glass-card" style={{ 
        padding: "32px", 
        width: "100%", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "340px", 
        textAlign: "center" 
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(124, 58, 237, 0.1)",
          borderTop: "3px solid var(--accent-purple)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px"
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading child profile workspace...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card" style={{ 
        padding: "32px", 
        width: "100%", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "340px", 
        textAlign: "center" 
      }}>
        {/* Animated Spinner */}
        <div style={{
          width: "50px",
          height: "50px",
          border: "3px solid rgba(124, 58, 237, 0.1)",
          borderTop: "3px solid var(--accent-purple)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "24px"
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        <h3 className="gradient-text" style={{ fontSize: "1.25rem", marginBottom: "8px", fontFamily: "var(--font-heading)" }}>Generating Worksheet</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", minHeight: "24px" }}>
          {progressMsg}
        </p>
        
        {/* Progress Bar */}
        <div style={{
          width: "100%",
          maxWidth: "280px",
          height: "6px",
          background: "rgba(0, 0, 0, 0.08)",
          borderRadius: "3px",
          overflow: "hidden",
          marginBottom: "8px"
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))",
            borderRadius: "3px",
            transition: "width 0.8s ease"
          }} />
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Estimated time: 10 - 15 seconds
        </span>
      </div>
    );
  }

  // ── MOBILE: Single flat form (no steps) ──────────────────────────────────
  if (isMobile) {
    const mobileTopics = getTopics();
    const mobileAllSelected = mobileTopics.length > 0 && selectedTopicIds.length === mobileTopics.length;
    return (
      <div className="glass-card" style={{ width: "100%", padding: "24px 20px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>Generate Worksheet</h3>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "20px" }}>Fill in the details below and tap Generate.</p>

        {/* Grade */}
        <div className="form-group" style={{ marginBottom: "16px" }}>
          <label className="form-label">Grade</label>
          <select
            value={grade}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="premium-input"
            disabled={!!studentProfileId}
          >
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {studentProfileId && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: "4px", fontStyle: "italic" }}>
              Grade is pre-locked to profile settings
            </span>
          )}
        </div>

        {/* Subject */}
        <div className="form-group" style={{ marginBottom: "16px" }}>
          <label className="form-label">Subject</label>
          <select
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value as any)}
            className="premium-input"
          >
            {SUBJECTS.map(sub => {
              const isEarlyGrade = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].includes(grade);
              const isSSTGrade = ["Class 6", "Class 7", "Class 8"].includes(grade);
              if (sub.id === "EVS" && !isEarlyGrade) return null;
              if (sub.id === "SST" && !isSSTGrade) return null;
              if ((CURRICULUM_DATA[grade]?.[sub.id] || []).length === 0) return null;
              return <option key={sub.id} value={sub.id}>{sub.name}</option>;
            })}
          </select>
        </div>

        {/* Chapters */}
        <div className="form-group" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label className="form-label" style={{ margin: 0 }}>Chapters</label>
            {mobileTopics.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{ background: "none", border: "1px solid var(--border-glow)", color: mobileAllSelected ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: "pointer", fontSize: "0.72rem", padding: "3px 9px", borderRadius: "6px", fontWeight: 600 }}
              >
                {mobileAllSelected ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          {mobileTopics.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No chapters for this selection.</p>
          ) : (
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "4px 0" }}>
              {mobileTopics.map(t => {
                const isChecked = selectedTopicIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 14px", cursor: "pointer", background: isChecked ? "rgba(124,58,237,0.1)" : "transparent", borderLeft: isChecked ? "3px solid var(--accent-purple)" : "3px solid transparent", transition: "all 0.15s ease" }}
                  >
                    <div style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: isChecked ? "2px solid var(--accent-purple)" : "2px solid var(--border-glow)", background: isChecked ? "var(--accent-purple)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isChecked && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: "0.86rem", color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>{t.name}</span>
                  </div>
                );
              })}
            </div>
          )}
          {selectedTopicIds.length > 0 && (
            <p style={{ fontSize: "0.72rem", color: "#a78bfa", marginTop: "6px", fontWeight: 600 }}>{selectedTopicIds.length} chapter{selectedTopicIds.length > 1 ? "s" : ""} selected</p>
          )}
        </div>

        {/* Difficulty */}
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label className="form-label">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="premium-input"
          >
            {["EASY", "MEDIUM", "HARD"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "10px 14px", borderRadius: "6px", color: "#991b1b", fontSize: "0.83rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={triggerGenerate}
          disabled={loading || selectedTopicIds.length === 0}
          style={{ width: "100%", padding: "14px", fontSize: "1rem", borderRadius: "10px" }}
        >
          {loading ? "Generating AI Sheet..." : "Generate Sheet ✨"}
        </button>
      </div>
    );
  }

  // ── DESKTOP: 3-step wizard (with auto-advance on grade click) ─────────────
  return (
    <div className="border-beam-card tilt-card" style={{ width: "100%" }}>
      <div className="border-beam-card-inner wizard-card-inner">
      {/* Step Indicators — 3 steps (board removed, CBSE fixed) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px" }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            style={{
              flex: 1,
              height: "5px",
              background: s === step
                ? "linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))"
                : s < step
                  ? "var(--accent-purple)"
                  : "rgba(0, 0, 0, 0.08)",
              boxShadow: s === step ? "0 0 10px var(--accent-purple-glow)" : "none",
              margin: "0 4px",
              borderRadius: "4px",
              transition: "var(--transition-smooth)"
            }}
          />
        ))}
      </div>

      <div className="wizard-step-container">

        {/* ── STEP 1: Grade ── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "1.2rem" }}>Step 1: Select Grade</h3>
              <span className="glowing-badge">Standard Syllabus</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "18px" }}>
              {studentProfileId 
                ? "Your grade is pre-selected based on your profile settings." 
                : "Syllabus is set to standard board curriculum for MVP."}
            </p>
            {/* Desktop Grade Selection Grid */}
            <div className="selection-grid hide-mobile">
              {GRADES.map(g => (
                <div
                  key={g}
                  className={`selection-card spotlight-card ${grade === g ? "active" : ""}`}
                  style={studentProfileId ? { opacity: grade === g ? 1 : 0.4, cursor: "not-allowed", border: grade === g ? "1px solid var(--accent-purple)" : "1px solid transparent" } : {}}
                  onMouseMove={e => {
                    if (!studentProfileId) handleMouseMove(e);
                  }}
                  onClick={() => {
                    if (!studentProfileId) {
                      handleGradeChange(g, true);
                    }
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{g}</p>
                </div>
              ))}
            </div>

            {/* Mobile Grade Dropdown Selector */}
            <div className="show-mobile" style={{ marginTop: "8px" }}>
              <select
                value={grade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="premium-input"
                disabled={!!studentProfileId}
              >
                {GRADES.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {studentProfileId && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "14px", fontStyle: "italic", textAlign: "center" }}>
                💡 Grade is locked to your profile. You can edit this in your Edit Profile settings.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Subject & Multi-Chapter ── */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: "6px", fontSize: "1.2rem" }}>Step 2: Subject & Chapters</h3>

            {/* Grade badge */}
            <div style={{
              background: "rgba(0,0,0,0.02)", border: "1px solid var(--border-glow)",
              borderRadius: "8px", padding: "8px 14px", marginBottom: "20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: "8px"
            }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Curriculum &bull; <strong>{grade}</strong>
              </span>
              <button type="button" style={{
                background: "none", border: "none", color: "var(--accent-cyan)",
                cursor: "pointer", fontSize: "0.8rem", fontWeight: 600
              }} onClick={() => setStep(1)}>
                Change Grade
              </button>
            </div>

            {/* Subject picker */}
            <div className="form-group">
              <label className="form-label">Subject</label>
              {/* Desktop Subject Grid */}
              <div className="selection-grid hide-mobile" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", marginBottom: "20px" }}>
                {SUBJECTS.map(sub => {
                  const isEarlyGrade = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].includes(grade);
                  const isSSTGrade = ["Class 6", "Class 7", "Class 8"].includes(grade);

                  if (sub.id === "EVS" && !isEarlyGrade) return null;
                  if (sub.id === "SST" && !isSSTGrade) return null;

                  const availableTopics = CURRICULUM_DATA[grade]?.[sub.id] || [];
                  const isEmpty = availableTopics.length === 0;

                  if (isEmpty) return null;

                  return (
                    <div
                      key={sub.id}
                      className={`selection-card spotlight-card ${subject === sub.id ? "active" : ""}`}
                      onMouseMove={handleMouseMove}
                      onClick={() => handleSubjectChange(sub.id)}
                    >
                      <p style={{ fontWeight: 600, fontSize: "0.82rem" }}>{sub.name}</p>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Subject Dropdown Selector */}
              <div className="show-mobile" style={{ marginBottom: "20px" }}>
                <select
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value as Subject)}
                  className="premium-input"
                >
                  {SUBJECTS.map(sub => {
                    const isEarlyGrade = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].includes(grade);
                    const isSSTGrade = ["Class 6", "Class 7", "Class 8"].includes(grade);

                    if (sub.id === "EVS" && !isEarlyGrade) return null;
                    if (sub.id === "SST" && !isSSTGrade) return null;

                    const availableTopics = CURRICULUM_DATA[grade]?.[sub.id] || [];
                    const isEmpty = availableTopics.length === 0;

                    if (isEmpty) return null;

                    return (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Chapter multi-select */}
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {subject === "HINDI" ? "Chapters (Rimjhim / Vasant)" : subject === "SST" ? "Topics (History / Geography / Civics)" : "NCERT Chapters"}
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {selectedTopicIds.length > 0 && (
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa",
                      background: "rgba(124,58,237,0.15)", padding: "3px 10px",
                      borderRadius: "20px", border: "1px solid rgba(124,58,237,0.3)"
                    }}>
                      {selectedTopicIds.length} selected
                    </span>
                  )}
                  {topics.length > 0 && (
                    <button type="button" style={{
                      background: "none", border: "1px solid var(--border-glow)",
                      color: allSelected ? "var(--accent-cyan)" : "var(--text-secondary)",
                      cursor: "pointer", fontSize: "0.75rem", padding: "4px 10px",
                      borderRadius: "6px", fontWeight: 600
                    }} onClick={toggleSelectAll}>
                      {allSelected ? "Deselect All" : "Select All (Whole Syllabus)"}
                    </button>
                  )}
                </div>
              </div>

              {topics.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "10px" }}>
                  No chapters defined for this grade/subject. Try a different subject.
                </p>
              ) : (
                <div style={{
                  maxHeight: "220px", overflowY: "auto",
                  border: "1px solid var(--border-glow)", borderRadius: "8px",
                  padding: "4px 0"
                }}>
                  {topics.map(t => {
                    const isChecked = selectedTopicIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTopic(t.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "9px 14px", cursor: "pointer",
                          background: isChecked ? "rgba(124,58,237,0.1)" : "transparent",
                          borderLeft: isChecked ? "3px solid var(--accent-purple)" : "3px solid transparent",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{
                          width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                          border: isChecked ? "2px solid var(--accent-purple)" : "2px solid var(--border-glow)",
                          background: isChecked ? "var(--accent-purple)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {isChecked && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: "0.88rem", color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {t.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Difficulty + Options ── */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: "16px", fontSize: "1.2rem" }}>Step 3: Difficulty & Options</h3>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">Difficulty Level</label>
              {/* Desktop Slider Selector */}
              <div className="slider-tabs-container hide-mobile">
                <div
                  className={`slider-tab-indicator ${difficulty === "HARD" ? "cyan-gradient" : ""}`}
                  style={{
                    width: "calc(33.33% - 4px)",
                    transform:
                      difficulty === "EASY"
                        ? "translateX(0)"
                        : difficulty === "MEDIUM"
                        ? "translateX(calc(100% + 2px))"
                        : "translateX(calc(200% + 4px))"
                  }}
                />
                {["EASY", "MEDIUM", "HARD"].map(diff => (
                  <button
                    key={diff}
                    type="button"
                    className={`slider-tab-btn ${difficulty === diff ? "active" : ""}`}
                    onClick={() => setDifficulty(diff)}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              {/* Mobile Difficulty Dropdown Selector */}
              <div className="show-mobile">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="premium-input"
                >
                  {["EASY", "MEDIUM", "HARD"].map(diff => (
                    <option key={diff} value={diff}>
                      {diff}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Question Formats & Counts */}
            <div style={{
              background: "rgba(0,0,0,0.02)", border: "1px solid var(--border-glow)",
              borderRadius: "10px", padding: "18px 20px", marginBottom: "20px"
            }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>
                Question Settings
              </h4>
              
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Format Mode</label>
                <select 
                  className="premium-input" 
                  value={questionFormat} 
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setQuestionFormat(val);
                    // Reset counts to minimums based on selection
                    if (val === "MCQ") { setMcqCount(10); setShortCount(0); setLongCount(0); }
                    else if (val === "SHORT") { setMcqCount(0); setShortCount(10); setLongCount(0); }
                    else if (val === "LONG") { setMcqCount(0); setShortCount(0); setLongCount(10); }
                    else { setMcqCount(5); setShortCount(3); setLongCount(2); } // MIXED
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-glow)", color: "var(--text-primary)" }}
                >
                  <option value="MIXED">Mixed format (All types)</option>
                  <option value="MCQ">Multiple Choice Questions (MCQs) only</option>
                  <option value="SHORT">Short Answer Questions only</option>
                  <option value="LONG">Critical Thinking (Long) only</option>
                </select>
              </div>

              {/* Counters */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(questionFormat === "MIXED" || questionFormat === "MCQ") && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>MCQ Questions</span>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>Max 20 questions</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.85rem" }}
                        onClick={() => setMcqCount(Math.max(questionFormat === "MIXED" ? 0 : 5, mcqCount - 1))}
                      >-</button>
                      <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 700 }}>{mcqCount}</span>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.85rem" }}
                        onClick={() => setMcqCount(Math.min(20, mcqCount + 1))}
                      >+</button>
                    </div>
                  </div>
                )}

                {(questionFormat === "MIXED" || questionFormat === "SHORT") && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Short Answer Questions</span>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>Max 10 questions</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.85rem" }}
                        onClick={() => setShortCount(Math.max(questionFormat === "MIXED" ? 0 : 5, shortCount - 1))}
                      >-</button>
                      <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 700 }}>{shortCount}</span>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.85rem" }}
                        onClick={() => setShortCount(Math.min(10, shortCount + 1))}
                      >+</button>
                    </div>
                  </div>
                )}

                {(questionFormat === "MIXED" || questionFormat === "LONG") && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Critical Thinking (Long)</span>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>Max 10 questions</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.85rem" }}
                        onClick={() => setLongCount(Math.max(questionFormat === "MIXED" ? 0 : 5, longCount - 1))}
                      >-</button>
                      <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 700 }}>{longCount}</span>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.85rem" }}
                        onClick={() => setLongCount(Math.min(10, longCount + 1))}
                      >+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Answer Key Toggle */}
            <div style={{
              background: "rgba(0,0,0,0.02)", border: "1px solid var(--border-glow)",
              borderRadius: "10px", padding: "16px 18px", marginBottom: "20px",
              opacity: !studentProfileId ? 0.75 : 1
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Include Answer Key</span>
                    {!studentProfileId && <span style={{ fontSize: "0.7rem", color: "#a78bfa", background: "rgba(167,139,250,0.15)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>🔒 Pro</span>}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    {!studentProfileId 
                      ? "Create a student profile to unlock answer keys." 
                      : "Shows correct answers & explanations on the worksheet"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!studentProfileId}
                  onClick={() => setIncludeAnswerKey(!includeAnswerKey)}
                  style={{
                    width: "46px", height: "26px", borderRadius: "13px", border: "none",
                    background: (studentProfileId && includeAnswerKey) ? "var(--accent-purple)" : "#cbd5e1",
                    cursor: studentProfileId ? "pointer" : "not-allowed", position: "relative", flexShrink: 0,
                    transition: "background 0.2s ease"
                  }}
                >
                  <span style={{
                    position: "absolute", top: "3px",
                    left: (studentProfileId && includeAnswerKey) ? "23px" : "3px",
                    width: "20px", height: "20px", borderRadius: "50%",
                    background: "#fff", transition: "left 0.2s ease"
                  }} />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: "rgba(0,0,0,0.02)", padding: "14px 16px",
              borderRadius: "8px", border: "1px solid var(--border-glow)"
            }}>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                <strong>Worksheet Summary</strong>
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Syllabus &bull; {grade} &bull; {subject} &bull; {difficulty}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {selectedTopicIds.length === topics.length && topics.length > 0
                  ? `📚 Whole Syllabus (${topics.length} chapters)`
                  : selectedTopicIds.length === 1
                    ? `📖 ${getTopics().find(t => t.id === selectedTopicIds[0])?.name}`
                    : `📖 ${selectedTopicIds.length} chapters combined`}
              </p>
              <p style={{ fontSize: "0.78rem", color: includeAnswerKey ? "#059669" : "var(--text-muted)", marginTop: "4px" }}>
                {includeAnswerKey ? "✓ Answer key included" : "✕ Answer key hidden"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "12px", borderRadius: "6px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
        {step > 1 ? (
          <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)} disabled={loading}>
            Back
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={step === 2 && selectedTopicIds.length === 0}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={triggerGenerate}
            disabled={loading}
            style={{ minWidth: "160px" }}
          >
            {loading ? "Generating AI Sheet..." : "Generate Sheet ✨"}
          </button>
        )}
      </div>

      {showLimitModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
          <div className="glass-card spotlight-card" style={{ padding: "40px 32px", width: "100%", maxWidth: "480px", margin: "20px", textAlign: "center", border: "1px solid rgba(124, 58, 237, 0.3)", boxShadow: "0 0 40px rgba(124, 58, 237, 0.25)" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🚀</div>
            <h3 className="gradient-text" style={{ fontSize: "1.6rem", margin: "0 0 12px 0", fontWeight: 800 }}>Generation Limit Reached</h3>
            <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 16px 0", lineHeight: "1.5" }}>
              {limitModalMsg || "You have reached your daily/monthly worksheet generation limit."}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 24px 0", lineHeight: "1.5" }}>
              Upgrade to a premium subscription (Plus or Family/Pro) to get unlimited generations, weekly progress reports, parent control dashboards, and detailed scoring keys.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "14px", fontWeight: 700, borderRadius: "10px", fontSize: "0.9rem", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
                onClick={() => {
                  setShowLimitModal(false);
                  window.location.href = "/dashboard";
                }}
              >
                Upgrade Plan &rarr;
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "12px", borderRadius: "10px", border: "1px solid var(--border-glow)", background: "rgba(255,255,255,0.01)" }}
                onClick={() => {
                  setShowLimitModal(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
