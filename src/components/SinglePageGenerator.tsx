// src/components/SinglePageGenerator.tsx
"use client";
import React, { useState, useEffect } from "react";
import { CURRICULUM_DATA, Subject } from "@/lib/curriculumData";

interface SinglePageGeneratorProps {
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

export default function SinglePageGenerator({
  onSelectionChange,
  onGenerationSuccess
}: SinglePageGeneratorProps) {
  const [grade, setGrade] = useState("Class 6");
  const [subject, setSubject] = useState<Subject>("SCIENCE");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("MEDIUM");

  // Sync to parent preview
  useEffect(() => {
    const allTopics = getTopics();
    const names = selectedTopicIds
      .map(id => allTopics.find(t => t.id === id)?.name)
      .filter(Boolean) as string[];
      
    onSelectionChange({
      board: "CBSE",
      grade,
      subject,
      topicNames: names,
      difficulty
    });
  }, [grade, subject, selectedTopicIds, difficulty]);
  const [questionFormat, setQuestionFormat] = useState<"MCQ" | "SHORT" | "LONG" | "MIXED">("MIXED");
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalMsg, setLimitModalMsg] = useState("");

  // Progress message cycler for worksheet generation
  const [progressMsg, setProgressMsg] = useState("Consulting syllabus guidelines...");
  const [progressPercent, setProgressPercent] = useState(10);

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

