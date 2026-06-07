// src/app/dashboard/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThreeBackground from "@/components/ThreeBackground";
import ChatAgent from "@/components/ChatAgent";

interface WorksheetRecord {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  score: number | null;
  totalMarks: number;
  attemptsJson?: string | null;
  createdAt: string;
}

interface WeaknessRecord {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  errorCount: number;
  successCount: number;
}

interface Profile {
  id: string;
  name: string;
  grade: string;
  board: string;
  parentPin: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  studentPhone?: string | null;
  username?: string | null;
  password?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");

  // Animated KPI statistics count-ups
  const [animatedWorksheetsCount, setAnimatedWorksheetsCount] = useState(0);
  const [animatedGradingRate, setAnimatedGradingRate] = useState(0);
  const [animatedAverageScore, setAnimatedAverageScore] = useState(0);
  
  // App states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [worksheets, setWorksheets] = useState<WorksheetRecord[]>([]);
  const [weaknesses, setWeaknesses] = useState<WeaknessRecord[]>([]);

  // Auth screen states
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [existingProfiles, setExistingProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [parentContactInput, setParentContactInput] = useState("");
  const [hasSearchedProfiles, setHasSearchedProfiles] = useState(false);

  // New Tabbed Auth states
  const [signInTab, setSignInTab] = useState<"student" | "parent">("student");
  const [studentUsernameInput, setStudentUsernameInput] = useState("");
  const [studentPasswordInput, setStudentPasswordInput] = useState("");
  const [parentPhoneInput, setParentPhoneInput] = useState("");
  const [parentOtpInput, setParentOtpInput] = useState("");
  const [parentOtpCode, setParentOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Profile Login Password verification states
  const [selectedProfileForLogin, setSelectedProfileForLogin] = useState<Profile | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Registration form states
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regGrade, setRegGrade] = useState("Class 6");
  const [regBoard, setRegBoard] = useState("CBSE");
  const [regPin, setRegPin] = useState("0000");
  const [regParentEmail, setRegParentEmail] = useState("");
  const [regParentPhone, setRegParentPhone] = useState("");
  const [regStudentPhone, setRegStudentPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [submittingReg, setSubmittingReg] = useState(false);

  // Edit parent details & verification states
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [showEditOtpVerify, setShowEditOtpVerify] = useState(false);
  const [editOtpInput, setEditOtpInput] = useState("");
  const [editOtpError, setEditOtpError] = useState<string | null>(null);
  const [editGeneratedOtp, setEditGeneratedOtp] = useState("");
  const [editSimulatedAlert, setEditSimulatedAlert] = useState<string | null>(null);
  const [editParentVerified, setEditParentVerified] = useState(false);

  // OTP Verification states for PIN configuration and forgot-PIN flows (Deprecated)
  const [pinModalMode, setPinModalMode] = useState<"enter" | "otp_verify" | "set_new">("enter");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [simulatedAlert, setSimulatedAlert] = useState<string | null>(null);

  // Payment step states
  const [signupStep, setSignupStep] = useState<"details" | "payment">("details");

  // Parent view states
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  // Grader Modal states
  const [gradingWorksheetId, setGradingWorksheetId] = useState<string | null>(null);
  const [gradingWorksheetData, setGradingWorksheetData] = useState<any | null>(null);
  const [loadingGradingData, setLoadingGradingData] = useState(false);
  const [graderScores, setGraderScores] = useState<Record<string, boolean>>({});
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [pendingGradingWorksheetId, setPendingGradingWorksheetId] = useState<string | null>(null);
  const [pendingEditProfile, setPendingEditProfile] = useState(false);
  const [hoveredProgressPoint, setHoveredProgressPoint] = useState<any>(null);

  // AI PDF Review states
  const [gradingMode, setGradingMode] = useState<"manual" | "ai">("manual");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<any | null>(null);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("Uploading file...");

  // Progress message cycler for AI reviews
  useEffect(() => {
    if (!uploadingPdf) return;
    const msgs = [
      "Uploading solved PDF sheet...",
      "Extracting text solutions...",
      "Sending content to SheetMate AI reviewer...",
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

  // Edit Profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editGrade, setEditGrade] = useState("Class 6");
  const [editBoard, setEditBoard] = useState("CBSE");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Read local ID and parent session on mount
  useEffect(() => {
    // Check mode query param
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setAuthMode("signup");
    }

    const savedId = localStorage.getItem("sheetmate_profile_id");
    if (savedId) {
      setProfileId(savedId);
    } else {
      setLoading(false);
    }

    const savedParentPhone = localStorage.getItem("sheetmate_parent_phone");
    if (savedParentPhone) {
      setParentUnlocked(true);
    }
  }, []);

  // Reset states when switching auth mode
  useEffect(() => {
    setSignupStep("details");
    setParentContactInput("");
    setExistingProfiles([]);
    setHasSearchedProfiles(false);
    setError(null);
    setRegPassword("");
    setShowRegPassword(false);
    setShowLoginPassword(false);
    setOtpSent(false);
    setParentPhoneInput("");
    setParentOtpInput("");
    setStudentUsernameInput("");
    setStudentPasswordInput("");
    setSimulatedAlert(null);
  }, [authMode]);

  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string; feedback: { key: string; text: string; passed: boolean }[] } => {
    const feedback = [
      { key: "length", text: "At least 8 characters", passed: pwd.length >= 8 },
      { key: "uppercase", text: "At least one uppercase letter (A-Z)", passed: /[A-Z]/.test(pwd) },
      { key: "lowercase", text: "At least one lowercase letter (a-z)", passed: /[a-z]/.test(pwd) },
      { key: "number", text: "At least one number (0-9)", passed: /[0-9]/.test(pwd) },
      { key: "special", text: "At least one special character (e.g. !@#$%^&*)", passed: /[^A-Za-z0-9]/.test(pwd) }
    ];

    if (!pwd) return { score: 0, label: "", color: "transparent", feedback };

    const passedCount = feedback.filter(f => f.passed).length;
    let label = "Weak";
    let color = "#ef4444";
    if (passedCount === 5) {
      label = "Strong";
      color = "#10b981";
    } else if (passedCount >= 3) {
      label = "Moderate";
      color = "#3b82f6";
    }

    return { score: passedCount, label, color, feedback };
  };

  const validatePasswordStrength = (pwd: string): string | null => {
    const strength = getPasswordStrength(pwd);
    const failedItems = strength.feedback.filter(f => !f.passed);
    if (failedItems.length > 0) {
      return `Password does not meet strength requirements. Missing:\n${failedItems.map(f => `• ${f.text}`).join("\n")}`;
    }
    return null;
  };

  // Handle manual searching of student profiles using parent contact info
  const handleSearchProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = parentContactInput.trim();
    if (!query) return;

    try {
      setLoadingProfiles(true);
      setHasSearchedProfiles(true);
      setError(null);
      const res = await fetch(`/api/student/profiles?contact=${encodeURIComponent(query)}&password=${encodeURIComponent(loginPassword)}`);
      if (res.ok) {
        const data = await res.json();
        setExistingProfiles(data);
        if (data.length === 1) {
          // If exactly one child profile matches, log in directly!
          selectProfile(data[0].id);
        }
      } else {
        setExistingProfiles([]);
      }
    } catch (err) {
      console.error("Failed to search profiles:", err);
      setExistingProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Fetch dashboard metrics when profileId is set
  useEffect(() => {
    if (!profileId) return;

    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/dashboard?id=${profileId}`);
        if (!res.ok) {
          throw new Error("Failed to load profile details. Check connection.");
        }
        const data = await res.json();
        setProfile(data.profile);
        setWorksheets(data.worksheets);
        setWeaknesses(data.weaknesses);
      } catch (err) {
        setError((err as Error).message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [profileId]);

  // Count-up animation loops for statistics KPI counters
  useEffect(() => {
    if (!parentUnlocked) return;

    // Derived statistics calculations run inside hook scope to prevent block scope ordering issues
    const filteredW = subjectFilter === "ALL" 
      ? worksheets 
      : worksheets.filter(ws => ws.subject?.toUpperCase() === subjectFilter.toUpperCase());

    const totalCount = filteredW.length;
    
    const gradedCount = filteredW.filter(ws => {
      if (!ws.attemptsJson) return false;
      try {
        const arr = JSON.parse(ws.attemptsJson);
        return Array.isArray(arr) && arr.length > 0;
      } catch (_) {
        return false;
      }
    }).length;
    const ratePercent = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

    const allPercentageScores: number[] = [];
    filteredW.forEach(ws => {
      if (ws.attemptsJson) {
        try {
          const arr = JSON.parse(ws.attemptsJson);
          if (Array.isArray(arr)) {
            arr.forEach((att: any) => {
              const score = typeof att.score === "number" ? att.score : (ws.score || 0);
              const totalMarks = (typeof att.totalMarks === "number" ? att.totalMarks : ws.totalMarks) || 10;
              const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
              allPercentageScores.push(percentage);
            });
          }
        } catch (_) {}
      }
    });

    const averagePercent = allPercentageScores.length > 0
      ? Math.round(allPercentageScores.reduce((sum, val) => sum + val, 0) / allPercentageScores.length)
      : 0;

    let active = true;
    const animateValue = (start: number, end: number, duration: number, setter: (val: number) => void) => {
      if (start === end) {
        setter(end);
        return;
      }
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!active) return;
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setter(Math.floor(progress * (end - start) + start));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    animateValue(0, totalCount, 850, setAnimatedWorksheetsCount);
    animateValue(0, ratePercent, 850, setAnimatedGradingRate);
    animateValue(0, averagePercent, 850, setAnimatedAverageScore);

    return () => {
      active = false;
    };
  }, [worksheets, subjectFilter, parentUnlocked]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    if (!regUsername.trim()) {
      setError("Username is required.");
      return;
    }

    const pwdError = validatePasswordStrength(regPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    setSubmittingReg(true);
    setError(null);

    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          grade: regGrade,
          board: "CBSE",
          parentPin: "0000",
          parentEmail: regParentEmail || null,
          parentPhone: regParentPhone || null,
          studentPhone: regStudentPhone || null,
          username: regUsername.trim(),
          password: regPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register profile");
      }

      localStorage.removeItem("sheetmate_parent_phone");
      setParentUnlocked(false);
      localStorage.setItem("sheetmate_profile_id", data.profileId);
      setProfileId(data.profileId);

    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setSubmittingReg(false);
    }
  };

  const selectProfile = (pId: string) => {
    localStorage.setItem("sheetmate_profile_id", pId);
    setProfileId(pId);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUsernameInput.trim() || !studentPasswordInput) return;

    setLoadingProfiles(true);
    setError(null);

    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: studentUsernameInput.trim(),
          password: studentPasswordInput
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.removeItem("sheetmate_parent_phone");
      setParentUnlocked(false);
      localStorage.setItem("sheetmate_profile_id", data.profileId);
      setProfileId(data.profileId);
      setStudentUsernameInput("");
      setStudentPasswordInput("");
    } catch (err) {
      setError((err as Error).message || "Verification failed");
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleParentOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentPhoneInput.trim()) return;

    setLoadingProfiles(true);
    setError(null);
    setOtpSent(false);
    setSimulatedAlert(null);

    try {
      const res = await fetch("/api/parent/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPhone: parentPhoneInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request OTP");
      }

      setParentOtpCode(data.otp);
      setOtpSent(true);
      setSimulatedAlert(data.message);
    } catch (err) {
      setError((err as Error).message || "Failed to send OTP");
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleParentOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parentOtpInput !== parentOtpCode) {
      setError("Incorrect OTP verification code. Please try again.");
      return;
    }

    setLoadingProfiles(true);
    setError(null);

    try {
      localStorage.setItem("sheetmate_parent_phone", parentPhoneInput.trim());
      setParentUnlocked(true);
      setHasSearchedProfiles(true);
      
      const res = await fetch(`/api/student/profiles?contact=${encodeURIComponent(parentPhoneInput.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setExistingProfiles(data);
      } else {
        setExistingProfiles([]);
      }
    } catch (err) {
      console.error("Failed to load profiles:", err);
      setExistingProfiles([]);
    } finally {
      setLoadingProfiles(false);
      setOtpSent(false);
      setParentOtpInput("");
      setParentOtpCode("");
      setSimulatedAlert(null);
    }
  };

  const openParentUnlockModal = () => {
    setError(null);
    setOtpSent(false);
    setParentOtpInput("");
    setParentOtpCode("");
    setSimulatedAlert(null);
    setShowPinModal(true);
    
    if (profile && profile.parentPhone) {
      fetch("/api/parent/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPhone: profile.parentPhone })
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to send OTP");
          return res.json();
        })
        .then(data => {
          setParentOtpCode(data.otp);
          setOtpSent(true);
          setSimulatedAlert(data.message);
        })
        .catch(err => {
          setError(err.message || "Failed to send verification code.");
        });
    } else {
      setError("No parent mobile number registered to this profile. Please update profile details in settings.");
    }
  };

  const handleRequestWorkspaceParentOtp = async () => {
    if (!profile || !profile.parentPhone) return;
    setError(null);
    setOtpSent(false);
    setSimulatedAlert(null);
    try {
      const res = await fetch("/api/parent/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPhone: profile.parentPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger OTP");

      setParentOtpCode(data.otp);
      setOtpSent(true);
      setSimulatedAlert(data.message);
    } catch (err) {
      setError((err as Error).message || "Failed to send verification code.");
    }
  };

  const handleVerifyWorkspaceParentOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (parentOtpInput === parentOtpCode) {
      setParentUnlocked(true);
      setShowPinModal(false);
      setParentOtpInput("");
      setParentOtpCode("");
      setSimulatedAlert(null);
      setError(null);
      setOtpSent(false);

      if (pendingGradingWorksheetId) {
        const wsId = pendingGradingWorksheetId;
        setPendingGradingWorksheetId(null);
        setTimeout(() => {
          openGrader(wsId, true);
        }, 100);
      } else if (pendingEditProfile) {
        setPendingEditProfile(false);
        setTimeout(() => {
          openEditModal();
        }, 100);
      }
    } else {
      setError("Incorrect OTP verification code. Please try again.");
    }
  };

  // Deprecated PIN effects and handlers removed for separate Parent OTP flow.

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !gradingWorksheetId) return;

    setUploadingPdf(true);
    setAiReviewError(null);
    setAiReviewResult(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch(`/api/worksheets/${gradingWorksheetId}/review`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to review worksheet");
      }

      setAiReviewResult(data);

      // Re-fetch dashboard data in the background to sync history/weaknesses
      if (profileId) {
        const dashboardRes = await fetch(`/api/student/dashboard?id=${profileId}`);
        if (dashboardRes.ok) {
          const dbData = await dashboardRes.json();
          setWorksheets(dbData.worksheets);
          setWeaknesses(dbData.weaknesses);
        }
      }
    } catch (err) {
      setAiReviewError((err as Error).message || "Something went wrong.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const openGrader = async (wsId: string, bypassPinCheck = false) => {
    if (!parentUnlocked && !bypassPinCheck) {
      setPendingGradingWorksheetId(wsId);
      openParentUnlockModal();
      return;
    }

    try {
      setLoadingGradingData(true);
      setGradingWorksheetId(wsId);
      setGradingWorksheetData(null);
      setGraderScores({});
      setGradingMode("manual");
      setPdfFile(null);
      setUploadingPdf(false);
      setAiReviewResult(null);
      setAiReviewError(null);

      const res = await fetch(`/api/worksheets/${wsId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch worksheet content");
      }
      const data = await res.json();
      setGradingWorksheetData(data);

      const initialScores: Record<string, boolean> = {};
      const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(data.grade || data.data?.grade);

      if (isEarly) {
        const activities = data.data?.activities || [];
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
        const sections = data.data?.sections || [];
        sections.forEach((sec: any) => {
          if (sec.questions) {
            sec.questions.forEach((q: any) => {
              initialScores[q.id] = true;
            });
          }
        });
      }
      setGraderScores(initialScores);

    } catch (err) {
      alert((err as Error).message || "Something went wrong loading worksheet.");
      setGradingWorksheetId(null);
    } finally {
      setLoadingGradingData(false);
    }
  };

  const getCalculatedScore = () => {
    if (!gradingWorksheetData) return 0;
    const totalKeys = Object.keys(graderScores).length;
    if (totalKeys === 0) return 0;
    const correctCount = Object.values(graderScores).filter(v => v === true).length;
    const totalMarks = gradingWorksheetData.totalMarks || 20;
    return Math.round((correctCount / totalKeys) * totalMarks);
  };

  const submitGrading = async () => {
    if (!gradingWorksheetId || !gradingWorksheetData) return;

    try {
      setSubmittingGrade(true);
      const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(gradingWorksheetData.grade || gradingWorksheetData.data?.grade);
      const computedScore = getCalculatedScore();

      const incorrectQuestions: { subtopic: string }[] = [];
      const correctQuestions: { subtopic: string }[] = [];

      if (isEarly) {
        const activities = gradingWorksheetData.data?.activities || [];
        activities.forEach((act: any, actIdx: number) => {
          const actTypeLabel = act.type === "MATCHING" ? "Matching" : act.type === "FILL_BLANKS" ? "Fill Blanks" : "Odd Out";
          const subtopicName = `${gradingWorksheetData.topic} (${actTypeLabel})`;

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
        const sections = gradingWorksheetData.data?.sections || [];
        sections.forEach((sec: any) => {
          if (sec.questions) {
            sec.questions.forEach((q: any) => {
              if (graderScores[q.id] === false) {
                incorrectQuestions.push({
                  subtopic: q.subtopic || gradingWorksheetData.topic
                });
              } else {
                correctQuestions.push({
                  subtopic: q.subtopic || gradingWorksheetData.topic
                });
              }
            });
          }
        });
      }

      const res = await fetch(`/api/worksheets/${gradingWorksheetId}/grade`, {
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

      setGradingWorksheetId(null);
      setGradingWorksheetData(null);
      setGraderScores({});

      const dashboardRes = await fetch(`/api/student/dashboard?id=${profileId}`);
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setWorksheets(data.worksheets);
        setWeaknesses(data.weaknesses);
      }

    } catch (err) {
      alert((err as Error).message || "Something went wrong during grading submission.");
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handleProfileReset = () => {
    if (confirm("Are you sure you want to switch student profiles?")) {
      localStorage.removeItem("sheetmate_profile_id");
      setProfileId(null);
      setProfile(null);
      setWorksheets([]);
      setWeaknesses([]);
      setSubjectFilter("ALL");
      
      const savedParentPhone = localStorage.getItem("sheetmate_parent_phone");
      if (savedParentPhone) {
        setParentUnlocked(true);
        setSignInTab("parent");
        setParentPhoneInput(savedParentPhone);
        setLoadingProfiles(true);
        setHasSearchedProfiles(true);
        setError(null);
        
        fetch(`/api/student/profiles?contact=${encodeURIComponent(savedParentPhone)}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error("Failed to load profiles");
          })
          .then(data => {
            setExistingProfiles(data || []);
          })
          .catch(err => {
            console.error("Failed to load profiles on switch:", err);
            setExistingProfiles([]);
          })
          .finally(() => setLoadingProfiles(false));
      } else {
        setParentUnlocked(false);
        setSignInTab("student");
        setHasSearchedProfiles(false);
        setExistingProfiles([]);
      }
      
      setAuthMode("signin");
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem("sheetmate_profile_id");
    localStorage.removeItem("sheetmate_parent_phone");
    localStorage.setItem("sheetmate_show_logout_toast", "true");
    setProfileId(null);
    setProfile(null);
    setWorksheets([]);
    setWeaknesses([]);
    setParentUnlocked(false);
    setSubjectFilter("ALL");
    setAuthMode("signin");
    router.push("/");
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditUsername(profile.username || "");
    setEditGrade(profile.grade);
    setEditBoard(profile.board);
    setEditParentEmail(profile.parentEmail || "");
    setEditParentPhone(profile.parentPhone || "");
    setEditStudentPhone(profile.studentPhone || "");
    setEditPassword(profile.password || "");
    setShowEditModal(true);
    // Reset OTP verification states for profile edits
    setShowEditOtpVerify(false);
    setEditParentVerified(false);
    setEditOtpInput("");
    setEditOtpError(null);
    setEditSimulatedAlert(null);
  };

  const handleEditSubmit = async (e: React.FormEvent, bypassOtp = false) => {
    e.preventDefault();
    if (!profileId || !profile || !editName.trim()) return;

    if (!editUsername.trim()) {
      alert("Username is required.");
      return;
    }

    const pwdError = validatePasswordStrength(editPassword);
    if (pwdError) {
      alert(pwdError);
      return;
    }

    // Check if parent contact details have changed
    const emailChanged = editParentEmail !== (profile.parentEmail || "");
    const phoneChanged = editParentPhone !== (profile.parentPhone || "");

    if ((emailChanged || phoneChanged) && !editParentVerified && !bypassOtp) {
      // Trigger OTP verification for changing contact info
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      setEditGeneratedOtp(otp);
      setEditOtpInput("");
      setEditOtpError(null);
      setEditSimulatedAlert(`[Simulated Notification] Sent verification code ${otp} to verify your new parent contact details.`);
      setShowEditOtpVerify(true);
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profileId,
          name: editName,
          grade: editGrade,
          board: "CBSE",
          parentPin: profile.parentPin,
          parentEmail: editParentEmail || null,
          parentPhone: editParentPhone || null,
          studentPhone: editStudentPhone || null,
          username: editUsername.trim(),
          password: editPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile");
      }

      setProfile(prev => prev ? {
        ...prev,
        name: editName,
        grade: editGrade,
        board: "CBSE",
        parentEmail: editParentEmail || null,
        parentPhone: editParentPhone || null,
        studentPhone: editStudentPhone || null,
        username: editUsername.trim(),
        password: editPassword
      } : null);

      setShowEditModal(false);
      setShowEditOtpVerify(false);
      setEditParentVerified(false);
      setEditSimulatedAlert(null);

      const dashboardRes = await fetch(`/api/student/dashboard?id=${profileId}`);
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setWorksheets(data.worksheets);
        setWeaknesses(data.weaknesses);
      }

    } catch (err) {
      alert((err as Error).message || "Something went wrong.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleVerifyEditOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (editOtpInput === editGeneratedOtp) {
      setEditParentVerified(true);
      setEditOtpError(null);
      // Re-trigger submit with bypass
      setTimeout(() => {
        const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
        handleEditSubmit(dummyEvent, true);
      }, 100);
    } else {
      setEditOtpError("Incorrect OTP verification code. Please check and try again.");
    }
  };

  const handleDeleteWorksheet = async (wsId: string) => {
    if (!confirm("Are you sure you want to delete this worksheet? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/worksheets/${wsId}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete worksheet");
      }

      // Refresh the worksheet list
      if (profileId) {
        const dashboardRes = await fetch(`/api/student/dashboard?id=${profileId}`);
        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setWorksheets(data.worksheets);
          setWeaknesses(data.weaknesses);
        }
      }
    } catch (err) {
      alert((err as Error).message || "Something went wrong deleting the worksheet.");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)" }}>Loading student dashboard...</p>
      </div>
    );
  }

  // Render Authentication screen (Sign In vs Sign Up selector)
  if (!profileId) {
    return (
      <main className="responsive-container" style={{ minHeight: "100vh" }}>
        <ThreeBackground />
        
        {/* Floating Tubelight Navbar for Auth */}
        <nav className={`tubelight-nav ${mobileMenuOpen ? "open" : ""}`}>
          <div className="tubelight-brand" onClick={() => router.push("/")}>
            <div className="tubelight-brand-logo" />
            <span className="tubelight-brand-text">
              Sheet<span style={{ color: "var(--accent-purple)" }}>Mate</span>
            </span>
          </div>
          
          <div className="tubelight-actions">
            <span className="tubelight-link" onClick={() => router.push("/")} style={{ marginRight: "4px" }}>
              Home
            </span>
            {authMode === "signin" ? (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "0.78rem", borderRadius: "20px", boxShadow: "none" }}
                onClick={() => setAuthMode("signup")}
              >
                Register
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 14px", fontSize: "0.78rem", borderRadius: "20px" }}
                onClick={() => setAuthMode("signin")}
              >
                Sign In
              </button>
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
            <span className="tubelight-mobile-link" onClick={() => {
              router.push("/");
              setMobileMenuOpen(false);
            }}>
              Home
            </span>
            <div className="tubelight-mobile-actions">
              {authMode === "signin" ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderRadius: "20px" }}
                  onClick={() => {
                    setAuthMode("signup");
                    setMobileMenuOpen(false);
                  }}
                >
                  Register
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderRadius: "20px" }}
                  onClick={() => {
                    setAuthMode("signin");
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </nav>
        
        <div style={{ maxWidth: authMode === "signup" ? "900px" : "500px", margin: "20px auto 60px auto", position: "relative", transition: "max-width 0.3s ease" }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "40px" }}>
            <h1 className="gradient-text" style={{ fontSize: "1.8rem", marginBottom: "8px", textAlign: "center" }}>
              {authMode === "signin" ? "Who is practicing today?" : "Create Student Profile"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "28px", textAlign: "center" }}>
              {authMode === "signin" 
                ? "Select a student profile to access worksheet archives and score reports." 
                : "Create a new child profile to unlock adaptive learning paths."}
            </p>

            {authMode === "signin" ? (
              // SIGN IN: Tabbed Student vs Parent Gateway
              <div>
                {/* Tabs selection */}
                <div className="slider-tabs-container">
                  <button
                    type="button"
                    className={`slider-tab-btn ${signInTab === "student" ? "active" : ""}`}
                    onClick={() => { setSignInTab("student"); setError(null); }}
                  >
                    🎒 Student Portal
                  </button>
                  <button
                    type="button"
                    className={`slider-tab-btn ${signInTab === "parent" ? "active" : ""}`}
                    onClick={() => { setSignInTab("parent"); setError(null); }}
                  >
                    👨‍👩‍👦 Parent Portal
                  </button>
                  <div className={`slider-tab-indicator ${signInTab === "parent" ? "right cyan-gradient" : ""}`} />
                </div>

                {signInTab === "student" ? (
                  /* STUDENT LOGIN FORM */
                  <form onSubmit={handleStudentLogin} style={{ marginBottom: "24px" }}>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">Student Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. aarav123"
                        className="form-input premium-input"
                        value={studentUsernameInput}
                        onChange={e => setStudentUsernameInput(e.target.value.replace(/\s+/g, ""))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label className="form-label">Profile Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          className="form-input premium-input"
                          style={{ paddingRight: "50px" }}
                          value={studentPasswordInput}
                          onChange={e => setStudentPasswordInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--accent-purple)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}
                        >
                          {showLoginPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", padding: "12px", borderRadius: "6px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "20px" }}>
                        {error}
                      </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loadingProfiles}>
                      {loadingProfiles ? "Logging in..." : "Log In as Student 🚀"}
                    </button>
                  </form>
                ) : (
                  /* PARENT LOGIN BY MOBILE + OTP FORM */
                  <div>
                    {!otpSent ? (
                      <form onSubmit={handleParentOtpRequest} style={{ marginBottom: "24px" }}>
                        <div className="form-group" style={{ marginBottom: "24px" }}>
                          <label className="form-label">Parent Mobile Number</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +91 98765 43210"
                            className="form-input premium-input cyan-focus"
                            value={parentPhoneInput}
                            onChange={e => setParentPhoneInput(e.target.value)}
                          />
                        </div>

                        {error && (
                          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", padding: "12px", borderRadius: "6px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "20px" }}>
                            {error}
                          </div>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: "100%", background: "linear-gradient(135deg, var(--accent-cyan), #0891b2)" }} disabled={loadingProfiles}>
                          {loadingProfiles ? "Sending OTP..." : "Request Login OTP 📩"}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleParentOtpVerify} style={{ marginBottom: "24px" }}>
                        <div style={{
                          background: "rgba(6, 182, 212, 0.08)",
                          border: "1px solid rgba(6, 182, 212, 0.3)",
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "20px",
                          fontSize: "0.82rem",
                          color: "#22d3ee",
                          textAlign: "center",
                          lineHeight: 1.4
                        }}>
                          📨 {simulatedAlert}
                        </div>

                        <div className="form-group" style={{ marginBottom: "24px" }}>
                          <label className="form-label">Enter 4-Digit OTP Code</label>
                          <input
                            type="text"
                            maxLength={4}
                            required
                            placeholder="e.g. 1234"
                            className="form-input premium-input cyan-focus"
                            style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "0.2em" }}
                            value={parentOtpInput}
                            onChange={e => setParentOtpInput(e.target.value.replace(/\D/g, ""))}
                          />
                        </div>

                        {error && (
                          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", padding: "12px", borderRadius: "6px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "20px" }}>
                            {error}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setOtpSent(false); setError(null); setParentOtpInput(""); }}>
                            Back
                          </button>
                          <button type="submit" className="btn-primary" style={{ flex: 1, background: "linear-gradient(135deg, var(--accent-cyan), #0891b2)" }} disabled={loadingProfiles}>
                            {loadingProfiles ? "Verifying..." : "Verify & Sign In"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Profiles lists when search matches parent phone */}
                {hasSearchedProfiles && (
                  <div style={{ borderTop: "1px solid var(--border-glow)", paddingTop: "20px", marginBottom: "24px" }}>
                    {existingProfiles.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                          No student profiles linked to parent number <strong>{parentPhoneInput}</strong>.
                        </p>
                        <button 
                          type="button" 
                          className="btn-primary" 
                          style={{ marginTop: "16px", padding: "8px 20px", fontSize: "0.85rem" }}
                          onClick={() => {
                            setRegParentPhone(parentPhoneInput);
                            setAuthMode("signup");
                          }}
                        >
                          Create First Child Profile
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "4px", textAlign: "left" }}>
                          Select profile to manage (Parent Mode Unlocked):
                        </p>
                        {existingProfiles.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              selectProfile(p.id);
                              setParentUnlocked(true);
                            }}
                            style={{
                              background: "rgba(6, 182, 212, 0.04)",
                              border: "1px solid rgba(6, 182, 212, 0.2)",
                              borderRadius: "8px",
                              padding: "16px",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "var(--transition-smooth)"
                            }}
                            className="selection-card"
                          >
                            <div style={{ textAlign: "left" }}>
                              <h4 style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</h4>
                              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                {p.board.replace("_", " ")} &bull; {p.grade}
                              </p>
                            </div>
                            <span style={{ color: "var(--accent-cyan)", fontWeight: 600, fontSize: "0.85rem" }}>Manage Workspace &rarr;</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Guest Practice Option */}
                {!hasSearchedProfiles && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                    <div
                      onClick={() => {
                        localStorage.removeItem("sheetmate_profile_id");
                        localStorage.removeItem("sheetmate_parent_phone");
                        localStorage.setItem("sheetmate_show_logout_toast", "true");
                        router.push("/");
                      }}
                      style={{
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px dashed var(--border-glow)",
                        borderRadius: "8px",
                        padding: "16px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "var(--transition-smooth)"
                      }}
                      className="selection-card"
                    >
                      <div style={{ textAlign: "left" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Practice as Guest</h4>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          Generate practice sheets without progress logs
                        </p>
                      </div>
                      <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem" }}>Enter &rarr;</span>
                    </div>
                  </div>
                )}

                <div style={{ textAlign: "center", borderTop: "1px solid var(--border-glow)", paddingTop: "20px" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Need to add a child?{" "}
                    <span 
                      onClick={() => setAuthMode("signup")} 
                      style={{ color: "var(--accent-purple)", cursor: "pointer", fontWeight: 600 }}
                    >
                      Create Profile
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              // SIGN UP: Two column split showing perks on left, form on right
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px" }}>
                {/* Left Column: Perks List */}
                <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: "24px" }}>
                  <h3 style={{ fontSize: "1.2rem", color: "#a78bfa", marginBottom: "16px", fontFamily: "var(--font-heading)" }}>
                    Registered Profile Perks
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
                    Creating a profile takes less than a minute and unlocks the full adaptive practice suite.
                  </p>
                  
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <li style={{ display: "flex", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                      <span><strong>Unlimited Practice:</strong> No daily limits on worksheet generation.</span>
                    </li>
                    <li style={{ display: "flex", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                      <span><strong>Adaptive Engine:</strong> Focuses future practice automatically on weak subtopics.</span>
                    </li>
                    <li style={{ display: "flex", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                      <span><strong>Concept Improvements:</strong> Follow custom analytics maps and mistake counters.</span>
                    </li>
                    <li style={{ display: "flex", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                      <span><strong>Parent Grader:</strong> Lock with parent PIN and toggle incorrect answers on-screen.</span>
                    </li>
                    <li style={{ display: "flex", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>✓</span>
                      <span><strong>Fast Start:</strong> Remembers child name, class, and board options automatically.</span>
                    </li>
                  </ul>

                  <div style={{ marginTop: "24px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border-glow)" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", lineHeight: "1.4" }}>
                      Note: You can always practice as a Guest if generating worksheets for others.
                    </p>
                  </div>
                </div>

                {/* Right Column: Form */}
                <div>
                  {signupStep === "details" ? (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!regName.trim()) return;
                      const pwdError = validatePasswordStrength(regPassword);
                      if (pwdError) {
                        setError(pwdError);
                        return;
                      }
                      setError(null);
                      setSignupStep("payment");
                    }}>
                      <div className="form-group">
                        <label className="form-label">Student Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aarav Karan"
                          className="form-input"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Grade</label>
                        <select className="form-select" value={regGrade} onChange={e => setRegGrade(e.target.value)}>
                          {["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"].map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">School Board</label>
                        <input type="text" className="form-input" value="Standard Board" disabled style={{ opacity: 0.7 }} />
                      </div>

                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label className="form-label">Student Username (for Login)</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. aarav123"
                          className="form-input"
                          value={regUsername}
                          onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label className="form-label">Profile Password (must be strong)</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type={showRegPassword ? "text" : "password"}
                            required
                            placeholder="Create a strong password"
                            className="form-input"
                            style={{ paddingRight: "50px" }}
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            style={{
                              position: "absolute",
                              right: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              color: "var(--accent-purple)",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: 600
                            }}
                          >
                            {showRegPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        {regPassword && (() => {
                          const strength = getPasswordStrength(regPassword);
                          return (
                            <div style={{ marginTop: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", marginBottom: "4px" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Password Strength:</span>
                                <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                              </div>
                              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", marginBottom: "12px" }}>
                                <div style={{
                                  width: `${(strength.score / 5) * 100}%`,
                                  height: "100%",
                                  background: strength.color,
                                  transition: "width 0.3s ease"
                                }} />
                              </div>
                              <ul className="pwd-checklist">
                                {strength.feedback.map(f => (
                                  <li 
                                    key={f.key} 
                                    className={`pwd-checklist-item ${f.passed ? 'passed' : 'failed'}`}
                                  >
                                    <span>{f.passed ? "✓" : "○"}</span>
                                    <span>{f.text}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "16px" }}>
                        <h4 style={{ fontSize: "0.9rem", color: "#a78bfa", marginBottom: "12px", fontWeight: 700 }}>Parent Contact (For security & locks)</h4>
                        
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label className="form-label">Parent Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="parent@example.com"
                            className="form-input"
                            value={regParentEmail}
                            onChange={e => setRegParentEmail(e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "24px" }}>
                          <label className="form-label">Parent Mobile Number</label>
                          <input
                            type="tel"
                            required
                            placeholder="+91 98765 43210"
                            className="form-input"
                            value={regParentPhone}
                            onChange={e => setRegParentPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: "32px" }}>
                        <label className="form-label">Membership Plan</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {/* Pro Plan */}
                          <div style={{
                            border: "2px solid var(--accent-purple)",
                            background: "rgba(124,58,237,0.06)",
                            borderRadius: "8px",
                            padding: "14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            position: "relative"
                          }}>
                            <span style={{
                              position: "absolute",
                              top: "-10px",
                              right: "12px",
                              background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                              color: "white",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "10px",
                              textTransform: "uppercase"
                            }}>Active Beta Plan</span>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Pro Lifetime (Beta Access)</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Unlimited sheets, AI PDF grading, weakness logs</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "line-through", marginRight: "6px" }}>₹800/mo</span>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-cyan)" }}>FREE</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", padding: "12px", borderRadius: "6px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "20px" }}>
                          {error}
                        </div>
                      )}

                      <button type="submit" className="btn-primary" style={{ width: "100%" }}>
                        Continue to Payment &rarr;
                      </button>

                      <div style={{ textAlign: "center", borderTop: "1px solid var(--border-glow)", paddingTop: "20px", marginTop: "24px" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Already have a profile?{" "}
                          <span 
                            onClick={() => setAuthMode("signin")} 
                            style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 600 }}
                          >
                            Sign In
                          </span>
                        </p>
                      </div>
                    </form>
                  ) : (
                    // PAYMENT STEP
                    <form onSubmit={handleRegister}>
                      <h3 style={{ fontSize: "1.2rem", color: "var(--accent-cyan)", marginBottom: "6px", fontFamily: "var(--font-heading)" }}>
                        Pro Beta Activation
                      </h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "18px" }}>
                        Activate your student profile subscription to unlock unlimited generation.
                      </p>

                      {/* Beta Prom Flag Banner */}
                      <div style={{
                        background: "rgba(6, 182, 212, 0.08)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginBottom: "20px",
                        fontSize: "0.8rem",
                        color: "#22d3ee",
                        lineHeight: 1.4
                      }}>
                        🎉 <strong>Beta Promotion Active:</strong> Pro Lifetime Access is 100% FREE during the public beta phase.
                      </div>

                      {/* Payment Integration Info Banner */}
                      <div style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "20px",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5
                      }}>
                        <p style={{ marginBottom: "8px", color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>💳</span> Integrated Payment Gateway
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                          RuPay, UPI, Cards, and NetBanking payment systems will be active in the final production release.
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 600 }}>
                          ✓ Current beta activation requires no card entries or payments.
                        </p>
                      </div>

                      {/* Pricing Table */}
                      <div style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border-glow)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginBottom: "24px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Pro Lifetime Membership</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>₹800/mo</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Beta Discount (-100%)</span>
                          <span style={{ color: "#34d399", fontWeight: 600 }}>-₹800/mo</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "6px", marginTop: "4px", fontWeight: 700 }}>
                          <span style={{ color: "var(--text-primary)" }}>Total Due Now</span>
                          <span style={{ color: "var(--accent-cyan)" }}>₹0</span>
                        </div>
                      </div>

                      {error && (
                        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", padding: "12px", borderRadius: "6px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "20px" }}>
                          {error}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "12px" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => setSignupStep("details")}
                          disabled={submittingReg}
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ flex: 2 }}
                          disabled={submittingReg}
                        >
                          {submittingReg ? "Activating Beta..." : "Activate Pro Beta"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
            
            <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => router.push("/")}>
              &larr; Back to Guest Workspace
            </p>
          </div>
        </div>


      </main>
    );
  }

  // Subject-filtered calculations for Parent Analytics Dashboard
  const filteredWorksheets = subjectFilter === "ALL" 
    ? worksheets 
    : worksheets.filter(ws => ws.subject?.toUpperCase() === subjectFilter.toUpperCase());

  const filteredWeaknesses = subjectFilter === "ALL" 
    ? weaknesses 
    : weaknesses.filter(w => w.subject?.toUpperCase() === subjectFilter.toUpperCase());

  const totalWorksheetsCount = filteredWorksheets.length;
  const gradedWorksheetsCount = filteredWorksheets.filter(ws => {
    if (!ws.attemptsJson) return false;
    try {
      const arr = JSON.parse(ws.attemptsJson);
      return Array.isArray(arr) && arr.length > 0;
    } catch (_) {
      return false;
    }
  }).length;
  const gradingRatePercent = totalWorksheetsCount > 0 
    ? Math.round((gradedWorksheetsCount / totalWorksheetsCount) * 100) 
    : 0;

  // Gather graded attempts for progression chart & average score based on filtered worksheets
  const allGradedAttempts: {
    wsId: string;
    topic: string;
    score: number;
    totalMarks: number;
    percentage: number;
    date: Date;
    dateStr: string;
  }[] = [];

  filteredWorksheets.forEach(ws => {
    if (ws.attemptsJson) {
      try {
        const arr = JSON.parse(ws.attemptsJson);
        if (Array.isArray(arr)) {
          arr.forEach((att: any) => {
            const score = typeof att.score === "number" ? att.score : (ws.score || 0);
            const totalMarks = (typeof att.totalMarks === "number" ? att.totalMarks : ws.totalMarks) || 10;
            const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
            const dateObj = att.date ? new Date(att.date) : new Date(ws.createdAt);
            allGradedAttempts.push({
              wsId: ws.id,
              topic: ws.topic,
              score,
              totalMarks,
              percentage,
              date: dateObj,
              dateStr: dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
            });
          });
        }
      } catch (_) {}
    }
  });

  // Sort chronologically (oldest to newest)
  allGradedAttempts.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Average score percent
  const overallAverageScorePercent = allGradedAttempts.length > 0
    ? Math.round(allGradedAttempts.reduce((sum, att) => sum + att.percentage, 0) / allGradedAttempts.length)
    : 0;

  // Concept masteries vs focus areas based on filtered weaknesses
  const strongConcepts = filteredWeaknesses.filter(w => w.successCount > w.errorCount);
  const weakConcepts = filteredWeaknesses.filter(w => w.errorCount >= w.successCount && w.errorCount > 0);
  
  // Sort strong concepts by successCount descending
  const sortedStrong = [...strongConcepts].sort((a, b) => b.successCount - a.successCount);
  // Sort weak concepts by errorCount descending
  const sortedWeak = [...weakConcepts].sort((a, b) => b.errorCount - a.errorCount);

  // Take the last 10 attempts for the progression line chart
  const last10Attempts = allGradedAttempts.slice(-10);

  return (
    <main className="responsive-container" style={{ minHeight: "100vh" }}>
      <ThreeBackground />
      {/* Premium Fading Grid Overlay */}
      <div className="grid-bg-overlay" />

      {/* Floating Tubelight Navbar */}
      <nav className={`tubelight-nav ${mobileMenuOpen ? "open" : ""}`}>
        <div className="tubelight-brand" onClick={() => router.push("/")}>
          <div className="tubelight-brand-logo" />
          <span className="tubelight-brand-text">
            Sheet<span style={{ color: "var(--accent-purple)" }}>Mate</span>
          </span>
        </div>
        
        <div className="tubelight-links-group">
          <span className="tubelight-link active" onClick={() => router.push("/dashboard")}>
            Dashboard
          </span>
          <span className="tubelight-link" onClick={() => router.push("/")}>
            + New Worksheet
          </span>
        </div>

        <div className="tubelight-actions">
          <button type="button" className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.78rem", borderRadius: "20px" }} onClick={handleProfileReset}>
            Switch Profile
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "6px 14px", fontSize: "0.78rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#fca5a5", borderRadius: "20px" }}
            onClick={handleLogOut}
          >
            Log Out
          </button>
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
          <span className="tubelight-mobile-link active" onClick={() => {
            router.push("/dashboard");
            setMobileMenuOpen(false);
          }}>
            Dashboard
          </span>
          <span className="tubelight-mobile-link" onClick={() => {
            router.push("/");
            setMobileMenuOpen(false);
          }}>
            + New Worksheet
          </span>
          <div className="tubelight-mobile-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderRadius: "20px" }} 
              onClick={() => {
                handleProfileReset();
                setMobileMenuOpen(false);
              }}
            >
              Switch Profile
            </button>
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
          </div>
        </div>
      </nav>

      {/* Profile summary banner */}
      {profile && (
        <section className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ maxWidth: "1200px", margin: "0 auto 30px auto" }}>
          <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Student Workspace</p>
              <h1 className="gradient-accent-text" style={{ fontSize: "1.8rem", marginTop: "2px" }}>{profile.name}</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "2px" }}>
                {profile.board.replace("_", " ")} &bull; {profile.grade}
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {parentUnlocked && (
                <>
                  <div style={{ border: "1px solid #10b981", background: "rgba(16, 185, 129, 0.1)", padding: "10px 16px", borderRadius: "6px", color: "#a7f3d0", fontSize: "0.85rem", display: "flex", gap: "14px", alignItems: "center" }}>
                    <span>✓ Parent View Active</span>
                    <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#a7f3d0" }} onClick={() => setParentUnlocked(false)}>
                      Lock View
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", padding: "10px 16px", fontSize: "0.85rem" }}
                    onClick={openEditModal}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Parent Analytics Dashboard */}
      {parentUnlocked && (
        <section
          style={{
            maxWidth: "1200px",
            margin: "0 auto 40px auto",
            display: "flex",
            flexDirection: "column",
            gap: "30px"
          }}
        >
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glow)", paddingBottom: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.5rem" }}>📊</span>
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }} className="gradient-accent-text">
                    Parent Analytics Dashboard
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    Performance insights, learning curves, and topic mastery statistics.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 10px", borderRadius: "20px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                Active Session
              </span>
            </div>

            {/* Subject Filters Tabs */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "24px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
              {[
                { id: "ALL", label: "📚 All Subjects" },
                { id: "MATH", label: "🔢 Math" },
                { id: "SCIENCE", label: "🔬 Science" },
                { id: "ENGLISH", label: "📖 English" },
                { id: "EVS", label: "🌱 EVS" },
                { id: "HINDI", label: "✍️ Hindi" },
                { id: "SST", label: "🌍 SST" }
              ].map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubjectFilter(sub.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: subjectFilter === sub.id ? "var(--accent-cyan)" : "rgba(255, 255, 255, 0.08)",
                    background: subjectFilter === sub.id ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.02)",
                    color: subjectFilter === sub.id ? "#22d3ee" : "var(--text-secondary)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "var(--transition-smooth)"
                  }}
                  onMouseOver={e => {
                    if (subjectFilter !== sub.id) {
                      e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.4)";
                      e.currentTarget.style.background = "rgba(6, 182, 212, 0.05)";
                    }
                  }}
                  onMouseOut={e => {
                    if (subjectFilter !== sub.id) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                    }
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Row 1: KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              {/* Card 1: Total Sheets */}
              <div className="spotlight-card neobrutalist-card" onMouseMove={handleMouseMove} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(167, 139, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "var(--accent-purple)", flexShrink: 0 }}>
                  📄
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Total Worksheets</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.4rem", fontWeight: 700 }}>{animatedWorksheetsCount}</h4>
                </div>
              </div>

              {/* Card 2: Grading Rate */}
              <div className="spotlight-card neobrutalist-card cyan" onMouseMove={handleMouseMove} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "var(--accent-cyan)", flexShrink: 0 }}>
                  ✅
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Grading Rate</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.4rem", fontWeight: 700 }}>
                    {animatedGradingRate}% <span style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>({gradedWorksheetsCount}/{totalWorksheetsCount})</span>
                  </h4>
                </div>
              </div>

              {/* Card 3: Average Score */}
              <div className="spotlight-card neobrutalist-card" onMouseMove={handleMouseMove} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(167, 139, 250, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "var(--accent-purple)", flexShrink: 0 }}>
                  🎯
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Average Score</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.4rem", fontWeight: 700 }}>
                    {allGradedAttempts.length > 0 ? `${animatedAverageScore}%` : "N/A"}
                  </h4>
                </div>
              </div>

              {/* Card 4: Mastery Status */}
              <div className="spotlight-card neobrutalist-card emerald" onMouseMove={handleMouseMove} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#10b981", flexShrink: 0 }}>
                  🏆
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Mastery & Focus</p>
                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: 700 }}>
                    <span style={{ color: "#10b981" }}>{strongConcepts.length} Mastered</span>
                    <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}> / </span>
                    <span style={{ color: "#f43f5e" }}>{weakConcepts.length} Weak</span>
                  </h4>
                </div>
              </div>
            </div>

            {/* Row 2: Score Progression Chart */}
            <div className="spotlight-card" onMouseMove={handleMouseMove} style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-glow)", borderRadius: "8px", padding: "24px", marginBottom: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  Score Progression Curve <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>(Last 10 Attempts)</span>
                </h4>
                {allGradedAttempts.length > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Hover points to view details
                  </span>
                )}
              </div>

              {allGradedAttempts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.01)", border: "1px dashed var(--border-glow)", borderRadius: "6px" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>No attempt history available to generate progression curve.</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem" }}>Ensure the student completes worksheets and their scores are saved.</p>
                </div>
              ) : (
                <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
                  <svg
                    viewBox="0 0 600 220"
                    width="100%"
                    height="auto"
                    style={{ minWidth: "550px", display: "block", overflow: "visible" }}
                  >
                    <defs>
                      <linearGradient id="chart-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="chart-line-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--accent-purple)" />
                        <stop offset="100%" stopColor="var(--accent-cyan)" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    {[0, 25, 50, 75, 100].map(pct => {
                      const yVal = 25 + 155 - (pct * 155) / 100;
                      return (
                        <g key={pct}>
                          <line
                            x1="45"
                            y1={yVal}
                            x2="575"
                            y2={yVal}
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                          <text
                            x="35"
                            y={yVal + 3}
                            fill="var(--text-muted)"
                            fontSize="10"
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            {pct}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Chart Paths */}
                    {allGradedAttempts.length > 1 && (() => {
                      const chartPoints = last10Attempts.map((att, idx) => {
                        const xVal = 45 + (idx * 530) / (last10Attempts.length - 1);
                        const yVal = 25 + 155 - (att.percentage * 155) / 100;
                        return { x: xVal, y: yVal };
                      });

                      const pathLineString = chartPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
                      const areaFillString = `${pathLineString} L ${chartPoints[chartPoints.length - 1].x} 180 L ${chartPoints[0].x} 180 Z`;

                      return (
                        <g>
                          <path
                            d={areaFillString}
                            fill="url(#chart-fill-gradient)"
                          />
                          <path
                            d={pathLineString}
                            fill="none"
                            stroke="url(#chart-line-gradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="animate-draw-curve"
                          />
                        </g>
                      );
                    })()}

                    {/* Data Points */}
                    {last10Attempts.map((att, idx) => {
                      const xVal = last10Attempts.length > 1
                        ? 45 + (idx * 530) / (last10Attempts.length - 1)
                        : 45 + 530 / 2;
                      const yVal = 25 + 155 - (att.percentage * 155) / 100;

                      const isHovered = hoveredProgressPoint && hoveredProgressPoint.wsId === att.wsId && hoveredProgressPoint.date === att.date;

                      return (
                        <g key={`${att.wsId}-${idx}`}>
                          <circle
                            cx={xVal}
                            cy={yVal}
                            r={isHovered ? 8 : 4}
                            fill={isHovered ? "var(--accent-cyan)" : "url(#chart-line-gradient)"}
                            stroke="#ffffff"
                            strokeWidth={isHovered ? 2 : 1.5}
                            style={{ transition: "all 0.15s ease", cursor: "pointer" }}
                          />
                          <circle
                            cx={xVal}
                            cy={yVal}
                            r="16"
                            fill="transparent"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setHoveredProgressPoint({ ...att, x: xVal, y: yVal })}
                            onMouseLeave={() => setHoveredProgressPoint(null)}
                          />
                          <text
                            x={xVal}
                            y="198"
                            fill="var(--text-muted)"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            {att.dateStr}
                          </text>
                          <text
                            x={xVal}
                            y="209"
                            fill="rgba(255, 255, 255, 0.25)"
                            fontSize="8"
                            textAnchor="middle"
                          >
                            #{idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {hoveredProgressPoint && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${(hoveredProgressPoint.x / 600) * 100}%`,
                        top: `${hoveredProgressPoint.y - 12}px`,
                        transform: "translate(-50%, -100%)",
                        background: "rgba(17, 12, 34, 0.95)",
                        border: "1px solid var(--accent-purple)",
                        boxShadow: "0 4px 20px rgba(167, 139, 250, 0.25)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        zIndex: 100,
                        pointerEvents: "none",
                        width: "200px",
                        fontSize: "0.8rem",
                        color: "var(--text-primary)"
                      }}
                    >
                      <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px" }}>
                        {hoveredProgressPoint.topic}
                      </div>
                      <div style={{ color: "var(--accent-cyan)", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                        <span>Score Accuracy:</span>
                        <span>{hoveredProgressPoint.percentage}%</span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "2px", display: "flex", justifyContent: "space-between" }}>
                        <span>Raw Score:</span>
                        <span>{hoveredProgressPoint.score} / {hoveredProgressPoint.totalMarks} marks</span>
                      </div>
                      <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: "6px", paddingTop: "4px", fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                        <span>Attempt date:</span>
                        <span>{new Date(hoveredProgressPoint.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Strong vs Weak Topics Breakdown */}
            <div className="responsive-grid-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {/* Concept Masteries (Strong Topics) */}
              <div className="spotlight-card" onMouseMove={handleMouseMove} style={{ background: "rgba(16, 185, 129, 0.02)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "8px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 600, color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🏆</span> Concept Masteries (Strong Areas)
                </h4>

                {sortedStrong.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No concept masteries logged yet. When the student scores well on specific subtopics without errors, they will appear here.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "300px", overflowY: "auto", paddingRight: "6px" }}>
                    {sortedStrong.map(wk => {
                      const totalCount = wk.successCount + wk.errorCount;
                      const ratio = totalCount > 0 ? Math.round((wk.successCount / totalCount) * 100) : 0;
                      return (
                        <div key={wk.id} style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{wk.subtopic}</span>
                            <span style={{ color: "#a7f3d0", fontWeight: "bold" }}>{ratio}% Accuracy</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            <span>{wk.subject} &bull; {wk.topic}</span>
                            <span>{wk.successCount} Correct / {wk.errorCount} Mistakes</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "3px" }}>
                            <div
                              style={{
                                width: `${ratio}%`,
                                height: "100%",
                                background: "#10b981",
                                borderRadius: "3px",
                                boxShadow: "0 0 6px rgba(16, 185, 129, 0.4)"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Focus Areas (Weak Topics) */}
              <div className="spotlight-card" onMouseMove={handleMouseMove} style={{ background: "rgba(244, 63, 94, 0.02)", border: "1px solid rgba(244, 63, 94, 0.15)", borderRadius: "8px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 600, color: "#f43f5e", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚠️</span> Focus Areas (Needs Practice)
                </h4>

                {sortedWeak.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No immediate focus areas. Excellent! Keep practicing to maintain high precision.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "300px", overflowY: "auto", paddingRight: "6px" }}>
                    {sortedWeak.map(wk => {
                      const totalCount = wk.successCount + wk.errorCount;
                      const ratio = totalCount > 0 ? Math.round((wk.successCount / totalCount) * 100) : 0;
                      return (
                        <div key={wk.id} style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{wk.subtopic}</span>
                            <span style={{ color: "#fca5a5", fontWeight: "bold" }}>{ratio}% Accuracy</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                            <span>{wk.subject} &bull; {wk.topic}</span>
                            <span style={{ color: "#fca5a5" }}>{wk.errorCount} Mistakes / {wk.successCount} Correct</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "3px" }}>
                            <div
                              style={{
                                width: `${ratio}%`,
                                height: "100%",
                                background: "#ef4444",
                                borderRadius: "3px",
                                boxShadow: "0 0 6px rgba(239, 68, 68, 0.4)"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid containing practice history & weak topics log */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "30px"
        }}
      >
        <div className="responsive-grid-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px" }}>
          
          {/* List 1: Practice sheets history */}
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", borderBottom: "1px solid var(--border-glow)", paddingBottom: "10px" }}>
              Practice History
            </h3>
            
            {worksheets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>No worksheets generated yet.</p>
                <button type="button" className="btn-secondary" style={{ marginTop: "14px", fontSize: "0.85rem" }} onClick={() => router.push("/")}>
                  Generate First Worksheet
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
                {worksheets.map(ws => (
                  <div
                    key={ws.id}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "6px",
                      padding: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "var(--transition-smooth)"
                    }}
                    className="selection-card"
                  >
                    <div 
                      onClick={() => router.push(`/worksheets/${ws.id}`)}
                      style={{ flex: 1, textAlign: "left", cursor: "pointer" }}
                    >
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>{ws.topic}</h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {ws.subject} &bull; {ws.difficulty} &bull; {new Date(ws.createdAt).toLocaleDateString()}
                      </p>

                      {/* Attempts History Listing */}
                      {ws.attemptsJson && (() => {
                        try {
                          const attempts = JSON.parse(ws.attemptsJson);
                          if (attempts && attempts.length > 0) {
                            return (
                              <div style={{ marginTop: "8px", fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                                <span>Attempt History:</span>
                                {attempts.map((att: any, attIdx: number) => (
                                  <span 
                                    key={attIdx} 
                                    style={{ 
                                      background: "rgba(255,255,255,0.04)", 
                                      padding: "2px 6px", 
                                      borderRadius: "4px", 
                                      border: "1px solid var(--border-glow)" 
                                    }}
                                  >
                                    #{attIdx + 1}: {att.score}/{ws.totalMarks} ({new Date(att.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})
                                  </span>
                                ))}
                              </div>
                            );
                          }
                        } catch (e) {
                          return null;
                        }
                        return null;
                      })()}
                    </div>

                    <div style={{ textAlign: "right", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                      {ws.score !== null ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                            Current: {ws.score} / {ws.totalMarks}
                          </span>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                              onClick={() => router.push(`/worksheets/${ws.id}`)}
                            >
                              View
                            </button>
                            {!parentUnlocked ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "var(--accent-purple)", color: "#a78bfa" }}
                                onClick={() => openGrader(ws.id, true)}
                              >
                                Retake
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "var(--accent-purple)", color: "#a78bfa" }}
                                onClick={() => openGrader(ws.id)}
                              >
                                Regrade
                              </button>
                            )}
                            {parentUnlocked && (
                              <button
                                type="button"
                                title="Delete worksheet"
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  color: "#fca5a5",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  transition: "all 0.2s"
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                                onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
                                onClick={() => handleDeleteWorksheet(ws.id)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                            onClick={() => router.push(`/worksheets/${ws.id}`)}
                          >
                            View
                          </button>
                          {!parentUnlocked ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "var(--accent-purple)", color: "#a78bfa" }}
                              onClick={() => openGrader(ws.id, true)}
                            >
                              Submit Score
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "var(--accent-purple)", color: "#a78bfa" }}
                              onClick={() => openGrader(ws.id)}
                            >
                              Grade Sheet
                            </button>
                          )}
                          {parentUnlocked && (
                            <button
                              type="button"
                              title="Delete worksheet"
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                color: "#fca5a5",
                                borderRadius: "6px",
                                padding: "5px 8px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                display: "flex",
                                alignItems: "center",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                              onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
                              onClick={() => handleDeleteWorksheet(ws.id)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List 2: Weak concept metrics */}
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", borderBottom: "1px solid var(--border-glow)", paddingBottom: "10px" }}>
              Concept Improvement Log
            </h3>
            
            {weaknesses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <p style={{ fontSize: "0.95rem" }}>Perfect record! No weak concepts identified yet.</p>
                <p style={{ fontSize: "0.8rem", marginTop: "6px" }}>Incorrect answers logged by parents will populate this registry.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
                {weaknesses.map(wk => (
                  <div key={wk.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                      <span><strong>{wk.subtopic}</strong> <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>({wk.subject} &bull; {wk.topic})</span></span>
                      <span style={{ color: "#fca5a5" }}>{wk.errorCount} Mistakes logged</span>
                    </div>
                    {/* Visual progress warning meter */}
                    <div style={{ width: "100%", height: "6px", background: "var(--bg-tertiary)", borderRadius: "3px" }}>
                      <div
                        style={{
                          width: `${Math.min(100, wk.errorCount * 25)}%`,
                          height: "100%",
                          background: wk.errorCount >= 3 ? "#ef4444" : "var(--accent-purple)",
                          borderRadius: "3px"
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Parent OTP Lock Modal */}
      {showPinModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "420px", margin: "20px" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", textAlign: "center" }}>Unlock Parent Controls</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
              To view analytics, grade sheets, or edit profile, verify parent access.
            </p>

            {simulatedAlert && (
              <div style={{
                background: "rgba(6, 182, 212, 0.08)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "20px",
                fontSize: "0.82rem",
                color: "#22d3ee",
                textAlign: "center",
                lineHeight: 1.4
              }}>
                📨 {simulatedAlert}
              </div>
            )}

            <form onSubmit={handleVerifyWorkspaceParentOtp}>
              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label className="form-label" style={{ textAlign: "center" }}>
                  Enter 4-Digit OTP Code sent to parent's phone ({profile?.parentPhone || "N/A"})
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  className="form-input"
                  style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.3em" }}
                  value={parentOtpInput}
                  onChange={e => setParentOtpInput(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              {error && (
                <div style={{ color: "#fca5a5", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => { 
                    setShowPinModal(false); 
                    setError(null); 
                    setParentOtpInput(""); 
                    setParentOtpCode(""); 
                    setSimulatedAlert(null); 
                    setPendingGradingWorksheetId(null); 
                    setPendingEditProfile(false); 
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Verify & Unlock
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px" }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--accent-purple)", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline" }}
                  onClick={handleRequestWorkspaceParentOtp}
                >
                  Resend Verification Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Parent Grader Modal */}
      {gradingWorksheetId && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "800px", margin: "20px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-purple)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                  {parentUnlocked ? "Parent Grading Panel" : "Worksheet Grading Panel"}
                </span>
                <h3 style={{ fontSize: "1.3rem", marginTop: "2px" }}>
                  {gradingWorksheetData ? gradingWorksheetData.topic : "Grading Worksheet"}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {gradingWorksheetData ? `${gradingWorksheetData.subject} • ${gradingWorksheetData.difficulty} • ${gradingWorksheetData.grade || gradingWorksheetData.data?.grade}` : ""}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Calculated Score</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-cyan)", fontFamily: "var(--font-heading)" }}>
                  {gradingMode === "manual" 
                    ? `${getCalculatedScore()} / ${gradingWorksheetData?.totalMarks || 20}`
                    : `${aiReviewResult ? aiReviewResult.score : "--"} / ${gradingWorksheetData?.totalMarks || 20}`
                  }
                </div>
              </div>
            </div>

            {/* Tabs for Manual vs AI Grading */}
            <div className="slider-tabs-container" style={{ marginBottom: "20px" }}>
              <button
                type="button"
                className={`slider-tab-btn ${gradingMode === "manual" ? "active" : ""}`}
                onClick={() => setGradingMode("manual")}
                disabled={uploadingPdf}
              >
                Manual Grading
              </button>
              <button
                type="button"
                className={`slider-tab-btn ${gradingMode === "ai" ? "active" : ""}`}
                onClick={() => setGradingMode("ai")}
                disabled={uploadingPdf}
              >
                AI PDF Reviewer (New)
              </button>
              <div className={`slider-tab-indicator ${gradingMode === "ai" ? "right cyan-gradient" : ""}`} />
            </div>

            {gradingMode === "manual" ? (
              /* MANUAL GRADING TAB */
              <div style={{ flexGrow: 1, overflowY: "auto", margin: "0 0 20px 0", paddingRight: "8px", maxHeight: "55vh" }}>
                {loadingGradingData ? (
                  <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>Fetching worksheet questions...</p>
                ) : !gradingWorksheetData ? (
                  <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "40px" }}>No worksheet data loaded.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(() => {
                      const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(gradingWorksheetData.grade || gradingWorksheetData.data?.grade);
                      const wsData = gradingWorksheetData.data;

                      if (isEarly) {
                        return wsData.activities?.map((act: any, actIdx: number) => (
                          <div key={actIdx} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "16px" }}>
                            <h4 style={{ color: "var(--accent-cyan)", marginBottom: "6px", fontSize: "0.95rem" }}>
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
                                    <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                      <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: "0.85rem" }}>{item.left} &rarr; <strong>{item.right}</strong></span>
                                      </div>
                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button
                                          type="button"
                                          onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                          style={{
                                            background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                            border: "1px solid " + (isCorrect ? "#10b981" : "rgba(255,255,255,0.06)"),
                                            color: isCorrect ? "#34d399" : "var(--text-secondary)",
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
                                            border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(255,255,255,0.06)"),
                                            color: !isCorrect ? "#fca5a5" : "var(--text-secondary)",
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
                                    <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                      <div style={{ flex: 1, marginRight: "12px" }}>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{q.sentence}</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                          Answer Box: <strong style={{ color: "#34d399" }}>{q.answer}</strong>
                                        </p>
                                      </div>
                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button
                                          type="button"
                                          onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                          style={{
                                            background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                            border: "1px solid " + (isCorrect ? "#10b981" : "rgba(255,255,255,0.06)"),
                                            color: isCorrect ? "#34d399" : "var(--text-secondary)",
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
                                            border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(255,255,255,0.06)"),
                                            color: !isCorrect ? "#fca5a5" : "var(--text-secondary)",
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
                                    <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                      <div style={{ flex: 1, marginRight: "12px" }}>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>[ {q.words?.join(", ")} ]</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                          Odd One: <strong style={{ color: "#34d399" }}>{q.answer}</strong> ({q.explanation})
                                        </p>
                                      </div>
                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button
                                          type="button"
                                          onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                          style={{
                                            background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                            border: "1px solid " + (isCorrect ? "#10b981" : "rgba(255,255,255,0.06)"),
                                            color: isCorrect ? "#34d399" : "var(--text-secondary)",
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
                                            border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(255,255,255,0.06)"),
                                            color: !isCorrect ? "#fca5a5" : "var(--text-secondary)",
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
                            <h4 style={{ color: "var(--accent-purple)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px", marginBottom: "12px", fontSize: "0.95rem" }}>
                              {section.name}
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {section.questions?.map((q: any) => {
                                const key = q.id;
                                const isCorrect = graderScores[key] !== false;
                                return (
                                  <div key={q.id} style={{ background: "rgba(255,255,255,0.01)", padding: "12px 16px", borderRadius: "8px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                                      <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>{q.text}</p>
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
                                          <p style={{ fontSize: "0.8rem", color: "#a7f3d0" }}>
                                            <strong>Correct Answer:</strong> {q.answer}
                                          </p>
                                          {q.solutionExplanation && (
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                              <strong>Explanation:</strong> {q.solutionExplanation}
                                            </p>
                                          )}
                                        </div>
                                        {q.subtopic && (
                                          <span style={{ display: "inline-block", fontSize: "0.65rem", color: "var(--accent-purple)", background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.15)", borderRadius: "10px", padding: "2px 8px", marginTop: "8px" }}>
                                            Concept: {q.subtopic}
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button
                                          type="button"
                                          onClick={() => setGraderScores(prev => ({ ...prev, [key]: true }))}
                                          style={{
                                            background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "transparent",
                                            border: "1px solid " + (isCorrect ? "#10b981" : "rgba(255,255,255,0.06)"),
                                            color: isCorrect ? "#34d399" : "var(--text-secondary)",
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
                                            border: "1px solid " + (!isCorrect ? "#ef4444" : "rgba(255,255,255,0.06)"),
                                            color: !isCorrect ? "#fca5a5" : "var(--text-secondary)",
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
                )}
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
                      border: "3px solid rgba(6, 182, 212, 0.1)",
                      borderTop: "3px solid var(--accent-cyan)",
                      animation: "spin 1.2s linear infinite",
                      marginBottom: "20px"
                    }} />
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      @keyframes pulse {
                        0%, 100% { opacity: 0.6; }
                        50% { opacity: 1; }
                      }
                    `}</style>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>Grading solved worksheet...</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px", animation: "pulse 1.5s infinite" }}>
                      {uploadProgressMsg}
                    </p>
                  </div>
                ) : !aiReviewResult ? (
                  /* UPLOAD FORM STATE */
                  <form onSubmit={handlePdfUpload} style={{ padding: "10px 10px 20px 10px", display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
                    <div style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.01)",
                      border: "2px dashed rgba(6, 182, 212, 0.3)",
                      borderRadius: "12px",
                      padding: "40px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => document.getElementById("pdf-file-upload")?.click()}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent-cyan)"; e.currentTarget.style.background = "rgba(6, 182, 212, 0.03)"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}
                    >
                      <input
                        id="pdf-file-upload"
                        type="file"
                        accept=".pdf"
                        style={{ display: "none" }}
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                      />
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {pdfFile ? pdfFile.name : "Select or Drop Solved PDF Sheet"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        {pdfFile ? `(${(pdfFile.size / 1024 / 1024).toFixed(2)} MB) - Click to change` : "Only text-readable PDF documents supported"}
                      </p>
                    </div>

                    {aiReviewError && (
                      <div style={{ width: "100%", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", padding: "12px", color: "#fca5a5", fontSize: "0.8rem", textAlign: "center" }}>
                        {aiReviewError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!pdfFile || uploadingPdf}
                      style={{ padding: "12px 30px", fontSize: "0.85rem", display: "flex", gap: "10px", alignItems: "center" }}
                    >
                      <span>Analyze & Grade Solved PDF</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                    </button>
                  </form>
                ) : (
                  /* REVIEW RESULTS COMPLETED STATE */
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "10px", padding: "16px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <h4 style={{ color: "#34d399", fontWeight: 700, fontSize: "0.95rem" }}>AI Review Completed Successfully!</h4>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "2px" }}>The final score and concept logs have been saved to the student profile.</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {aiReviewResult.feedback?.map((item: any, idx: number) => {
                        const isCorrect = item.status === "CORRECT";
                        
                        let questionText = `Question ${item.questionId}`;
                        let expectedAnswer = "Expected Answer Key";
                        const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(gradingWorksheetData.grade || gradingWorksheetData.data?.grade);
                        
                        if (isEarly) {
                          try {
                            const parts = item.questionId.split("_");
                            const actIdx = parseInt(parts[1], 10);
                            const qIdx = parseInt(parts[3], 10);
                            const act = gradingWorksheetData.data?.activities?.[actIdx];
                            if (act) {
                              if (act.type === "MATCHING") {
                                const matched = act.items?.[qIdx];
                                questionText = `Activity ${actIdx + 1} Match: ${matched?.left}`;
                                expectedAnswer = matched?.right;
                              } else {
                                const q = act.questions?.[qIdx];
                                questionText = `Activity ${actIdx + 1}: ${q?.sentence || q?.words?.join(", ")}`;
                                expectedAnswer = q?.answer;
                              }
                            }
                          } catch (e) {}
                        } else {
                          try {
                            const sections = gradingWorksheetData.data?.sections || [];
                            for (const sec of sections) {
                              const q = sec.questions?.find((quest: any) => quest.id === item.questionId);
                              if (q) {
                                questionText = q.text;
                                expectedAnswer = q.answer;
                                break;
                              }
                            }
                          } catch (e) {}
                        }

                        return (
                          <div key={idx} style={{
                            background: "rgba(255,255,255,0.01)",
                            border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.2)",
                            borderRadius: "8px",
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isCorrect ? "#34d399" : "#fca5a5", background: isCorrect ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: "1px solid " + (isCorrect ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"), borderRadius: "4px", padding: "2px 8px" }}>
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>ID: {item.questionId}</span>
                            </div>

                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>{questionText}</p>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "rgba(255,255,255,0.015)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.75rem" }}>
                              <div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Expected Answer:</span>
                                <p style={{ color: "#34d399", fontWeight: 600, marginTop: "2px" }}>{expectedAnswer}</p>
                              </div>
                              <div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Student Wrote:</span>
                                <p style={{ color: isCorrect ? "#34d399" : "#fca5a5", fontWeight: 600, marginTop: "2px" }}>{item.studentAnswer || "Not specified"}</p>
                              </div>
                            </div>

                            <div style={{ background: "rgba(124, 58, 237, 0.03)", border: "1px solid rgba(124, 58, 237, 0.1)", borderRadius: "6px", padding: "8px 12px", fontSize: "0.75rem" }}>
                              <span style={{ color: "#a78bfa", fontWeight: 600 }}>AI Feedback Report:</span>
                              <p style={{ color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>{item.feedback}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "55%", margin: 0, lineHeight: 1.4 }}>
                {gradingMode === "manual" 
                  ? "Incorrect questions automatically trigger target weight adjustments in future worksheets."
                  : "AI scores and feedback reports are saved directly to the child's academic logs."
                }
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.8rem" }}
                  onClick={() => { setGradingWorksheetId(null); setGradingWorksheetData(null); setGraderScores({}); setAiReviewResult(null); setPdfFile(null); }}
                  disabled={submittingGrade || uploadingPdf}
                >
                  {aiReviewResult ? "Done & Close" : "Cancel"}
                </button>
                {gradingMode === "manual" && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: "8px 20px", fontSize: "0.8rem" }}
                    onClick={submitGrading}
                    disabled={submittingGrade || loadingGradingData || !gradingWorksheetData}
                  >
                    {submittingGrade ? "Saving Grade..." : "Submit Grades"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "450px", margin: "20px" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", textAlign: "center" }}>Edit Student Profile</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
              Update your child's academic details. Personalization data will adapt to the new settings.
            </p>

            {showEditOtpVerify ? (
              <form onSubmit={handleVerifyEditOtp}>
                <h4 style={{ fontSize: "1rem", color: "#a78bfa", marginBottom: "12px", fontWeight: 700, textAlign: "center" }}>
                  Verify Contact Info Update
                </h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "20px", textAlign: "center" }}>
                  To ensure account security, verify your new parent contact details.
                </p>

                {editSimulatedAlert && (
                  <div style={{
                    background: "rgba(6, 182, 212, 0.08)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "20px",
                    fontSize: "0.82rem",
                    color: "#22d3ee",
                    textAlign: "center",
                    lineHeight: 1.4
                  }}>
                    📨 {editSimulatedAlert}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: "24px" }}>
                  <label className="form-label">Enter 4-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="Enter OTP"
                    className="form-input"
                    style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "0.15em" }}
                    value={editOtpInput}
                    onChange={e => setEditOtpInput(e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                {editOtpError && (
                  <div style={{ color: "#fca5a5", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
                    {editOtpError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => { setShowEditOtpVerify(false); setEditOtpError(null); setEditOtpInput(""); }}
                  >
                    Back
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    Confirm Changes
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label className="form-label">Student Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Karan"
                    className="form-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Grade</label>
                  <select className="form-select" value={editGrade} onChange={e => setEditGrade(e.target.value)}>
                    {["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">School Board</label>
                  <input type="text" className="form-input" value="Standard Board" disabled style={{ opacity: 0.7 }} />
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label">Student Username (for Login)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. aarav123"
                    className="form-input"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label">Profile Password (must be strong)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showEditPassword ? "text" : "password"}
                      required
                      placeholder="Create a strong password"
                      className="form-input"
                      style={{ paddingRight: "50px" }}
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--accent-purple)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600
                      }}
                    >
                      {showEditPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {editPassword && (() => {
                    const strength = getPasswordStrength(editPassword);
                    return (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", marginBottom: "4px" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Password Strength:</span>
                          <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", marginBottom: "12px" }}>
                          <div style={{
                            width: `${(strength.score / 5) * 100}%`,
                            height: "100%",
                            background: strength.color,
                            transition: "width 0.3s ease"
                          }} />
                        </div>
                        <ul className="pwd-checklist">
                          {strength.feedback.map(f => (
                            <li 
                              key={f.key} 
                              className={`pwd-checklist-item ${f.passed ? 'passed' : 'failed'}`}
                            >
                              <span>{f.passed ? "✓" : "○"}</span>
                              <span>{f.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "16px" }}>
                  <h4 style={{ fontSize: "0.9rem", color: "#a78bfa", marginBottom: "12px", fontWeight: 700 }}>Parent Contact Details</h4>
                  
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Parent Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      className="form-input"
                      value={editParentEmail}
                      onChange={e => setEditParentEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: "24px" }}>
                    <label className="form-label">Parent Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      className="form-input"
                      value={editParentPhone}
                      onChange={e => setEditParentPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowEditModal(false)}
                    disabled={submittingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1 }}
                    disabled={submittingEdit}
                  >
                    {submittingEdit ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* AI Help Agent Chatbot */}
      <ChatAgent />
    </main>
  );
}
