// src/app/worksheets/[id]/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ThreeBackground from "@/components/ThreeBackground";
import GradingMark from "@/components/GradingMark";

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  answer: string;
  marks?: number;
  subtopic?: string;
  solutionExplanation?: string;
}

interface Section {
  name: string;
  questions: Question[];
}

interface MatchingItem {
  left: string;
  right: string;
  marks?: number;
}

interface BlankQuestion {
  id: number;
  sentence: string;
  answer: string;
  marks?: number;
}

interface OddOutQuestion {
  id: number;
  words: string[];
  answer: string;
  explanation: string;
  marks?: number;
}

interface Activity {
  type: "MATCHING" | "FILL_BLANKS" | "ODD_OUT";
  instruction: string;
  items?: MatchingItem[];
  wordBank?: string[];
  questions?: BlankQuestion[] | OddOutQuestion[];
}

interface WorksheetData {
  title: string;
  board?: string;
  grade: string;
  subject: string;
  sections?: Section[];
  activities?: Activity[];
}

export default function WorksheetPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState<any | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [answerKeyIncluded, setAnswerKeyIncluded] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloadingMsg, setDownloadingMsg] = useState<string | null>(null);

  // Grader Modal states
  const [showGraderModal, setShowGraderModal] = useState(false);
  const [gradingMode, setGradingMode] = useState<"manual" | "ai">("manual");
  const [graderScores, setGraderScores] = useState<Record<string, boolean>>({});
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<any | null>(null);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("Uploading file...");
  const [evaluationQuotaReached, setEvaluationQuotaReached] = useState(false);

  // Progress message cycler for AI reviews
  useEffect(() => {
    if (!uploadingPdf) return;
    const msgs = [
      "Uploading solved PDF/Image sheet...",
      "Extracting text solutions using local OCR...",
      "Sending content to PracUp AI reviewer...",
      "Comparing responses to correct answers...",
      "Calculating final score & subtopic logs..."
    ];
    let idx = 0;
    setUploadProgressMsg(msgs[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setUploadProgressMsg(msgs[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [uploadingPdf]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const openGrader = () => {
    if (!worksheet?.data) return;
    const initialScores: Record<string, boolean> = {};
    const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(worksheet.data.grade);

    if (isEarly) {
      const activities = worksheet.data.activities || [];
      activities.forEach((act: any, actIdx: number) => {
        if (act.type === "MATCHING" && act.items) {
          act.items.forEach((_: any, qIdx: number) => {
            initialScores[`act_${actIdx}_q_${qIdx}`] = true;
          });
        } else if (act.questions) {
          act.questions.forEach((q: any, qIdx: number) => {
            initialScores[`act_${actIdx}_q_${qIdx}`] = true;
          });
        }
      });
    } else {
      const sections = worksheet.data.sections || [];
      sections.forEach((sec: any) => {
        if (sec.questions) {
          sec.questions.forEach((q: any) => {
            initialScores[q.id] = true;
          });
        }
      });
    }
    setGraderScores(initialScores);
    setGradingMode("manual");
    setPdfFile(null);
    setUploadingPdf(false);
    setAiReviewResult(null);
    setAiReviewError(null);
    setShowGraderModal(true);
  };

  const getCalculatedScore = () => {
    if (!worksheet?.data) return 0;
    const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(worksheet.data.grade);
    let computedScore = 0;

    if (isEarly) {
      const activities = worksheet.data.activities || [];
      activities.forEach((act: any, actIdx: number) => {
        if (act.type === "MATCHING" && act.items) {
          act.items.forEach((item: any, qIdx: number) => {
            if (graderScores[`act_${actIdx}_q_${qIdx}`] === true) {
              computedScore += item.marks !== undefined && item.marks !== null ? Number(item.marks) : 1;
            }
          });
        } else if (act.questions) {
          act.questions.forEach((q: any, qIdx: number) => {
            if (graderScores[`act_${actIdx}_q_${qIdx}`] === true) {
              computedScore += q.marks !== undefined && q.marks !== null ? Number(q.marks) : 1;
            }
          });
        }
      });
    } else {
      const sections = worksheet.data.sections || [];
      sections.forEach((sec: any) => {
        if (sec.questions) {
          sec.questions.forEach((q: any) => {
            if (graderScores[q.id] === true) {
              computedScore += q.marks !== undefined && q.marks !== null ? Number(q.marks) : (q.type === "MCQ" ? 1 : q.type === "SHORT" ? 2 : 4);
            }
          });
        }
      });
    }
    return computedScore;
  };

  const submitGrading = async () => {
    try {
      setSubmittingGrade(true);
      const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(worksheet.data.grade);
      const computedScore = getCalculatedScore();

      const incorrectQuestions: { subtopic: string }[] = [];
      const correctQuestions: { subtopic: string }[] = [];

      if (isEarly) {
        const activities = worksheet.data.activities || [];
        activities.forEach((act: any, actIdx: number) => {
          const actTypeLabel = act.type === "MATCHING" ? "Matching" : act.type === "FILL_BLANKS" ? "Fill Blanks" : "Odd Out";
          const subtopicName = `${worksheet.topic} (${actTypeLabel})`;

          if (act.type === "MATCHING" && act.items) {
            act.items.forEach((_: any, qIdx: number) => {
              if (graderScores[`act_${actIdx}_q_${qIdx}`] === false) {
                incorrectQuestions.push({ subtopic: subtopicName });
              } else {
                correctQuestions.push({ subtopic: subtopicName });
              }
            });
          } else if (act.questions) {
            act.questions.forEach((_: any, qIdx: number) => {
              if (graderScores[`act_${actIdx}_q_${qIdx}`] === false) {
                incorrectQuestions.push({ subtopic: subtopicName });
              } else {
                correctQuestions.push({ subtopic: subtopicName });
              }
            });
          }
        });
      } else {
        const sections = worksheet.data.sections || [];
        sections.forEach((sec: any) => {
          if (sec.questions) {
            sec.questions.forEach((q: any) => {
              if (graderScores[q.id] === false) {
                incorrectQuestions.push({
                  subtopic: q.subtopic || worksheet.topic
                });
              } else {
                correctQuestions.push({
                  subtopic: q.subtopic || worksheet.topic
                });
              }
            });
          }
        });
      }

      const res = await fetch(`/api/worksheets/${id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: computedScore,
          incorrectQuestions,
          correctQuestions
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit score");
      }

      const updatedData = await res.json();
      setWorksheet((prev: any) => ({
        ...prev,
        score: updatedData.score
      }));

      // Update guest history in sessionStorage if applicable
      try {
        const guestHistoryStr = sessionStorage.getItem("pracup_guest_history");
        if (guestHistoryStr) {
          const history = JSON.parse(guestHistoryStr);
          const index = history.findIndex((item: any) => item.id === id);
          if (index !== -1) {
            history[index].score = updatedData.score;
            sessionStorage.setItem("pracup_guest_history", JSON.stringify(history));
          }
        }
      } catch (e) {
        console.error("Error updating guest history score:", e);
      }

      setShowGraderModal(false);
      alert(`Score of ${updatedData.score}/${worksheet.totalMarks} submitted successfully!`);
    } catch (err) {
      alert((err as Error).message || "Something went wrong during grading submission.");
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setUploadingPdf(true);
    setAiReviewError(null);
    setAiReviewResult(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch(`/api/worksheets/${id}/review`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to review worksheet");
      }

      setAiReviewResult(data);
      if (data.quotaExceeded || data.detailedAllowed === false) {
        setEvaluationQuotaReached(true);
      }
      setWorksheet((prev: any) => ({
        ...prev,
        score: data.score
      }));

      // Update guest history in sessionStorage if applicable
      try {
        const guestHistoryStr = sessionStorage.getItem("pracup_guest_history");
        if (guestHistoryStr) {
          const history = JSON.parse(guestHistoryStr);
          const index = history.findIndex((item: any) => item.id === id);
          if (index !== -1) {
            history[index].score = data.score;
            sessionStorage.setItem("pracup_guest_history", JSON.stringify(history));
          }
        }
      } catch (e) {
        console.error("Error updating guest history AI score:", e);
      }
    } catch (err) {
      setAiReviewError((err as Error).message || "Something went wrong.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleToggleSolutions = () => {
    if (!worksheet?.studentProfileId) {
      setShowUpgradeModal(true);
      return;
    }
    setShowSolutions(!showSolutions);
  };

  useEffect(() => {
    async function loadWorksheet() {
      try {
        const res = await fetch(`/api/worksheets/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load worksheet");
        }
        const data = await res.json();
        setWorksheet(data);
        // Respect the includeAnswerKey flag set at generation time
        const keyIncluded = data?.data?.includeAnswerKey !== false;
        setAnswerKeyIncluded(keyIncluded);
        setShowSolutions(keyIncluded); // Default: show if included, hide if not

        // Also fetch profile limits if the worksheet belongs to a profile
        if (data.studentProfileId) {
          const limitRes = await fetch(`/api/student/dashboard?id=${data.studentProfileId}`);
          if (limitRes.ok) {
            const limitData = await limitRes.json();
            if (limitData && limitData.evaluationQuotaReached) {
              setEvaluationQuotaReached(true);
            }
          }
        }
      } catch (err) {
        setError((err as Error).message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    loadWorksheet();
  }, [id]);

  const downloadPDF = (showSolutionsValue: boolean, filename: string) => {
    setDownloadingMsg(showSolutionsValue ? "Generating Solutions PDF..." : "Generating Worksheet PDF...");
    const prevShow = showSolutions;
    setShowSolutions(showSolutionsValue);

    setTimeout(() => {
      const element = document.querySelector(".printable-sheet");
      if (!element) {
        setDownloadingMsg(null);
        setShowSolutions(prevShow);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        // @ts-ignore
        const html2pdf = window.html2pdf;
        const opt = {
          margin:       [0.4, 0.4, 0.4, 0.4],
          filename:     filename,
          image:        { type: "jpeg", quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: "in", format: "a4", orientation: "portrait" },
          pagebreak:    { mode: ["avoid-all", "css", "legacy"] }
        };

        const cloned = element.cloneNode(true) as HTMLElement;
        cloned.style.boxShadow = "none";
        cloned.style.borderRadius = "0";
        cloned.style.border = "none";
        cloned.style.padding = "20px";
        cloned.style.background = "#fff";
        cloned.style.color = "#000";
        cloned.style.width = "100%";
        cloned.style.maxWidth = "750px";

        cloned.querySelectorAll("*").forEach(el => {
          (el as HTMLElement).style.color = "#000";
        });

        html2pdf()
          .set(opt)
          .from(cloned)
          .save()
          .then(() => {
            setDownloadingMsg(null);
            setShowSolutions(prevShow);
          })
          .catch((err: any) => {
            console.error("PDF generation failed:", err);
            setDownloadingMsg(null);
            setShowSolutions(prevShow);
            alert("Failed to download PDF. Please try again.");
          });
      };
      script.onerror = () => {
        setDownloadingMsg(null);
        setShowSolutions(prevShow);
        alert("Failed to load PDF generator. Please try standard print (Ctrl+P).");
      };
      document.body.appendChild(script);
    }, 200);
  };

  const handlePrintWorksheet = () => {
    downloadPDF(false, `PracUp_Worksheet_${data.grade.replace(/\s+/g, "_")}_${data.subject}.pdf`);
  };

  const handlePrintSolutions = () => {
    if (!worksheet?.studentProfileId) {
      setShowUpgradeModal(true);
      return;
    }
    downloadPDF(true, `PracUp_Solutions_${data.grade.replace(/\s+/g, "_")}_${data.subject}.pdf`);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>Loading generated worksheet...</p>
      </div>
    );
  }

  if (error && !worksheet) {
    return (
      <div style={{ maxWidth: "600px", margin: "100px auto", textAlign: "center", padding: "20px" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "16px" }}>Error</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>{error}</p>
        <button type="button" className="btn-primary" onClick={() => router.push("/")}>Back to Home</button>
      </div>
    );
  }

  const { data }: { data: WorksheetData } = worksheet;

  const getQuestionNumber = (secIdx: number, qIdx: number) => {
    let count = 0;
    const sections = data?.sections || [];
    for (let i = 0; i < secIdx; i++) {
      count += sections[i]?.questions?.length || 0;
    }
    return count + qIdx + 1;
  };

  const isEarlyLearner = ["LKG", "UKG", "Class 1", "Class 2"].includes(data.grade);

  const allQuestionsList: any[] = [];
  if (isEarlyLearner) {
    data.activities?.forEach((act: any, actIdx: number) => {
      if (act.type === "MATCHING" && act.items) {
        act.items.forEach((item: any, itemIdx: number) => {
          allQuestionsList.push({
            id: `act_${actIdx}_q_${itemIdx}`,
            type: "MATCHING",
            text: `Match: ${item.left}`
          });
        });
      } else if (act.questions) {
        act.questions.forEach((q: any) => {
          allQuestionsList.push({
            id: `act_${actIdx}_q_${q.id}`,
            type: act.type,
            text: q.sentence || q.words?.join(", ") || "Early learner question"
          });
        });
      }
    });
  } else {
    data.sections?.forEach((section: any) => {
      section.questions?.forEach((q: any) => {
        allQuestionsList.push(q);
      });
    });
  }

  return (
    <main style={{ minHeight: "100vh", padding: "20px" }}>
      <ThreeBackground />

      {/* Screen Interface Headers */}
      <div className="no-print" style={{ maxWidth: "800px", margin: "0 auto 30px auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <button type="button" className="btn-secondary" onClick={() => router.push("/")} style={{ padding: "10px 20px" }}>
          &larr; Practice Again
        </button>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {worksheet.studentProfileId && (
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleToggleSolutions} 
              style={{ padding: "10px 20px", borderColor: showSolutions ? "var(--accent-cyan)" : "var(--border-glow)", color: showSolutions ? "var(--accent-cyan)" : "var(--text-secondary)" }}
            >
              {showSolutions ? "Hide Answer Key" : "Show Answer Key"}
              {!answerKeyIncluded && <span style={{ fontSize: "0.7rem", marginLeft: "6px", color: "#dc2626" }}>(Not included)</span>}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={handlePrintWorksheet}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #0284c7, #06b6d4)",
              border: "none",
              display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            <span>⬇</span>
            <span>Download Worksheet PDF</span>
          </button>
          {worksheet.studentProfileId && (
            <button
              type="button"
              className="btn-primary"
              onClick={handlePrintSolutions}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #059669, #10b981)",
                border: "none",
                display: "flex", alignItems: "center", gap: "8px"
              }}
            >
              <span>⬇</span>
              <span>Download Solutions PDF</span>
            </button>
          )}
          {worksheet.studentProfileId && (
            <button
              type="button"
              className="btn-primary"
              onClick={openGrader}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                border: "none",
                display: "flex", alignItems: "center", gap: "8px"
              }}
            >
              <span>📝</span>
              <span>Grade Worksheet</span>
            </button>
          )}
          {worksheet.studentProfileId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/")}
              style={{
                padding: "10px 20px",
                display: "flex", alignItems: "center", gap: "8px"
              }}
              title="Saves this worksheet to your history and returns to the home page so you can grade it later."
            >
              <span>🕒</span>
              <span>Grade Later</span>
            </button>
          )}
        </div>
      </div>

      {/* Quota Limit Warning Banner */}
      {evaluationQuotaReached && (
        <div className="no-print" style={{ 
          maxWidth: "800px", 
          margin: "0 auto 20px auto", 
          background: "linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(244, 63, 94, 0.08) 100%)", 
          border: "1px solid rgba(239, 68, 68, 0.3)", 
          borderRadius: "12px", 
          padding: "16px 20px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          gap: "16px",
          backdropFilter: "blur(8px)"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "1.1rem" }}>⚠️</span>
              <strong style={{ fontSize: "0.95rem", color: "#fca5a5" }}>Detailed Review Quota Limit Reached</strong>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: 0, lineHeight: 1.4 }}>
              You have hit your monthly limit for detailed step-by-step review evaluations. Future sheets will use basic scoring only. Upgrade to Plus or Family to unlock unlimited reviews!
            </p>
          </div>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ 
              padding: "10px 18px", 
              fontSize: "0.8rem", 
              fontWeight: 700, 
              background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
              border: "none",
              borderRadius: "8px",
              whiteSpace: "nowrap"
            }} 
            onClick={() => router.push("/dashboard")}
          >
            Upgrade Plan &rarr;
          </button>
        </div>
      )}

      {/* Main Print Layout Wrapper */}
      <div className="print-container" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "30px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Left Side: A4 Page Viewer */}
        <div className="printable-sheet" style={{ background: "#fff", color: "#000", padding: "40px", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
          
          {/* A4 Sheet Header */}
          <div style={{ borderBottom: "3px solid #000", paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", background: "#000", color: "#fff", padding: "4px 10px", borderRadius: "4px" }}>
                {data.board || "HOME PRACTICE"}
              </span>
              <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                {data.grade}
              </span>
            </div>
            <h1 style={{ fontSize: "1.6rem", marginTop: "12px", color: "#000" }}>{data.title}</h1>
            <p style={{ fontSize: "0.95rem", color: "#475569", marginTop: "4px", fontWeight: 600 }}>
              Subject: {data.subject} &bull; Difficulty: {worksheet.difficulty}
            </p>
            
            {/* Blanks for Student Details */}
            <div className="student-header-blanks">
              <span>Student Name: ________________________________</span>
              <span>Date: ________________</span>
              <span style={{ border: "2px solid #000", padding: "4px 12px", fontWeight: 700, borderRadius: "4px", display: "inline-block", textAlign: "center" }}>
                Score: {worksheet.score !== null ? `${worksheet.score} / ${worksheet.totalMarks}` : "   / " + worksheet.totalMarks}
              </span>
            </div>
          </div>

          {/* Worksheet Questions */}
          <div style={{ minHeight: "400px" }}>
            {isEarlyLearner ? (
              // Early Learners Activity Layout
              data.activities?.map((act, idx) => (
                <div key={idx} className="question-block" style={{ marginBottom: "30px" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "10px", color: "#000" }}>
                    Activity {idx + 1}: {act.instruction}
                  </h3>
                           {/* Matching Activity */}
                  {act.type === "MATCHING" && act.items && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 40px", fontSize: "0.95rem" }}>
                      <div>
                        {act.items.map((item, i) => (
                          <div key={i} style={{ margin: "10px 0", display: "flex", gap: "10px", alignItems: "baseline" }}>
                            <span>{i + 1}. {item.left}</span>
                            <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500 }}>[{item.marks || 1} M]</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {act.items.map((item, i) => (
                          <div key={i} style={{ margin: "10px 0" }}>&bull; {item.right}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fill in the Blanks Activity */}
                  {act.type === "FILL_BLANKS" && act.questions && (
                    <div style={{ fontSize: "0.95rem", paddingLeft: "10px" }}>
                      {act.wordBank && (
                        <div style={{ border: "1.5px dashed #000", padding: "10px", borderRadius: "6px", textAlign: "center", marginBottom: "16px", fontWeight: 600 }}>
                          Word Box: [ {act.wordBank.join(", ")} ]
                        </div>
                      )}
                      {(act.questions as BlankQuestion[]).map((q, i) => (
                        <div key={i} style={{ margin: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span>{i + 1}. {q.sentence}</span>
                          <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500 }}>[{q.marks || 1} Mark]</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Odd One Out Activity */}
                  {act.type === "ODD_OUT" && act.questions && (
                    <div style={{ fontSize: "0.95rem", paddingLeft: "10px" }}>
                      {(act.questions as OddOutQuestion[]).map((q, i) => (
                        <div key={i} style={{ margin: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span>{i + 1}. Row: &nbsp;<strong>[ {q.words.join(", ")} ]</strong></span>
                          <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500 }}>[{q.marks || 1} Mark]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Standard Middle School Exam Layout
              data.sections?.map((section, idx) => (
                <div key={idx} style={{ marginBottom: "32px" }}>
                  <h2 style={{ fontSize: "1.15rem", borderBottom: "2px solid #000", paddingBottom: "4px", marginBottom: "14px", color: "#4f46e5" }}>
                    {section.name}
                  </h2>
                  {section.questions?.map((q, qIdx) => (
                    <div key={q.id} className="question-block" style={{ marginBottom: "20px", fontSize: "0.95rem" }}>
                      <p style={{ fontWeight: 600, color: "#000", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span>Q{getQuestionNumber(idx, qIdx)}: {q.text}</span>
                        <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500, whiteSpace: "nowrap", marginLeft: "10px" }}>
                          [{q.marks || (q.type === "MCQ" ? 1 : q.type === "SHORT" ? 2 : 4)} {(q.marks === 1 || (!q.marks && q.type === "MCQ")) ? 'Mark' : 'Marks'}]
                        </span>
                      </p>
                      
                      {q.type === "MCQ" && q.options && (
                        <div className="mcq-grid">
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx}>
                              {String.fromCharCode(97 + oIdx)}) {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === "SHORT" && (
                        <div style={{ height: "40px", borderBottom: "1px dashed #cbd5e1", marginTop: "10px" }}></div>
                      )}

                      {q.type === "LONG" && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ height: "24px", borderBottom: "1px dashed #cbd5e1" }}></div>
                          <div style={{ height: "24px", borderBottom: "1px dashed #cbd5e1", marginTop: "6px" }}></div>
                          <div style={{ height: "24px", borderBottom: "1px dashed #cbd5e1", marginTop: "6px" }}></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer watermark */}
          <div style={{ borderTop: "2px solid #000", paddingTop: "12px", marginTop: "40px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#475569" }}>
            <span>Generated for free on <strong>pracup.co.in</strong></span>
            <span>Study regular, score high!</span>
          </div>


          {/* PRINT-ONLY PAGE BREAK FOR THE ANSWER KEY */}
          {showSolutions && (
            <div className="print-only-answer-key">
              <div style={{ borderBottom: "3px solid #000", paddingBottom: "16px", marginBottom: "24px", marginTop: "40px" }}>
                <h1 style={{ fontSize: "1.6rem", color: "#000" }}>Answer Key & Solutions</h1>
                <p style={{ fontSize: "0.9rem", color: "#64748b" }}>Parent reference manual for worksheet validation.</p>
              </div>
              
              {isEarlyLearner ? (
                data.activities?.map((act, idx) => (
                  <div key={idx} style={{ marginBottom: "20px", fontSize: "0.95rem" }}>
                    <h3 style={{ fontWeight: 700, color: "#000" }}>Activity {idx + 1} Answers:</h3>
                    {act.type === "MATCHING" && act.items && (
                      <ul style={{ paddingLeft: "20px", marginTop: "6px" }}>
                        {act.items.map((item, i) => (
                          <li key={i}>{item.left} &rarr; <strong>{item.right}</strong></li>
                        ))}
                      </ul>
                    )}
                    {act.type === "FILL_BLANKS" && act.questions && (
                      <ul style={{ paddingLeft: "20px", marginTop: "6px" }}>
                        {(act.questions as BlankQuestion[]).map((q, i) => (
                          <li key={i}>Sentence {i + 1}: <strong>{q.answer}</strong></li>
                        ))}
                      </ul>
                    )}
                    {act.type === "ODD_OUT" && act.questions && (
                      <ul style={{ paddingLeft: "20px", marginTop: "6px" }}>
                        {(act.questions as OddOutQuestion[]).map((q, i) => (
                          <li key={i}>Row {i + 1}: Odd word is <strong>{q.answer}</strong> ({q.explanation})</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                data.sections?.map((section, idx) => (
                  <div key={idx} style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "1.1rem", borderBottom: "1.5px solid #000", paddingBottom: "4px", marginBottom: "10px", color: "#000" }}>
                      Answers: {section.name}
                    </h3>
                    {section.questions?.map((q, qIdx) => (
                      <div key={q.id} style={{ marginBottom: "14px", fontSize: "0.9rem" }}>
                        <p style={{ fontWeight: 700, color: "#000" }}>
                          Q{getQuestionNumber(idx, qIdx)}: Correct Answer: {q.answer}
                        </p>
                        <p style={{ color: "#475569", fontStyle: "italic", marginTop: "2px" }}>
                          Solution Guide: {q.solutionExplanation}
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Dynamic inline styles to hide interface elements on printing */}
      <style jsx global>{`
        @media (max-width: 600px) {
          .printable-sheet {
            padding: 20px 14px !important;
          }
        }
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .no-print, #particles-bg {
            display: none !important;
          }
          .print-container {
            display: block !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
          .print-only-answer-key {
            display: block !important;
            page-break-before: always !important;
          }
          .question-block {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="glass-card" style={{ padding: "30px", width: "100%", maxWidth: "450px", margin: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
            <h3 style={{ fontSize: "1.3rem", color: "var(--accent-purple)", marginBottom: "10px", fontFamily: "var(--font-heading)" }}>
              Unlock Answer Keys & Pro Features
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
              Viewing correct answer keys, solutions explanations, and printing solved worksheets are Pro features.
            </p>
            <div style={{
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "24px",
              fontSize: "0.8rem",
              color: "var(--accent-purple)"
            }}>
              🎉 <strong>Special Offer:</strong> Create a student profile today to save progress, track accuracy, and unlock detailed solution keys!
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => setShowUpgradeModal(false)}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1 }} 
                onClick={() => router.push("/dashboard?mode=signup")}
              >
                Get Pro for Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Worksheet Grader Modal */}
      {showGraderModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "800px", margin: "20px", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", color: "#0f172a", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-purple)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                  Worksheet Grading Panel
                </span>
                <h3 style={{ fontSize: "1.3rem", marginTop: "2px", color: "#0f172a" }}>
                  {worksheet.topic}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {worksheet.subject} • {worksheet.difficulty} • {worksheet.data?.grade || data.grade}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Calculated Score</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-purple)", fontFamily: "var(--font-heading)" }}>
                  {gradingMode === "manual" 
                    ? `${getCalculatedScore()} / ${worksheet.totalMarks || 20}`
                    : `${aiReviewResult ? aiReviewResult.score : "--"} / ${worksheet.totalMarks || 20}`
                  }
                </div>
              </div>
            </div>

            {/* Tabs for Manual vs AI Grading */}
            <div className="slider-tabs-container" style={{ marginBottom: "20px", background: "rgba(0,0,0,0.04)", padding: "2px", borderRadius: "8px" }}>
              <button
                type="button"
                className={`slider-tab-btn ${gradingMode === "manual" ? "active" : ""}`}
                onClick={() => setGradingMode("manual")}
                disabled={uploadingPdf}
                style={{ color: gradingMode === "manual" ? "#0f172a" : "#475569" }}
              >
                Manual Grading
              </button>
              <button
                type="button"
                className={`slider-tab-btn ${gradingMode === "ai" ? "active" : ""}`}
                onClick={() => setGradingMode("ai")}
                disabled={uploadingPdf}
                style={{ color: gradingMode === "ai" ? "#0f172a" : "#475569" }}
              >
                AI PDF/Image Reviewer
              </button>
              <div className={`slider-tab-indicator ${gradingMode === "ai" ? "right cyan-gradient" : ""}`} style={{ background: "var(--accent-purple)" }} />
            </div>

            {gradingMode === "manual" ? (
              /* MANUAL GRADING TAB */
              <div style={{ flexGrow: 1, overflowY: "auto", margin: "0 0 20px 0", paddingRight: "8px", maxHeight: "55vh" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(() => {
                    const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(data.grade);
                    const wsData = data;

                    if (isEarly) {
                      return wsData.activities?.map((act: any, actIdx: number) => (
                        <div key={actIdx} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "16px" }}>
                          <h4 style={{ color: "var(--accent-purple)", marginBottom: "6px", fontSize: "0.95rem", fontWeight: 700 }}>
                            Activity {actIdx + 1}: {act.type.replace("_", " ")}
                          </h4>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                            {act.instruction}
                          </p>

                          {act.type === "MATCHING" && act.items && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {act.items.map((item: any, qIdx: number) => {
                                const key = `act_${actIdx}_q_${qIdx}`;
                                const isCorrect = graderScores[key] !== false;
                                return (
                                  <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                                      <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                      <span style={{ fontSize: "0.85rem", color: "#0f172a" }}>{item.left} &rarr; <strong>{item.right}</strong></span>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                        style={{
                                          background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                          border: "1px solid " + (isCorrect ? "#10b981" : "rgba(0,0,0,0.06)"),
                                          color: isCorrect ? "#059669" : "var(--text-secondary)",
                                          padding: "4px 8px",
                                          fontSize: "0.7rem",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Correct
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: false }))}
                                        style={{
                                          background: !isCorrect ? "rgba(239, 68, 68, 0.2)" : "transparent",
                                          border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(0,0,0,0.06)"),
                                          color: !isCorrect ? "#dc2626" : "var(--text-secondary)",
                                          padding: "4px 8px",
                                          fontSize: "0.7rem",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Incorrect
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {act.type === "FILL_BLANKS" && act.questions && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {act.questions.map((q: any, qIdx: number) => {
                                const key = `act_${actIdx}_q_${qIdx}`;
                                const isCorrect = graderScores[key] !== false;
                                return (
                                  <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                    <div style={{ flex: 1, marginRight: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                                      <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                      <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: "0.85rem", color: "#0f172a" }}>{q.sentence}</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                          Answer Box: <strong style={{ color: "#059669" }}>{q.answer}</strong>
                                        </p>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                        style={{
                                          background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                          border: "1px solid " + (isCorrect ? "#10b981" : "rgba(0,0,0,0.06)"),
                                          color: isCorrect ? "#059669" : "var(--text-secondary)",
                                          padding: "4px 8px",
                                          fontSize: "0.7rem",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Correct
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: false }))}
                                        style={{
                                          background: !isCorrect ? "rgba(239, 68, 68, 0.2)" : "transparent",
                                          border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(0,0,0,0.06)"),
                                          color: !isCorrect ? "#dc2626" : "var(--text-secondary)",
                                          padding: "4px 8px",
                                          fontSize: "0.7rem",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Incorrect
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {act.type === "ODD_OUT" && act.questions && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {act.questions.map((q: any, qIdx: number) => {
                                const key = `act_${actIdx}_q_${qIdx}`;
                                const isCorrect = graderScores[key] !== false;
                                return (
                                  <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                    <div style={{ flex: 1, marginRight: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                                      <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                      <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: "0.85rem", color: "#0f172a" }}>[ {q.words?.join(", ")} ]</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                          Odd One: <strong style={{ color: "#059669" }}>{q.answer}</strong> ({q.explanation})
                                        </p>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                        style={{
                                          background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                          border: "1px solid " + (isCorrect ? "#10b981" : "rgba(0,0,0,0.06)"),
                                          color: isCorrect ? "#059669" : "var(--text-secondary)",
                                          padding: "4px 8px",
                                          fontSize: "0.7rem",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Correct
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: false }))}
                                        style={{
                                          background: !isCorrect ? "rgba(239, 68, 68, 0.2)" : "transparent",
                                          border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(0,0,0,0.06)"),
                                          color: !isCorrect ? "#dc2626" : "var(--text-secondary)",
                                          padding: "4px 8px",
                                          fontSize: "0.7rem",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        Incorrect
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ));
                    } else {
                      return wsData.sections?.map((section: any, secIdx: number) => (
                        <div key={secIdx} style={{ marginBottom: "20px" }}>
                          <h4 style={{ color: "var(--accent-purple)", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "4px", marginBottom: "12px", fontSize: "0.95rem", fontWeight: 700 }}>
                            {section.name}
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {section.questions?.map((q: any) => {
                              const key = q.id;
                              const isCorrect = graderScores[key] !== false;
                              return (
                                <div key={q.id} style={{ background: "rgba(0,0,0,0.01)", padding: "12px 16px", borderRadius: "8px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                                    <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                      <div style={{ marginTop: "4px" }}>
                                        <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>{q.text}</p>
                                        {q.type === "MCQ" && q.options && (
                                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px", paddingLeft: "10px" }}>
                                            {q.options.map((opt: any, oIdx: number) => (
                                              <div key={oIdx} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                                {String.fromCharCode(97 + oIdx)}) {opt}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <div style={{ marginTop: "10px", background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: "6px", padding: "8px 12px" }}>
                                          <p style={{ fontSize: "0.8rem", color: "#059669" }}>
                                            <strong>Correct Answer:</strong> {q.answer}
                                          </p>
                                          {q.solutionExplanation && (
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                              <strong>Explanation:</strong> {q.solutionExplanation}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                        style={{
                                          background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                          border: "1px solid " + (isCorrect ? "#10b981" : "rgba(0,0,0,0.06)"),
                                          color: isCorrect ? "#059669" : "var(--text-secondary)",
                                          padding: "5px 10px",
                                          fontSize: "0.75rem",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                          fontWeight: 600
                                        }}
                                      >
                                        Correct
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setGraderScores(prev => ({ ...prev, [key]: false }))}
                                        style={{
                                          background: !isCorrect ? "rgba(239, 68, 68, 0.2)" : "transparent",
                                          border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(0,0,0,0.06)"),
                                          color: !isCorrect ? "#dc2626" : "var(--text-secondary)",
                                          padding: "5px 10px",
                                          fontSize: "0.75rem",
                                          borderRadius: "4px",
                                          cursor: "pointer",
                                          fontWeight: 600
                                        }}
                                      >
                                        Incorrect
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    }
                  })()}
                </div>
              </div>
            ) : (
              /* AI REVIEWER TAB */
              <div style={{ flexGrow: 1, overflowY: "auto", margin: "0 0 20px 0", paddingRight: "8px", maxHeight: "55vh" }}>
                {uploadingPdf ? (
                  /* LOADING STATE */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      border: "3px solid rgba(124, 58, 237, 0.1)",
                      borderTop: "3px solid var(--accent-purple)",
                      animation: "spin 1.2s linear infinite",
                      marginBottom: "20px"
                    }} />
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Grading solved worksheet...</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>
                      {uploadProgressMsg}
                    </p>
                  </div>
                ) : !aiReviewResult ? (
                  /* UPLOAD FORM STATE */
                  <form onSubmit={handlePdfUpload} style={{ padding: "10px 10px 20px 10px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
                    <div style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.01)",
                      border: "2px dashed rgba(124, 58, 237, 0.3)",
                      borderRadius: "12px",
                      padding: "40px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => document.getElementById("grader-file-upload")?.click()}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent-purple)"; e.currentTarget.style.background = "rgba(124, 58, 237, 0.03)"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.3)"; e.currentTarget.style.background = "rgba(0,0,0,0.01)"; }}
                    >
                      <input
                        id="grader-file-upload"
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: "none" }}
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                      />
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>
                        {pdfFile ? pdfFile.name : "Select or Drop Solved PDF or Scanned Photo"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        {pdfFile ? `(${(pdfFile.size / 1024 / 1024).toFixed(2)} MB) - Click to change` : "Supports PDF documents or PNG, JPG, WEBP photos"}
                      </p>
                    </div>

                    {/* OCR Formatting Guidelines */}
                    <div style={{
                      width: "100%",
                      background: "rgba(124, 58, 237, 0.03)",
                      border: "1px solid rgba(124, 58, 237, 0.15)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      textAlign: "left"
                    }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-purple)" }}>OCR Scanner Formatting Guide</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <li>Write question numbers as standard text (like <strong>1.</strong> or <strong>2)</strong>) instead of cursive (like <em>Q1)</em>).</li>
                        <li>Keep both question numbers and answers to the right of red vertical margin lines.</li>
                        <li>For MCQ options, clearly write the letter and option text (e.g. <strong>a) Base</strong> or <strong>b) Hydrochloric</strong>).</li>
                        <li>Avoid crossing out answers. Make sure the photo is bright, clear, and shot straight-on.</li>
                      </ul>
                    </div>

                    {aiReviewError && (
                      <div style={{ width: "100%", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", padding: "12px", color: "#dc2626", fontSize: "0.8rem", textAlign: "center" }}>
                        {aiReviewError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!pdfFile || uploadingPdf}
                      style={{ padding: "12px 30px", fontSize: "0.85rem", display: "flex", gap: "10px", alignItems: "center", background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
                    >
                      <span>Analyze & Grade Solved Work</span>
                    </button>
                  </form>
                ) : (
                  /* REVIEW RESULTS COMPLETED STATE */
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <h4 style={{ color: "#059669", fontWeight: 700, fontSize: "0.95rem" }}>AI Review Completed Successfully!</h4>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "2px" }}>The final score has been submitted to this worksheet's history log.</p>
                      </div>
                    </div>

                    {(() => {
                      const totalAnswers = aiReviewResult.feedback?.length || 0;
                      const lowConfidenceCount = aiReviewResult.feedback?.filter((item: any) => item.lowConfidence).length || 0;
                      const highConfidenceCount = totalAnswers - lowConfidenceCount;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.15)", borderRadius: "10px", padding: "12px 16px" }}>
                          <div style={{ fontSize: "1.2rem" }}>📊</div>
                          <div>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1d4ed8" }}>OCR Quality Scan Summary</span>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                              <strong>{highConfidenceCount}</strong> of <strong>{totalAnswers}</strong> answers read with high confidence.
                              {lowConfidenceCount > 0 && ` Verify the remaining ${lowConfidenceCount} flagged answer(s) below.`}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {aiReviewResult.feedback?.map((item: any, idx: number) => {
                        const isCorrect = item.status === "CORRECT";
                        
                        let questionText = `Question ${item.questionId}`;
                        let expectedAnswer = "Expected Answer Key";
                        const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(data.grade);
                        
                        if (isEarly) {
                          try {
                            const parts = item.questionId.split("_");
                            const actIdx = parseInt(parts[1], 10);
                            const qIdx = parseInt(parts[3], 10);
                            const act = data.activities?.[actIdx];
                            if (act) {
                              if (act.type === "MATCHING") {
                                const matched = act.items?.[qIdx];
                                questionText = `Activity ${actIdx + 1} Match: ${matched?.left || ""}`;
                                expectedAnswer = matched?.right || item.expectedAnswer || "";
                              } else {
                                const q = act.questions?.[qIdx];
                                questionText = `Activity ${actIdx + 1}: ${(q as any)?.sentence || (q as any)?.words?.join(", ") || ""}`;
                                expectedAnswer = (q as any)?.answer || item.expectedAnswer || "";
                              }
                            }
                          } catch (e) {}
                        } else {
                          try {
                            const sections = data.sections || [];
                            for (const sec of sections) {
                              const q = sec.questions?.find((quest: any) => quest.id === item.questionId);
                              if (q) {
                                questionText = q.text;
                                expectedAnswer = q.answer || item.expectedAnswer || "";
                                break;
                              }
                            }
                          } catch (e) {}
                        }

                        return (
                          <div key={idx} style={{
                            background: "rgba(0,0,0,0.005)",
                            border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)",
                            borderRadius: "8px",
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isCorrect ? "#059669" : "#dc2626", background: isCorrect ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: "1px solid " + (isCorrect ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"), borderRadius: "4px", padding: "2px 8px" }}>
                                  {isCorrect ? "Correct" : "Incorrect"}
                                </span>
                                {item.lowConfidence && (
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "4px", padding: "2px 8px" }}>
                                    ⚠️ Low confidence — verify manually
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>ID: {item.questionId}</span>
                            </div>

                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.4 }}>{questionText}</p>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "rgba(0,0,0,0.015)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.75rem" }}>
                              <div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Expected Answer:</span>
                                <p style={{ color: "#059669", fontWeight: 600, marginTop: "2px" }}>{expectedAnswer}</p>
                              </div>
                              <div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Student Wrote:</span>
                                <p style={{ color: isCorrect ? "#059669" : "#dc2626", fontWeight: 600, marginTop: "2px" }}>{item.studentAnswer || "Not specified"}</p>
                              </div>
                            </div>

                            {worksheet.studentProfileId ? (
                              <div style={{ background: "rgba(124, 58, 237, 0.03)", border: "1px solid rgba(124, 58, 237, 0.1)", borderRadius: "6px", padding: "8px 12px", fontSize: "0.75rem" }}>
                                <span style={{ color: "#7c3aed", fontWeight: 600 }}>AI Feedback Report:</span>
                                <p style={{ color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>{item.feedback}</p>
                              </div>
                            ) : (
                              <div style={{ background: "rgba(167, 139, 250, 0.05)", border: "1px dashed rgba(167, 139, 250, 0.25)", borderRadius: "6px", padding: "10px 12px", fontSize: "0.75rem" }}>
                                <span style={{ color: "#7c3aed", fontWeight: 600 }}>🔒 Step-by-Step AI Feedback Report:</span>
                                <p style={{ color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.4, fontStyle: "italic" }}>
                                  Detailed step-by-step explanations are reserved for registered users. Create a free Student Profile to unlock detailed explanations!
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "20px" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "55%", margin: 0, lineHeight: 1.4 }}>
                {gradingMode === "manual" 
                  ? "Incorrect questions automatically trigger target weight adjustments in future worksheets."
                  : "AI scores and feedback reports are saved directly to the worksheet logs."
                }
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                  onClick={() => { setShowGraderModal(false); setGraderScores({}); setAiReviewResult(null); setPdfFile(null); }}
                  disabled={submittingGrade || uploadingPdf}
                >
                  {aiReviewResult ? "Done & Close" : "Cancel"}
                </button>
                {gradingMode === "manual" && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: "8px 20px", fontSize: "0.8rem", background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
                    onClick={submitGrading}
                    disabled={submittingGrade || !worksheet}
                  >
                    {submittingGrade ? "Saving Grade..." : "Submit Grades"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downloading Overlay */}
      {downloadingMsg && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255, 255, 255, 0.95)",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid rgba(124, 58, 237, 0.2)",
            borderTop: "4px solid var(--accent-purple)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}} />
          <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {downloadingMsg}
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Creating high-quality pages, please wait...
          </span>
        </div>
      )}
    </main>
  );
}