  // Retrieve chapters list
  const getTopics = (): { id: string; name: string }[] => {
    return CURRICULUM_DATA[grade]?.[subject] || [];
  };

  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    setSelectedTopicIds([]);
    
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
          studentProfileId: null, // Always guest
          board: "CBSE",
          grade,
          subject,
          topics: topicNames,
          difficulty,
          includeAnswerKey: false, // Locked for guests
          mcqCount: mcqCountVal,
          shortCount: shortCountVal,
          longCount: longCountVal
        })
      });

      const result = await res.json();
      if (!res.ok) {
        if (res.status === 429 || result.error?.toLowerCase().includes("limit") || result.error?.toLowerCase().includes("quota")) {
          setLimitModalMsg(result.error || "You have reached your guest worksheet generation limit.");
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

  return (
    <div className="border-beam-card tilt-card" style={{ width: "100%" }}>
      <div className="border-beam-card-inner wizard-card-inner" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Worksheet Customizer</h3>
          <span className="glowing-badge">Guest Session</span>
        </div>

        {/* Grade Selection */}
        <div className="form-group">
          <label className="form-label">Grade Level</label>
          <select
            value={grade}
            onChange={(e) => handleGradeChange(e.target.value)}
            className="premium-input"
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-glow)", color: "var(--text-primary)" }}
          >
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Subject Selection */}
        <div className="form-group">
          <label className="form-label">Subject</label>
          <select
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value as Subject)}
            className="premium-input"
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-glow)", color: "var(--text-primary)" }}
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

        {/* Chapter Selection */}
        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label className="form-label" style={{ margin: 0 }}>Chapters</label>
            {topics.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{ background: "none", border: "1px solid var(--border-glow)", color: allSelected ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: "pointer", fontSize: "0.72rem", padding: "3px 9px", borderRadius: "6px", fontWeight: 600 }}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          {topics.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No chapters for this selection.</p>
          ) : (
            <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "4px 0", background: "rgba(0,0,0,0.02)" }}>
              {topics.map(t => {
                const isChecked = selectedTopicIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 14px", cursor: "pointer", background: isChecked ? "rgba(124,58,237,0.08)" : "transparent", borderLeft: isChecked ? "3px solid var(--accent-purple)" : "3px solid transparent", transition: "all 0.15s ease" }}
                  >
                    <div style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: isChecked ? "2px solid var(--accent-purple)" : "2px solid var(--border-glow)", background: isChecked ? "var(--accent-purple)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isChecked && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: "0.84rem", color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>{t.name}</span>
                  </div>
                );
              })}
            </div>
          )}
          {selectedTopicIds.length > 0 && (
            <p style={{ fontSize: "0.72rem", color: "#a78bfa", marginTop: "6px", fontWeight: 600 }}>{selectedTopicIds.length} chapter{selectedTopicIds.length > 1 ? "s" : ""} selected</p>
          )}
        </div>

        {/* Difficulty Selector */}
        <div className="form-group">
          <label className="form-label">Difficulty Level</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="premium-input"
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-glow)", color: "var(--text-primary)" }}
          >
            {["EASY", "MEDIUM", "HARD"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Format Selection */}
        <div className="form-group">
          <label className="form-label">Question Settings</label>
          <select 
            className="premium-input" 
            value={questionFormat} 
            onChange={(e) => {
              const val = e.target.value as any;
              setQuestionFormat(val);
              if (val === "MCQ") { setMcqCount(10); setShortCount(0); setLongCount(0); }
              else if (val === "SHORT") { setMcqCount(0); setShortCount(10); setLongCount(0); }
              else if (val === "LONG") { setMcqCount(0); setShortCount(0); setLongCount(10); }
              else { setMcqCount(5); setShortCount(3); setLongCount(2); } // MIXED
            }}
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-glow)", color: "var(--text-primary)", marginBottom: "12px" }}
          >
            <option value="MIXED">Mixed format (All types)</option>
            <option value="MCQ">Multiple Choice Questions (MCQs) only</option>
            <option value="SHORT">Short Answer Questions only</option>
            <option value="LONG">Critical Thinking (Long) only</option>
          </select>

          {/* Counts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(0,0,0,0.015)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glow)" }}>
            {(questionFormat === "MIXED" || questionFormat === "MCQ") && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>MCQs (Max 20)</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button type="button" className="btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => setMcqCount(Math.max(questionFormat === "MIXED" ? 0 : 5, mcqCount - 1))}>-</button>
                  <span style={{ minWidth: "20px", textAlign: "center", fontWeight: 700, fontSize: "0.85rem" }}>{mcqCount}</span>
                  <button type="button" className="btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => setMcqCount(Math.min(20, mcqCount + 1))}>+</button>
                </div>
              </div>
            )}

            {(questionFormat === "MIXED" || questionFormat === "SHORT") && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Short Questions (Max 10)</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button type="button" className="btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => setShortCount(Math.max(questionFormat === "MIXED" ? 0 : 5, shortCount - 1))}>-</button>
                  <span style={{ minWidth: "20px", textAlign: "center", fontWeight: 700, fontSize: "0.85rem" }}>{shortCount}</span>
                  <button type="button" className="btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => setShortCount(Math.min(10, shortCount + 1))}>+</button>
                </div>
              </div>
            )}

            {(questionFormat === "MIXED" || questionFormat === "LONG") && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Long Questions (Max 10)</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button type="button" className="btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => setLongCount(Math.max(questionFormat === "MIXED" ? 0 : 5, longCount - 1))}>-</button>
                  <span style={{ minWidth: "20px", textAlign: "center", fontWeight: 700, fontSize: "0.85rem" }}>{longCount}</span>
                  <button type="button" className="btn-secondary" style={{ padding: "2px 8px", fontSize: "0.8rem" }} onClick={() => setLongCount(Math.min(10, longCount + 1))}>+</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "10px 14px", borderRadius: "6px", color: "#991b1b", fontSize: "0.83rem" }}>
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={triggerGenerate}
          disabled={loading || selectedTopicIds.length === 0}
          style={{ width: "100%", padding: "12px", fontSize: "0.95rem", borderRadius: "8px", marginTop: "8px" }}
        >
          Generate Worksheet ✨
        </button>
      </div>

      {showLimitModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
          <div className="glass-card spotlight-card" style={{ padding: "40px 32px", width: "100%", maxWidth: "480px", margin: "20px", textAlign: "center", border: "1px solid rgba(124, 58, 237, 0.3)", boxShadow: "0 0 40px rgba(124, 58, 237, 0.25)" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🚀</div>
            <h3 className="gradient-text" style={{ fontSize: "1.6rem", margin: "0 0 12px 0", fontWeight: 800 }}>Limit Reached</h3>
            <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 16px 0", lineHeight: "1.5" }}>
              {limitModalMsg || "You have reached your guest worksheet generation limit."}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 24px 0", lineHeight: "1.5" }}>
              Create a free student profile now to unlock unlimited worksheet generations, weekly parent summary reports, adaptive weakness heatmaps, and digital evaluation logs!
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "14px", fontWeight: 700, borderRadius: "10px", fontSize: "0.9rem", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
                onClick={() => {
                  setShowLimitModal(false);
                  window.location.href = "/dashboard?mode=signup";
                }}
              >
                Create Free Profile &rarr;
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
  );
}
