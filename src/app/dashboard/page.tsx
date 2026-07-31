// src/app/dashboard/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThreeBackground from "@/components/ThreeBackground";
import ChatAgent from "@/components/ChatAgent";
import GradingMark from "@/components/GradingMark";
import GeneratorWizard from "@/components/GeneratorWizard";
import PreviewPaper from "@/components/PreviewPaper";

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
  profileType: string;
  parentPin: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  studentPhone?: string | null;
  username?: string | null;
  password?: string;
  securityQuestion?: string | null;
  securityAnswer?: string | null;
  deletedAt?: string | null;
  tier?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");

  // Tabbed Dashboard state
  const [activeDashboardTab, setActiveDashboardTab] = useState<"create" | "history" | "concepts" | "analytics" | "plan">("create");

  // Real-time Quota & Usage details
  const [quotaDetails, setQuotaDetails] = useState<{
    dailyGenerationsUsed: number;
    dailyGenerationLimit: number;
    monthlyEvaluationsUsed: number;
    monthlyEvaluationLimit: number;
    extraBoosterCredits: number;
    generationQuotaReached: boolean;
    evaluationQuotaReached: boolean;
  }>({
    dailyGenerationsUsed: 0,
    dailyGenerationLimit: 5,
    monthlyEvaluationsUsed: 0,
    monthlyEvaluationLimit: 18,
    extraBoosterCredits: 0,
    generationQuotaReached: false,
    evaluationQuotaReached: false
  });

  // Signup Account Type switcher state
  const [regUserType, setRegUserType] = useState<"parent" | "student">("parent");

  // Selections state for GeneratorWizard inside Dashboard
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
    router.push(`/worksheets/${worksheetId}`);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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
  const [showChildLimitModal, setShowChildLimitModal] = useState(false);
  const [childLimitModalMsg, setChildLimitModalMsg] = useState("");

  // Auth screen states
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [regTier, setRegTier] = useState<"FREE" | "PLUS" | "FAMILY_PRO">("FREE");
  const [systemConfig, setSystemConfig] = useState<any>(null);
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

  // Edit Profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpgradeInterstitial, setShowUpgradeInterstitial] = useState(false);
  const [billingInfo, setBillingInfo] = useState<any | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editGrade, setEditGrade] = useState("Class 6");
  const [editBoard, setEditBoard] = useState("CBSE");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Analytics tab state variables
  const [analyticsParentEmail, setAnalyticsParentEmail] = useState("");
  const [analyticsParentPhone, setAnalyticsParentPhone] = useState("");
  const [submittingAnalyticsParent, setSubmittingAnalyticsParent] = useState(false);
  const [chartRange, setChartRange] = useState<string>("10");

  // Registration recovery states
  const [regRecoveryContact, setRegRecoveryContact] = useState("");
  const [regRecoveryType, setRegRecoveryType] = useState<"none" | "email" | "mobile">("email");
  const [regSecurityQuestion, setRegSecurityQuestion] = useState("What is your favorite animal?");
  const [regSecurityAnswer, setRegSecurityAnswer] = useState("");

  // Forgot credentials modal states
  const [showForgotUsernameModal, setShowForgotUsernameModal] = useState(false);
  const [forgotUsernameContact, setForgotUsernameContact] = useState("");
  const [forgotUsernameStep, setForgotUsernameStep] = useState<"contact" | "verify">("contact");
  const [forgotUsernameOtpInput, setForgotUsernameOtpInput] = useState("");
  const [forgotUsernameExpectedOtp, setForgotUsernameExpectedOtp] = useState("");
  const [forgotUsernameSecurityQuestion, setForgotUsernameSecurityQuestion] = useState<string | null>(null);
  const [forgotUsernameSecurityAnswer, setForgotUsernameSecurityAnswer] = useState("");
  const [forgotUsernameSimulatedAlert, setForgotUsernameSimulatedAlert] = useState<string | null>(null);
  const [recoveredUsernames, setRecoveredUsernames] = useState<string[] | null>(null);
  const [forgotUsernameError, setForgotUsernameError] = useState<string | null>(null);
  const [forgotUsernameSuccess, setForgotUsernameSuccess] = useState<string | null>(null);
  const [submittingForgotUsername, setSubmittingForgotUsername] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"username" | "verify">("username");
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState("");
  const [forgotPasswordOtpInput, setForgotPasswordOtpInput] = useState("");
  const [forgotPasswordExpectedOtp, setForgotPasswordExpectedOtp] = useState("");
  const [forgotPasswordSecurityQuestion, setForgotPasswordSecurityQuestion] = useState<string | null>(null);
  const [forgotPasswordSecurityAnswer, setForgotPasswordSecurityAnswer] = useState("");
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null);
  const [submittingForgotPassword, setSubmittingForgotPassword] = useState(false);
  const [forgotPasswordSimulatedAlert, setForgotPasswordSimulatedAlert] = useState<string | null>(null);

  // Profile edit security states
  const [editCurrentPassword, setEditCurrentPassword] = useState("");
  const [editProfileTab, setEditProfileTab] = useState<"academic" | "contact" | "security" | "billing">("academic");
  const [editSecurityQuestion, setEditSecurityQuestion] = useState("");
  const [editSecurityAnswer, setEditSecurityAnswer] = useState("");
  const [editVerifySecurityAnswerInput, setEditVerifySecurityAnswerInput] = useState("");

  // Deletion feedback form states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteCustomFeedback, setDeleteCustomFeedback] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);


  useEffect(() => {
    // Check mode query param
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setAuthMode("signup");
    }
    const tierParam = searchParams.get("tier");
    if (tierParam === "PLUS" || tierParam === "FAMILY_PRO" || tierParam === "FREE") {
      setRegTier(tierParam as any);
    }

    const savedId = localStorage.getItem("pracup_profile_id");
    if (savedId) {
      setProfileId(savedId);
    } else {
      setLoading(false);
    }

    const savedParentPhone = localStorage.getItem("pracup_parent_phone");
    if (savedParentPhone) {
      setParentUnlocked(true);
      setSignInTab("parent");
      setParentPhoneInput(savedParentPhone);
    }

    fetch("/api/config")
      .then(res => res.json())
      .then(data => setSystemConfig(data))
      .catch(err => console.error("Error loading system config:", err));
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

  // Load parent billing details when Billing Tab is opened in Edit Profile
  useEffect(() => {
    if (editProfileTab === "billing") {
      const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
      if (contactToUse) {
        setLoadingBilling(true);
        fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`)
          .then(res => res.json())
          .then(data => {
            setBillingInfo(data);
          })
          .catch(err => console.error("Error fetching billing:", err))
          .finally(() => setLoadingBilling(false));
      }
    }
  }, [editProfileTab, editParentEmail, editParentPhone, profile]);

  // Load parent profiles when parent mode is unlocked and parent tab is active
  useEffect(() => {
    if (parentUnlocked && signInTab === "parent" && existingProfiles.length === 0) {
      const savedParentPhone = localStorage.getItem("pracup_parent_phone");
      const phoneToUse = parentPhoneInput.trim() || savedParentPhone;
      
      if (phoneToUse && phoneToUse !== "unlocked-by-parent-login") {
        setLoadingProfiles(true);
        setError(null);
        fetch(`/api/student/profiles?contact=${encodeURIComponent(phoneToUse)}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error("Failed to load profiles");
          })
          .then(data => {
            setExistingProfiles(data || []);
          })
          .catch(err => {
            console.error("Failed to auto-load parent profiles:", err);
            setExistingProfiles([]);
          })
          .finally(() => setLoadingProfiles(false));
      }
    }
  }, [parentUnlocked, signInTab, existingProfiles.length, parentPhoneInput]);

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
        if (data.quotaDetails) {
          setQuotaDetails(data.quotaDetails);
        }
        if (data.profile?.profileType === "parent") {
          setParentUnlocked(true);
        }
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

    let finalParentEmail = regParentEmail.trim() || null;
    let finalParentPhone = regParentPhone.trim() || null;
    let finalSecurityQuestion = null;
    let finalSecurityAnswer = null;

    if (regUserType === "student" && !regParentEmail.trim() && !regParentPhone.trim()) {
      if (regRecoveryType === "none" || !regRecoveryContact.trim()) {
        setError("Account recovery contact is required when parent details are blank.");
        setSubmittingReg(false);
        return;
      }
      if (!regSecurityAnswer.trim()) {
        setError("Security question answer is required when parent details are blank.");
        setSubmittingReg(false);
        return;
      }

      if (regRecoveryType === "email") {
        if (!regRecoveryContact.includes("@")) {
          setError("Please provide a valid recovery email address.");
          setSubmittingReg(false);
          return;
        }
        finalParentEmail = regRecoveryContact.trim();
      } else if (regRecoveryType === "mobile") {
        finalParentPhone = regRecoveryContact.trim();
      }

      finalSecurityQuestion = regSecurityQuestion;
      finalSecurityAnswer = regSecurityAnswer.trim();
    }

    let paymentId: string | null = null;
    let razorpayOrderId: string | null = null;

    // Trigger Razorpay Payment Checkout for paid tiers (Plus or Family/Pro)
    if (regTier !== "FREE") {
      try {
        const amountINR = regTier === "PLUS" 
          ? (systemConfig?.tiers?.plus?.monthlyPriceINR || 199) 
          : (systemConfig?.tiers?.familyPro?.monthlyPriceINR || 349);

        const orderRes = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountINR,
            planType: "subscription",
            tier: regTier,
            parentContact: finalParentPhone || finalParentEmail || regUsername.trim()
          })
        }).then(r => r.json());

        if (orderRes.error) {
          throw new Error(orderRes.error);
        }

        razorpayOrderId = orderRes.orderId;

        if (orderRes.isSimulation) {
          const confirmed = confirm(
            `💳 [Razorpay Payment Gateway Test Mode]\n\n` +
            `Plan: ${regTier === "PLUS" ? "PracUp Plus Membership" : "PracUp Family / Pro Membership"}\n` +
            `Amount: ₹${amountINR}\n` +
            `Order ID: ${orderRes.orderId}\n\n` +
            `Click OK to authorize simulated Razorpay payment and activate your subscription!`
          );
          if (!confirmed) {
            setSubmittingReg(false);
            return;
          }
          paymentId = `pay_simulated_${Date.now()}`;
        } else {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
          }

          await new Promise<void>((resolve, reject) => {
            const options = {
              key: orderRes.keyId,
              amount: orderRes.amount,
              currency: orderRes.currency,
              name: "PracUp",
              description: `${regTier === "PLUS" ? "PracUp Plus" : "PracUp Family / Pro"} Subscription`,
              order_id: orderRes.orderId,
              prefill: {
                name: regName,
                email: finalParentEmail || "",
                contact: finalParentPhone || ""
              },
              theme: { color: "#7c3aed" },
              handler: function (response: any) {
                paymentId = response.razorpay_payment_id;
                resolve();
              },
              modal: {
                ondismiss: function () {
                  reject(new Error("Razorpay payment cancelled by user."));
                }
              }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          });
        }

        // Log transaction record to billing endpoint
        await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SUBSCRIBE",
            tier: regTier,
            amount: amountINR,
            contact: finalParentPhone || finalParentEmail || regUsername.trim(),
            paymentId,
            orderId: razorpayOrderId
          })
        }).catch(err => console.warn("Billing log failed:", err));

      } catch (payErr) {
        setSubmittingReg(false);
        setError((payErr as Error).message || "Payment processing failed or was cancelled.");
        return;
      }
    }

    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          grade: regGrade,
          board: "CBSE",
          profileType: regUserType,
          parentPin: "0000",
          parentEmail: finalParentEmail,
          parentPhone: finalParentPhone,
          studentPhone: regStudentPhone || null,
          username: regUsername.trim(),
          password: regPassword,
          securityQuestion: finalSecurityQuestion,
          securityAnswer: finalSecurityAnswer,
          tier: regTier
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register profile");
      }

      if (data.profileType === "parent") {
        setParentUnlocked(true);
        localStorage.setItem("pracup_parent_phone", "unlocked-by-parent-login");
      } else {
        localStorage.removeItem("pracup_parent_phone");
        setParentUnlocked(false);
      }
      localStorage.setItem("pracup_profile_id", data.profileId);
      setProfileId(data.profileId);

    } catch (err) {
      const errMsg = (err as Error).message || "";
      if (errMsg.toLowerCase().includes("maximum number of child profiles") || errMsg.toLowerCase().includes("child profile limit")) {
        setChildLimitModalMsg(errMsg);
        setShowChildLimitModal(true);
      } else {
        setError(errMsg || "Something went wrong.");
      }
    } finally {
      setSubmittingReg(false);
    }
  };

  const selectProfile = (pId: string) => {
    localStorage.setItem("pracup_profile_id", pId);
    setProfileId(pId);
  };

  const handleLogin = async (e: React.FormEvent) => {
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

      if (data.status === "scheduled_deletion") {
        const daysLeft = 30 - Math.ceil((new Date().getTime() - new Date(data.deletedAt).getTime()) / (1000 * 60 * 60 * 24));
        const recover = confirm(
          `This profile is scheduled for deletion. You have ${daysLeft} days left to recover your account, custom worksheets, and progress logs.\n\nWould you like to restore it now?`
        );
        if (recover) {
          const restoreRes = await fetch("/api/student/profile/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.profileId, password: studentPasswordInput })
          });
          
          if (!restoreRes.ok) {
            const restoreData = await restoreRes.json();
            throw new Error(restoreData.error || "Failed to restore profile");
          }
          
          alert("Profile restored successfully! Logging you in...");
        } else {
          return;
        }
      }

      if (data.profileType === "parent") {
        setParentUnlocked(true);
        localStorage.setItem("pracup_parent_phone", "unlocked-by-parent-login");
      } else {
        localStorage.removeItem("pracup_parent_phone");
        setParentUnlocked(false);
      }
      localStorage.setItem("pracup_profile_id", data.profileId);
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
      localStorage.setItem("pracup_parent_phone", parentPhoneInput.trim());
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

  const openParentUnlockModal = (overridePhone?: string) => {
    setError(null);
    setOtpSent(false);
    setParentOtpInput("");
    setParentOtpCode("");
    setSimulatedAlert(null);
    setShowPinModal(true);
    
    const phone = overridePhone || (profile ? profile.parentPhone : null);
    if (phone) {
      fetch("/api/parent/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPhone: phone })
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

  const handleSaveParentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !profile || !analyticsParentEmail.trim() || !analyticsParentPhone.trim()) return;

    setSubmittingAnalyticsParent(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profileId,
          name: profile.name,
          grade: profile.grade,
          board: profile.board,
          parentPin: profile.parentPin,
          parentEmail: analyticsParentEmail.trim(),
          parentPhone: analyticsParentPhone.trim(),
          studentPhone: profile.studentPhone,
          username: profile.username,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save parent details");
      }

      const updatedProfile = {
        ...profile,
        parentEmail: analyticsParentEmail.trim(),
        parentPhone: analyticsParentPhone.trim(),
      };
      setProfile(updatedProfile);
      
      const phoneToVerify = analyticsParentPhone.trim();
      setAnalyticsParentEmail("");
      setAnalyticsParentPhone("");

      // Automatically trigger OTP unlock modal
      setTimeout(() => {
        openParentUnlockModal(phoneToVerify);
      }, 300);

    } catch (err) {
      alert((err as Error).message || "Something went wrong.");
    } finally {
      setSubmittingAnalyticsParent(false);
    }
  };

  const handleForgotUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsernameContact.trim()) return;

    setSubmittingForgotUsername(true);
    setForgotUsernameError(null);
    setForgotUsernameSuccess(null);
    setForgotUsernameSimulatedAlert(null);
    try {
      const res = await fetch("/api/student/forgot-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: forgotUsernameContact.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate username recovery");
      }
      setForgotUsernameExpectedOtp(data.otp);
      setForgotUsernameSecurityQuestion(data.securityQuestion || null);
      setForgotUsernameSimulatedAlert(data.message);
      setForgotUsernameStep("verify");
    } catch (err) {
      setForgotUsernameError((err as Error).message || "Something went wrong");
    } finally {
      setSubmittingForgotUsername(false);
    }
  };

  const handleForgotUsernameVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsernameOtpInput.trim()) return;

    setSubmittingForgotUsername(true);
    setForgotUsernameError(null);
    setForgotUsernameSuccess(null);
    try {
      const res = await fetch("/api/student/forgot-username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: forgotUsernameContact.trim(),
          otp: forgotUsernameOtpInput.trim(),
          expectedOtp: forgotUsernameExpectedOtp,
          securityAnswer: forgotUsernameSecurityAnswer.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }
      setRecoveredUsernames(data.usernames || []);
      setForgotUsernameSuccess("Verification completed! Registered usernames retrieved below.");
    } catch (err) {
      setForgotUsernameError((err as Error).message || "Something went wrong");
    } finally {
      setSubmittingForgotUsername(false);
    }
  };

  const closeForgotUsernameModal = () => {
    setShowForgotUsernameModal(false);
    setForgotUsernameStep("contact");
    setForgotUsernameContact("");
    setForgotUsernameOtpInput("");
    setForgotUsernameExpectedOtp("");
    setForgotUsernameSecurityQuestion(null);
    setForgotUsernameSecurityAnswer("");
    setForgotUsernameSimulatedAlert(null);
    setRecoveredUsernames(null);
    setForgotUsernameError(null);
    setForgotUsernameSuccess(null);
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordUsername.trim()) return;

    setSubmittingForgotPassword(true);
    setForgotPasswordError(null);
    setForgotPasswordSimulatedAlert(null);
    try {
      const res = await fetch("/api/student/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotPasswordUsername.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset code");
      }
      setForgotPasswordExpectedOtp(data.otp);
      setForgotPasswordSecurityQuestion(data.securityQuestion || null);
      setForgotPasswordSimulatedAlert(data.message);
      setForgotPasswordStep("verify");
    } catch (err) {
      setForgotPasswordError((err as Error).message || "Something went wrong");
    } finally {
      setSubmittingForgotPassword(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordOtpInput || !forgotPasswordNewPassword) return;

    setSubmittingForgotPassword(true);
    setForgotPasswordError(null);
    try {
      const res = await fetch("/api/student/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotPasswordUsername.trim(),
          newPassword: forgotPasswordNewPassword,
          otp: forgotPasswordOtpInput,
          expectedOtp: forgotPasswordExpectedOtp,
          securityAnswer: forgotPasswordSecurityAnswer
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      setForgotPasswordSuccess("Password reset successfully! You can now log in with your new password.");
      setTimeout(() => {
        setShowForgotPasswordModal(false);
        setForgotPasswordUsername("");
        setForgotPasswordOtpInput("");
        setForgotPasswordExpectedOtp("");
        setForgotPasswordSecurityQuestion(null);
        setForgotPasswordSecurityAnswer("");
        setForgotPasswordNewPassword("");
        setForgotPasswordError(null);
        setForgotPasswordSuccess(null);
        setForgotPasswordStep("username");
      }, 3000);
    } catch (err) {
      setForgotPasswordError((err as Error).message || "Something went wrong");
    } finally {
      setSubmittingForgotPassword(false);
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
      if (data.escalateMessaging) {
        setShowUpgradeInterstitial(true);
      }

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
      localStorage.removeItem("pracup_profile_id");
      setProfileId(null);
      setProfile(null);
      setWorksheets([]);
      setWeaknesses([]);
      setSubjectFilter("ALL");
      
      const savedParentPhone = localStorage.getItem("pracup_parent_phone");
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
    localStorage.removeItem("pracup_profile_id");
    localStorage.removeItem("pracup_parent_phone");
    localStorage.setItem("pracup_show_logout_toast", "true");
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
    setEditStudentPhone(profile.studentPhone || "");
    setEditPassword("");
    setEditCurrentPassword("");
    setEditVerifySecurityAnswerInput("");
    setShowPasswordChange(false);
    setShowEditPassword(false);
    setEditProfileTab("academic");

    // Load parent/recovery email & phone directly
    setEditParentEmail(profile.parentEmail || "");
    setEditParentPhone(profile.parentPhone || "");

    // Load security question if configured, otherwise use default
    setEditSecurityQuestion(profile.securityQuestion || "none");
    setEditSecurityAnswer("");

    setShowEditModal(true);
    // Reset OTP verification states
    setShowEditOtpVerify(false);
    setEditParentVerified(false);
    setEditOtpInput("");
    setEditOtpError(null);
    setEditSimulatedAlert(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !profile || !editName.trim()) return;

    const usernameToSubmit = profile.username || "";

    const isPasswordChanging = editPassword.trim() !== "";
    const isEmailChanging = editParentEmail.trim() !== (profile.parentEmail || "");
    const isPhoneChanging = editParentPhone.trim() !== (profile.parentPhone || "");
    
    const origSecQuestion = profile.securityQuestion || "none";
    const isSecurityQuestionChanging = editSecurityQuestion !== origSecQuestion;
    const isSecurityAnswerChanging = editSecurityAnswer.trim() !== "";

    const isSensitiveUpdate = isPasswordChanging || isEmailChanging || isPhoneChanging || isSecurityQuestionChanging || isSecurityAnswerChanging;

    // Require at least one contact method
    if (!editParentEmail.trim() && !editParentPhone.trim()) {
      alert("Cannot save: the account must have at least one contact method (parent or recovery email/phone). Please enter at least one contact detail.");
      return;
    }

    // Validate security answer setup
    if (editSecurityQuestion !== "none") {
      // If setting up for first time, answer is required
      if (!profile.securityQuestion && !editSecurityAnswer.trim()) {
        alert("Please enter a security question answer.");
        return;
      }
      // If question changed, new answer is required
      if (isSecurityQuestionChanging && !editSecurityAnswer.trim()) {
        alert("You changed the security question. Please provide a new security answer.");
        return;
      }
    }

    // New password strength check
    if (isPasswordChanging) {
      if (editPassword.trim() === editCurrentPassword.trim()) {
        alert("New password cannot be the same as your current password.");
        return;
      }
      const pwdError = validatePasswordStrength(editPassword);
      if (pwdError) {
        alert(pwdError);
        return;
      }
    }

    // Identity verification checks
    if (isSensitiveUpdate) {
      if (!editCurrentPassword.trim()) {
        alert("Current password is required to authorize sensitive profile updates.");
        return;
      }
      if (profile.securityQuestion) {
        if (!editVerifySecurityAnswerInput.trim()) {
          alert(`Please answer your current security question to authorize changes: "${profile.securityQuestion}"`);
          return;
        }
      }
    }

    // Prepare payload fields
    let finalParentEmail = editParentEmail.trim() || null;
    let finalParentPhone = editParentPhone.trim() || null;
    let finalSecurityQuestion = null;
    let finalSecurityAnswer = null;

    if (editSecurityQuestion !== "none") {
      finalSecurityQuestion = editSecurityQuestion;
      finalSecurityAnswer = editSecurityAnswer.trim() ? editSecurityAnswer.trim() : (profile.securityAnswer || null);
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
          parentEmail: finalParentEmail,
          parentPhone: finalParentPhone,
          studentPhone: editStudentPhone.trim() || null,
          username: usernameToSubmit,
          password: isPasswordChanging ? editPassword : undefined,
          currentPassword: editCurrentPassword.trim() || undefined,
          securityQuestion: finalSecurityQuestion,
          securityAnswer: finalSecurityAnswer,
          securityAnswerVerification: editVerifySecurityAnswerInput.trim() || undefined
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
        parentEmail: finalParentEmail,
        parentPhone: finalParentPhone,
        studentPhone: editStudentPhone.trim() || null,
        username: usernameToSubmit,
        securityQuestion: finalSecurityQuestion,
        securityAnswer: finalSecurityAnswer
      } : null);

      setShowEditModal(false);
      setEditCurrentPassword("");
      setEditVerifySecurityAnswerInput("");
      setEditSecurityAnswer("");

      // Refresh dashboard stats
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

  const handleDeleteProfile = async () => {
    if (!profileId || !deletePassword || deleteTypeConfirm !== "DELETE") return;
    
    const reasonLabels: Record<string, string> = {
      complicated: "It's too complicated to use",
      completed: "Completed all chapters / No more topics needed",
      missing_content: "Missing a specific subject or topic",
      different_board: "Want a different school board (ICSE, State Boards, etc.)",
      limits: "Guest limits / Locked solutions",
      other: "Other"
    };

    // Construct reason label
    let finalReason = reasonLabels[deleteReason] || deleteReason;
    if (deleteReason === "other") {
      finalReason = `Other: ${deleteCustomFeedback.trim()}`;
    }

    setDeletingProfile(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/student/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profileId,
          currentPassword: deletePassword,
          reason: finalReason,
          customFeedback: deleteReason === "other" ? deleteCustomFeedback.trim() : null
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete student profile");
      }

      alert("Profile and all associated data deleted successfully.");

      // Success! Clear local storage credentials and session state
      localStorage.removeItem("pracup_profile_id");
      localStorage.removeItem("pracup_parent_phone");
      localStorage.setItem("pracup_show_delete_toast", "true");

      // Reset local states
      setProfileId(null);
      setProfile(null);
      setWorksheets([]);
      setWeaknesses([]);
      setParentUnlocked(false);
      setSubjectFilter("ALL");

      // Reset deletion form states
      setShowDeleteConfirm(false);
      setDeleteReason("");
      setDeleteCustomFeedback("");
      setDeletePassword("");
      setDeleteTypeConfirm("");

      setShowEditModal(false);

      // Redirect to signin landing
      setAuthMode("signin");
      router.push("/");
      
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred during profile deletion.");
    } finally {
      setDeletingProfile(false);
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

  const renderRecoveryModals = () => {
    return (
      <>
        {/* Forgot Username Modal */}
        {showForgotUsernameModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
            <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "450px", margin: "20px", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Forgot Username</h3>
                <button
                  type="button"
                  onClick={closeForgotUsernameModal}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "1.5rem",
                    fontWeight: 300,
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
              </div>

              {forgotUsernameStep === "contact" ? (
                <form onSubmit={handleForgotUsernameSubmit}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
                    Enter the parent or recovery email/phone registered with your profile to recover your username(s).
                  </p>

                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label">Parent or Recovery Contact</label>
                    <input
                      type="text"
                      required
                      placeholder="parent@example.com or +91 9876543210"
                      className="form-input"
                      value={forgotUsernameContact}
                      onChange={e => setForgotUsernameContact(e.target.value)}
                    />
                  </div>

                  {forgotUsernameError && (
                    <div style={{ color: "#dc2626", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
                      {forgotUsernameError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      onClick={closeForgotUsernameModal}
                      disabled={submittingForgotUsername}
                    >
                      Close
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submittingForgotUsername}>
                      {submittingForgotUsername ? "Checking..." : "Next →"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotUsernameVerify}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
                    A simulated verification code has been sent to your registered parent or recovery contact.
                  </p>

                  {forgotUsernameSimulatedAlert && (
                    <div style={{
                      background: "rgba(6, 182, 212, 0.08)",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "20px",
                      fontSize: "0.82rem",
                      color: "var(--accent-cyan)",
                      textAlign: "center",
                      lineHeight: 1.4
                    }}>
                      📨 {forgotUsernameSimulatedAlert}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Enter 4-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="Enter OTP"
                      className="form-input"
                      style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "0.15em" }}
                      value={forgotUsernameOtpInput}
                      onChange={e => setForgotUsernameOtpInput(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  {forgotUsernameSecurityQuestion && (
                    <div style={{ padding: "14px", border: "1px dashed rgba(167, 139, 250, 0.3)", borderRadius: "8px", background: "rgba(167, 139, 250, 0.02)", marginBottom: "16px" }}>
                      <label className="form-label" style={{ fontSize: "0.78rem", color: "#a78bfa", marginBottom: "6px" }}>
                        Security Question Check:
                      </label>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "10px", fontWeight: 600 }}>
                        {forgotUsernameSecurityQuestion}
                      </p>
                      <input
                        type="text"
                        required
                        placeholder="Enter security question answer"
                        className="form-input"
                        value={forgotUsernameSecurityAnswer}
                        onChange={e => setForgotUsernameSecurityAnswer(e.target.value)}
                      />
                    </div>
                  )}

                  {forgotUsernameError && (
                    <div style={{ color: "#dc2626", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
                      {forgotUsernameError}
                    </div>
                  )}

                  {forgotUsernameSuccess && (
                    <div style={{ color: "#10b981", fontSize: "0.82rem", textAlign: "center", marginBottom: "16px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", padding: "10px 12px" }}>
                      🎉 {forgotUsernameSuccess}
                    </div>
                  )}

                  {recoveredUsernames && recoveredUsernames.length > 0 && (
                    <div style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "16px",
                      marginBottom: "20px"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Recovered Username(s):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {recoveredUsernames.map((uname, index) => (
                          <div key={index} style={{
                            background: "rgba(167, 139, 250, 0.1)",
                            border: "1px solid rgba(167, 139, 250, 0.3)",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "0.95rem",
                            color: "#c084fc",
                            fontWeight: 600,
                            fontFamily: "monospace"
                          }}>
                            {uname}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => { setForgotUsernameStep("contact"); setForgotUsernameError(null); setForgotUsernameSuccess(null); setRecoveredUsernames(null); }}
                      disabled={submittingForgotUsername}
                    >
                      Back
                    </button>
                    {!recoveredUsernames ? (
                      <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submittingForgotUsername}>
                        {submittingForgotUsername ? "Verifying..." : "Verify & Recover"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ flex: 1 }}
                        onClick={closeForgotUsernameModal}
                      >
                        Done
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotPasswordModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
            <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "450px", margin: "20px", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Forgot Password</h3>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "1.5rem",
                    fontWeight: 300,
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
              </div>

              {forgotPasswordStep === "username" ? (
                <form onSubmit={handleForgotPasswordRequest}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
                    Please enter your student username to verify your account and trigger a password reset code.
                  </p>

                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. aarav123"
                      className="form-input"
                      value={forgotPasswordUsername}
                      onChange={e => setForgotPasswordUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    />
                  </div>

                  {forgotPasswordError && (
                    <div style={{ color: "#dc2626", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
                      {forgotPasswordError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => setShowForgotPasswordModal(false)}
                      disabled={submittingForgotPassword}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submittingForgotPassword}>
                      {submittingForgotPassword ? "Checking..." : "Next →"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotPasswordReset}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
                    A simulated verification code has been sent to your registered parent or recovery contact.
                  </p>

                  {forgotPasswordSimulatedAlert && (
                    <div style={{
                      background: "rgba(6, 182, 212, 0.08)",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "20px",
                      fontSize: "0.82rem",
                      color: "var(--accent-cyan)",
                      textAlign: "center",
                      lineHeight: 1.4
                    }}>
                      📨 {forgotPasswordSimulatedAlert}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Enter 4-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="Enter OTP"
                      className="form-input"
                      style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "0.15em" }}
                      value={forgotPasswordOtpInput}
                      onChange={e => setForgotPasswordOtpInput(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  {forgotPasswordSecurityQuestion && (
                    <div style={{ padding: "14px", border: "1px dashed rgba(167, 139, 250, 0.3)", borderRadius: "8px", background: "rgba(167, 139, 250, 0.02)", marginBottom: "16px" }}>
                      <label className="form-label" style={{ fontSize: "0.78rem", color: "#a78bfa", marginBottom: "6px" }}>
                        Security Question Check:
                      </label>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "10px", fontWeight: 600 }}>
                        {forgotPasswordSecurityQuestion}
                      </p>
                      <input
                        type="text"
                        required
                        placeholder="Enter security question answer"
                        className="form-input"
                        value={forgotPasswordSecurityAnswer}
                        onChange={e => setForgotPasswordSecurityAnswer(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter strong new password"
                      className="form-input"
                      value={forgotPasswordNewPassword}
                      onChange={e => setForgotPasswordNewPassword(e.target.value)}
                    />
                    {forgotPasswordNewPassword && (() => {
                      const strength = getPasswordStrength(forgotPasswordNewPassword);
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

                  {forgotPasswordError && (
                    <div style={{ color: "#dc2626", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
                      {forgotPasswordError}
                    </div>
                  )}

                  {forgotPasswordSuccess && (
                    <div style={{ color: "#10b981", fontSize: "0.82rem", textAlign: "center", marginBottom: "16px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", padding: "10px 12px" }}>
                      🎉 {forgotPasswordSuccess}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => { setForgotPasswordStep("username"); setForgotPasswordError(null); }}
                      disabled={submittingForgotPassword}
                    >
                      Back
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submittingForgotPassword}>
                      {submittingForgotPassword ? "Resetting..." : "Reset Password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </>
    );
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
            <div className="brand-logo-badge">
              <img src="/finallogo3.png" alt="PracUp Logo" className="brand-logo-horizontal" style={{ height: "40px", objectFit: "contain" }} />
            </div>
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
              <div>
                {/* Login Mode Switcher Tabs */}
                <div className="slider-tabs-container" style={{ margin: "0 auto 24px auto", background: "rgba(255,255,255,0.02)" }}>
                  <button
                    type="button"
                    className={`slider-tab-btn ${signInTab === "student" ? "active" : ""}`}
                    onClick={() => setSignInTab("student")}
                    style={{ fontSize: "0.85rem", padding: "10px", flex: 1 }}
                  >
                    🎒 Student Username
                  </button>
                  <button
                    type="button"
                    className={`slider-tab-btn ${signInTab === "parent" ? "active" : ""}`}
                    onClick={() => setSignInTab("parent")}
                    style={{ fontSize: "0.85rem", padding: "10px", flex: 1 }}
                  >
                    👨‍👩‍👧 Parent Phone/Email (OTP)
                  </button>
                  <div
                    className="slider-tab-indicator"
                    style={{
                      width: "calc(50% - 4px)",
                      transform: `translateX(${signInTab === "student" ? "0%" : "100%"})`
                    }}
                  />
                </div>

                {signInTab === "student" ? (
                  /* STUDENT LOGIN FORM */
                  <form onSubmit={handleLogin} style={{ marginBottom: "24px" }}>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. aarav123"
                        className="form-input premium-input"
                        value={studentUsernameInput}
                        onChange={e => setStudentUsernameInput(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label className="form-label">Password</label>
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
                      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "12px", borderRadius: "6px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "20px" }}>
                        {error}
                      </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loadingProfiles}>
                      {loadingProfiles ? "Logging in..." : "Log In 🚀"}
                    </button>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginTop: "14px", marginBottom: "10px" }}>
                      <span 
                        onClick={() => { 
                          closeForgotUsernameModal();
                          setShowForgotUsernameModal(true); 
                        }} 
                        style={{ color: "#a78bfa", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Forgot Username?
                      </span>
                      <span 
                        onClick={() => { 
                          setShowForgotPasswordModal(true); 
                          setForgotPasswordStep("username"); 
                          setForgotPasswordUsername(""); 
                          setForgotPasswordOtpInput(""); 
                          setForgotPasswordSecurityAnswer(""); 
                          setForgotPasswordNewPassword(""); 
                          setForgotPasswordError(null); 
                          setForgotPasswordSuccess(null); 
                          setForgotPasswordSimulatedAlert(null); 
                        }} 
                        style={{ color: "#a78bfa", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Forgot Password?
                      </span>
                    </div>
                  </form>
                ) : (
                  /* PARENT LOGIN / PROFILE SELECTION VIEW */
                  <div style={{ marginBottom: "24px" }}>
                    {!parentUnlocked ? (
                      /* PARENT PHONE/EMAIL OTP FORM */
                      <form onSubmit={otpSent ? handleParentOtpVerify : handleParentOtpRequest}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
                          {!otpSent 
                            ? "Enter parent's phone number or email to retrieve associated student profiles." 
                            : "Enter the simulated 4-digit OTP sent to your contact."}
                        </p>

                        {simulatedAlert && (
                          <div style={{
                            background: "rgba(6, 182, 212, 0.08)",
                            border: "1px solid rgba(6, 182, 212, 0.3)",
                            borderRadius: "8px",
                            padding: "12px",
                            marginBottom: "20px",
                            fontSize: "0.82rem",
                            color: "var(--accent-cyan)",
                            textAlign: "center",
                            lineHeight: 1.4
                          }}>
                            📨 {simulatedAlert}
                          </div>
                        )}

                        {!otpSent ? (
                          <div className="form-group" style={{ marginBottom: "20px" }}>
                            <label className="form-label">Parent Phone Number or Email</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. parent@example.com or +91 9876543210"
                              className="form-input premium-input"
                              value={parentPhoneInput}
                              onChange={e => setParentPhoneInput(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="form-group" style={{ marginBottom: "20px" }}>
                            <label className="form-label">4-Digit OTP Code</label>
                            <input
                              type="text"
                              maxLength={4}
                              required
                              placeholder="Enter OTP"
                              className="form-input premium-input"
                              style={{ textAlign: "center", fontSize: "1.3rem", letterSpacing: "0.15em" }}
                              value={parentOtpInput}
                              onChange={e => setParentOtpInput(e.target.value.replace(/\D/g, ""))}
                            />
                          </div>
                        )}

                        {error && (
                          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "12px", borderRadius: "6px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "20px" }}>
                            {error}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "10px" }}>
                          {otpSent && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ flex: 1 }}
                              onClick={() => { setOtpSent(false); setParentOtpInput(""); setParentOtpCode(""); setSimulatedAlert(null); setError(null); }}
                            >
                              Back
                            </button>
                          )}
                          <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loadingProfiles}>
                            {loadingProfiles ? "Verifying..." : otpSent ? "Verify & Lookup" : "Request OTP Code"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* PROFILE SELECTOR LIST FOR PARENT */
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            Connected profiles for parent <strong>{parentPhoneInput || localStorage.getItem("pracup_parent_phone")}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.removeItem("pracup_parent_phone");
                              setParentUnlocked(false);
                              setExistingProfiles([]);
                              setOtpSent(false);
                              setParentPhoneInput("");
                            }}
                            style={{ background: "none", border: "none", color: "var(--accent-purple)", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}
                          >
                            Disconnect
                          </button>
                        </div>

                        {loadingProfiles ? (
                          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>Retrieving student profiles...</p>
                        ) : existingProfiles.length === 0 ? (
                          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", fontSize: "0.85rem" }}>
                            No student profiles found linked to this contact. Please switch back to the Student tab or create a new profile.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                            {existingProfiles.map(p => {
                              const isSoftDeleted = !!p.deletedAt;
                              let daysLeft = 0;
                              if (isSoftDeleted && p.deletedAt) {
                                daysLeft = 30 - Math.ceil((new Date().getTime() - new Date(p.deletedAt).getTime()) / (1000 * 60 * 60 * 24));
                              }

                              return (
                                <div
                                  key={p.id}
                                  style={{
                                    background: isSoftDeleted ? "rgba(239, 68, 68, 0.02)" : "rgba(255, 255, 255, 0.015)",
                                    border: isSoftDeleted 
                                      ? "1px dashed rgba(239, 68, 68, 0.25)" 
                                      : "1px solid rgba(255, 255, 255, 0.08)",
                                    borderRadius: "8px",
                                    padding: "12px 16px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    opacity: isSoftDeleted ? 0.75 : 1
                                  }}
                                >
                                  <div style={{ textAlign: "left" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{p.name}</strong>
                                      {isSoftDeleted && (
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "4px", padding: "1px 6px" }}>
                                          Deleted ({daysLeft}d left)
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                      {p.board} &bull; {p.grade}
                                    </span>
                                  </div>

                                  <div>
                                    {isSoftDeleted ? (
                                      <button
                                        type="button"
                                        className="btn-primary"
                                        style={{
                                          padding: "5px 12px",
                                          fontSize: "0.75rem",
                                          background: "rgba(167, 139, 250, 0.15)",
                                          border: "1px solid #a78bfa",
                                          color: "#c084fc",
                                          borderRadius: "4px",
                                          cursor: "pointer"
                                        }}
                                        onClick={async () => {
                                          if (confirm(`Would you like to restore the profile for ${p.name}? All worksheets and progress logs will be fully recovered.`)) {
                                            try {
                                              const res = await fetch("/api/student/profile/restore", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ id: p.id })
                                              });
                                              if (res.ok) {
                                                alert(`${p.name}'s profile has been successfully restored!`);
                                                // Refresh profiles
                                                const phone = parentPhoneInput || localStorage.getItem("pracup_parent_phone") || "";
                                                const freshRes = await fetch(`/api/student/profiles?contact=${encodeURIComponent(phone)}`);
                                                if (freshRes.ok) {
                                                  const freshData = await freshRes.json();
                                                  setExistingProfiles(freshData);
                                                }
                                              } else {
                                                const errData = await res.json();
                                                alert(errData.error || "Failed to restore profile");
                                              }
                                            } catch (err) {
                                              alert("Error restoring profile: " + (err as Error).message);
                                            }
                                          }
                                        }}
                                      >
                                        Restore Account
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ padding: "5px 12px", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer" }}
                                        onClick={() => selectProfile(p.id)}
                                      >
                                        Practice &rarr;
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Guest Practice Option */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  <div
                    onClick={() => {
                      localStorage.removeItem("pracup_profile_id");
                      localStorage.removeItem("pracup_parent_phone");
                      localStorage.setItem("pracup_show_logout_toast", "true");
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
                      if (regTier === "FREE") {
                        handleRegister(e);
                      } else {
                        setSignupStep("payment");
                      }
                    }}>
                      {/* Signup profile type selection */}
                      <div className="form-group" style={{ marginBottom: "24px" }}>
                        <label className="form-label">Profile Type</label>
                        <select 
                          className="form-select" 
                          value={regUserType} 
                          onChange={e => { setRegUserType(e.target.value as "parent" | "student"); setError(null); }}
                          style={{ width: "100%", padding: "14px", borderRadius: "8px" }}
                        >
                          <option value="student">Student Profile (For students to solve & practice)</option>
                          <option value="parent">Parent Profile (Includes direct grading & diagnostics access)</option>
                        </select>
                      </div>

                      {regUserType === "student" && ["LKG", "UKG", "Class 1", "Class 2", "Class 3"].includes(regGrade) && (
                        <div style={{
                          background: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "16px",
                          fontSize: "0.8rem",
                          color: "#fbbf24",
                          lineHeight: 1.4
                        }}>
                          ⚠️ <strong>Notice:</strong> For junior grades (LKG to Class 3), it is recommended that a Parent registers the account to monitor progress and verify answers.
                          <button
                            type="button"
                            onClick={() => setRegUserType("parent")}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#fbbf24",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontWeight: "bold",
                              marginLeft: "6px"
                            }}
                          >
                            Switch to Parent Profile
                          </button>
                        </div>
                      )}

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
                        <h4 style={{ fontSize: "0.9rem", color: "#a78bfa", marginBottom: "12px", fontWeight: 700 }}>
                          Parent Contact {regUserType === "student" ? "(Optional for Students)" : "(Required for Parents)"}
                        </h4>
                        
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label className="form-label">Parent Email Address</label>
                          <input
                            type="email"
                            required={regUserType === "parent"}
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
                            required={regUserType === "parent"}
                            placeholder="+91 98765 43210"
                            className="form-input"
                            value={regParentPhone}
                            onChange={e => setRegParentPhone(e.target.value)}
                          />
                        </div>

                        {regUserType === "student" && !regParentEmail.trim() && !regParentPhone.trim() && (
                          <div style={{ padding: "16px 14px", border: "1px dashed rgba(167, 139, 250, 0.3)", borderRadius: "8px", background: "rgba(167, 139, 250, 0.02)", marginTop: "16px" }}>
                            <h4 style={{ fontSize: "0.85rem", color: "#a78bfa", marginBottom: "8px", fontWeight: 700 }}>
                              🔒 Account Recovery Details (Required)
                            </h4>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
                              Since parent contact details are left blank, recovery details are mandatory to retrieve your profile if you forget your credentials.
                            </p>

                            <div className="form-group" style={{ marginBottom: "12px" }}>
                              <label className="form-label" style={{ fontSize: "0.75rem" }}>Select Recovery Type</label>
                              <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                                  <input 
                                    type="radio" 
                                    name="recoveryType" 
                                    checked={regRecoveryType === "email"} 
                                    onChange={() => { setRegRecoveryType("email"); setRegRecoveryContact(""); }}
                                  />
                                  Recovery Email
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                                  <input 
                                    type="radio" 
                                    name="recoveryType" 
                                    checked={regRecoveryType === "mobile"} 
                                    onChange={() => { setRegRecoveryType("mobile"); setRegRecoveryContact(""); }}
                                  />
                                  Recovery Mobile
                                </label>
                              </div>
                            </div>

                            {regRecoveryType !== "none" && (
                              <div className="form-group" style={{ marginBottom: "12px" }}>
                                <label className="form-label" style={{ fontSize: "0.75rem" }}>
                                  {regRecoveryType === "email" ? "Recovery Email Address" : "Recovery Mobile Number"}
                                </label>
                                <input
                                  type={regRecoveryType === "email" ? "email" : "tel"}
                                  required
                                  placeholder={regRecoveryType === "email" ? "recovery@example.com" : "+91 98765 43210"}
                                  className="form-input"
                                  value={regRecoveryContact}
                                  onChange={e => setRegRecoveryContact(e.target.value)}
                                />
                              </div>
                            )}

                            {/* Security Question and Answer */}
                            <div className="form-group" style={{ marginBottom: "12px" }}>
                              <label className="form-label" style={{ fontSize: "0.75rem" }}>Security Question</label>
                              <select 
                                className="form-select" 
                                value={regSecurityQuestion}
                                onChange={e => setRegSecurityQuestion(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "6px", fontSize: "0.8rem" }}
                              >
                                <option value="What is your favorite animal?">What is your favorite animal?</option>
                                <option value="What is the name of your first school?">What is the name of your first school?</option>
                                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                                <option value="In what city were you born?">In what city were you born?</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: "4px" }}>
                              <label className="form-label" style={{ fontSize: "0.75rem" }}>Security Answer</label>
                              <input
                                type="text"
                                required
                                placeholder="Your answer"
                                className="form-input"
                                value={regSecurityAnswer}
                                onChange={e => setRegSecurityAnswer(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: "32px" }}>
                        <label className="form-label" style={{ fontWeight: 600, color: "var(--text-primary)" }}>Membership Plan</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Free Plan */}
                          <div 
                            onClick={() => setRegTier("FREE")}
                            style={{
                              border: regTier === "FREE" ? "2px solid var(--accent-purple)" : "1px solid rgba(255,255,255,0.08)",
                              background: regTier === "FREE" ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                              borderRadius: "8px",
                              padding: "14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              position: "relative",
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <div>
                              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Free Plan</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>5 sheets/day, 150/mo, 18 evaluations/mo</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>FREE</span>
                            </div>
                          </div>

                          {/* Plus Plan */}
                          <div 
                            onClick={() => setRegTier("PLUS")}
                            style={{
                              border: regTier === "PLUS" ? "2px solid var(--accent-purple)" : "1px solid rgba(255,255,255,0.08)",
                              background: regTier === "PLUS" ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                              borderRadius: "8px",
                              padding: "14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              position: "relative",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              overflow: "visible"
                            }}
                          >
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
                              textTransform: "uppercase",
                              zIndex: 10
                            }}>Most Popular</span>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Plus Plan</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Unlimited sheets & grading, 1 Child profile</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-cyan)" }}>₹{systemConfig?.tiers?.plus?.monthlyPriceINR || 199}/mo</span>
                            </div>
                          </div>

                          {/* Family/Pro Plan */}
                          <div 
                            onClick={() => setRegTier("FAMILY_PRO")}
                            style={{
                              border: regTier === "FAMILY_PRO" ? "2px solid var(--accent-purple)" : "1px solid rgba(255,255,255,0.08)",
                              background: regTier === "FAMILY_PRO" ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                              borderRadius: "8px",
                              padding: "14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              position: "relative",
                              cursor: "pointer",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <div>
                              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Family / Pro Plan</p>
                              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Unlimited access, 5 child profiles, Weakness dashboard</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-cyan)" }}>₹{systemConfig?.tiers?.familyPro?.monthlyPriceINR || 349}/mo</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "12px", borderRadius: "6px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "20px" }}>
                          {error}
                        </div>
                      )}

                      <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submittingReg}>
                        {submittingReg ? "Registering..." : regTier === "FREE" ? "Create Free Profile \u2192" : "Continue to Payment \u2192"}
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
                        {regTier === "PLUS" ? "Plus Plan Subscription" : "Family / Pro Plan Subscription"}
                      </h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "18px" }}>
                        {regTier === "PLUS" 
                          ? "Activate your student profile subscription via Razorpay to unlock unlimited generation." 
                          : "Activate your family subscription via Razorpay to unlock 5 student profiles and weakness heatmaps."}
                      </p>

                      {/* Razorpay Gateway Banner */}
                      <div style={{
                        background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(79, 70, 229, 0.08) 100%)",
                        border: "1px solid rgba(124, 58, 237, 0.3)",
                        borderRadius: "10px",
                        padding: "16px",
                        marginBottom: "20px",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        lineHeight: 1.5
                      }}>
                        <p style={{ marginBottom: "8px", color: "#a78bfa", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>💳</span> Razorpay Payment Gateway
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          Supports UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay, Visa, MasterCard, NetBanking, & Mobile Wallets.
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 600, margin: 0 }}>
                          🔒 256-Bit SSL Encrypted & PCI-DSS Compliant Secure Payment
                        </p>
                      </div>

                      {/* Pricing Summary */}
                      <div style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border-glow)",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        fontSize: "0.85rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginBottom: "24px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {regTier === "PLUS" ? "Plus Membership" : "Family / Pro Membership"}
                          </span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                            ₹{regTier === "PLUS" ? (systemConfig?.tiers?.plus?.monthlyPriceINR || 199) : (systemConfig?.tiers?.familyPro?.monthlyPriceINR || 349)}/mo
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Taxes & Processing Fee</span>
                          <span style={{ color: "#34d399", fontWeight: 600 }}>Included</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginTop: "4px", fontWeight: 700, fontSize: "0.95rem" }}>
                          <span style={{ color: "var(--text-primary)" }}>Total Payable Now</span>
                          <span style={{ color: "var(--accent-cyan)" }}>
                            ₹{regTier === "PLUS" ? (systemConfig?.tiers?.plus?.monthlyPriceINR || 199) : (systemConfig?.tiers?.familyPro?.monthlyPriceINR || 349)}
                          </span>
                        </div>
                      </div>

                      {error && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", padding: "12px", borderRadius: "6px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "20px" }}>
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
                          style={{ flex: 2, background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
                          disabled={submittingReg}
                        >
                          {submittingReg 
                            ? "Connecting to Razorpay..." 
                            : `Pay ₹${regTier === "PLUS" ? (systemConfig?.tiers?.plus?.monthlyPriceINR || 199) : (systemConfig?.tiers?.familyPro?.monthlyPriceINR || 349)} & Activate 💳`}
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
        {renderRecoveryModals()}
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

  // Take dynamic sliced attempts for the progression line chart
  const last10Attempts = chartRange === "all"
    ? allGradedAttempts
    : allGradedAttempts.slice(-parseInt(chartRange, 10));

  return (
    <main className="responsive-container" style={{ minHeight: "100vh" }}>
      <ThreeBackground />
      {/* Premium Fading Grid Overlay */}
      <div className="grid-bg-overlay" />

      {/* Floating Tubelight Navbar */}
      <nav className={`tubelight-nav ${mobileMenuOpen ? "open" : ""}`}>
        <div className="tubelight-brand" onClick={() => router.push("/")}>
          <div className="brand-logo-badge">
            <img src="/finallogo3.png" alt="PracUp Logo" className="brand-logo-horizontal" style={{ height: "40px", objectFit: "contain" }} />
          </div>
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
            style={{ padding: "6px 14px", fontSize: "0.78rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#dc2626", borderRadius: "20px" }}
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
              style={{ width: "100%", padding: "10px", fontSize: "0.85rem", borderColor: "rgba(239, 68, 68, 0.3)", color: "#dc2626", borderRadius: "20px" }}
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
                <div style={{ border: "1px solid #10b981", background: "rgba(16, 185, 129, 0.1)", padding: "10px 16px", borderRadius: "6px", color: "#047857", fontSize: "0.85rem", display: "flex", gap: "14px", alignItems: "center" }}>
                  <span>✓ Parent View Active</span>
                  <button type="button" className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#047857" }} onClick={() => setParentUnlocked(false)}>
                    Lock View
                  </button>
                </div>
              )}
              <button
                type="button"
                className="btn-secondary"
                style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", padding: "10px 16px", fontSize: "0.85rem" }}
                onClick={openEditModal}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Tab Selectors */}
      <div className="slider-tabs-container" style={{ maxWidth: "1200px", margin: "20px auto 30px auto" }}>
        <button
          type="button"
          className={`slider-tab-btn ${activeDashboardTab === "create" ? "active" : ""}`}
          onClick={() => setActiveDashboardTab("create")}
        >
          🪄 Create Worksheet
        </button>
        <button
          type="button"
          className={`slider-tab-btn ${activeDashboardTab === "history" ? "active" : ""}`}
          onClick={() => setActiveDashboardTab("history")}
        >
          📂 Practice History
        </button>
        <button
          type="button"
          className={`slider-tab-btn ${activeDashboardTab === "concepts" ? "active" : ""}`}
          onClick={() => setActiveDashboardTab("concepts")}
        >
          🧠 Concept logs
        </button>
        <button
          type="button"
          className={`slider-tab-btn ${activeDashboardTab === "analytics" ? "active cyan-gradient" : ""}`}
          onClick={() => setActiveDashboardTab("analytics")}
        >
          📊 Analytics
        </button>
        <button
          type="button"
          className={`slider-tab-btn ${activeDashboardTab === "plan" ? "active cyan-gradient" : ""}`}
          onClick={() => setActiveDashboardTab("plan")}
        >
          ⚡ Plan & Quotas
        </button>
        <div
          className={`slider-tab-indicator ${activeDashboardTab === "analytics" || activeDashboardTab === "plan" ? "cyan-gradient" : ""}`}
          style={{
            width: "calc(20% - 4px)",
            left: activeDashboardTab === "create" ? "2px" :
                  activeDashboardTab === "history" ? "calc(20% + 2px)" :
                  activeDashboardTab === "concepts" ? "calc(40% + 2px)" :
                  activeDashboardTab === "analytics" ? "calc(60% + 2px)" : "calc(80% + 2px)",
            transform: "none",
            transition: "left 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s ease, box-shadow 0.3s ease"
          }}
        />
      </div>

      {/* Tab Contents */}
      {activeDashboardTab === "create" && (
        <section style={{ maxWidth: "1200px", margin: "0 auto 60px auto" }}>
          <div className="responsive-dashboard-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <GeneratorWizard
                studentProfileId={profileId}
                onSelectionChange={handleSelectionChange}
                onGenerationSuccess={handleGenerationSuccess}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} className="hide-mobile">
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Interactive Live Preview
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Syncs with wizard selections
                </p>
              </div>
              <PreviewPaper
                board={selections.board}
                grade={selections.grade}
                subject={selections.subject}
                topicName={selections.topicNames.length > 1 ? `${selections.topicNames.length} Chapters` : (selections.topicNames[0] || "Select Chapters")}
                difficulty={selections.difficulty}
                studentName={profile?.name}
              />
            </div>
          </div>
        </section>
      )}

      {activeDashboardTab === "history" && (
        <section style={{ maxWidth: "1200px", margin: "0 auto 40px auto" }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "20px", borderBottom: "1px solid var(--border-glow)", paddingBottom: "10px" }}>
              Practice History
            </h3>
            {worksheets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>No worksheets generated yet.</p>
                <button type="button" className="btn-secondary" style={{ marginTop: "14px", fontSize: "0.85rem" }} onClick={() => setActiveDashboardTab("create")}>
                  Generate First Worksheet
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "500px", overflowY: "auto", paddingRight: "8px" }}>
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
                            <button
                              type="button"
                              title="Delete worksheet"
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                color: "#dc2626",
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
                          <button
                            type="button"
                            title="Delete worksheet"
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(239, 68, 68, 0.35)",
                              color: "#dc2626",
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
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeDashboardTab === "concepts" && (
        <section style={{ maxWidth: "1200px", margin: "0 auto 40px auto" }}>
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
                      <span style={{ color: "#dc2626" }}>{wk.errorCount} Mistakes logged</span>
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
        </section>
      )}

      {activeDashboardTab === "analytics" && (
        <section style={{ maxWidth: "1200px", margin: "0 auto 40px auto", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Contextual Student Banner */}
          {profile?.profileType === "student" && (
            !profile.parentPhone && !profile.parentEmail ? (
              <div className="glass-card" style={{ padding: "24px", border: "1px dashed var(--accent-purple)", background: "rgba(124, 58, 237, 0.03)" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--accent-purple)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  ✉️ Set Up Parent Integration
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
                  Connect your parent's contact details to enable official worksheet grading, automated analytics tracking, and progress alerts.
                </p>
                <form onSubmit={handleSaveParentDetails} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>Parent Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      className="form-input"
                      value={analyticsParentEmail}
                      onChange={e => setAnalyticsParentEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>Parent Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 9876543210"
                      className="form-input"
                      value={analyticsParentPhone}
                      onChange={e => setAnalyticsParentPhone(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ height: "42px", padding: "0 24px", fontSize: "0.85rem" }}
                    disabled={submittingAnalyticsParent}
                  >
                    {submittingAnalyticsParent ? "Saving..." : "Link Parent"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: "16px 20px", border: "1px solid rgba(16, 185, 129, 0.15)", background: "rgba(16, 185, 129, 0.03)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h4 style={{ fontSize: "0.9rem", color: "#34d399", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    ✓ Parent Profile Connected
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                    Parent contact: <strong>{profile.parentPhone || "N/A"}</strong> &bull; {profile.parentEmail || "N/A"}. Parents can log in separately on their own device to view detailed diagnostics and analytics.
                  </p>
                </div>
              </div>
            )
          )}

          {profile?.tier !== "FAMILY_PRO" ? (
            <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{
              padding: "60px 40px",
              textAlign: "center",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "16px",
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(124, 58, 237, 0.15)"
            }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "20px" }}>🔒</div>
              <h3 className="gradient-text" style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "12px" }}>
                Concept Weakness & Analytics Dashboard
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "520px", margin: "0 auto 28px auto", lineHeight: 1.6 }}>
                Unlock a detailed breakdown of your child's concept-wise performance, tracking correct/incorrect answers, subject filters, and custom progression graphs.
              </p>
              <button 
                type="button" 
                className="btn-primary" 
                style={{
                  background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                  padding: "14px 36px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)"
                }}
                onClick={() => {
                  setShowEditModal(true);
                  setEditProfileTab("billing");
                }}
              >
                Upgrade to Family / Pro Plan &rarr;
              </button>
            </div>
          ) : (
            <>
              <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <span style={{ fontSize: "1.4rem" }}>⚠️</span>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Focus Areas</span>
                <h3 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ef4444", margin: "4px 0 0 0" }}>
                  {sortedWeak.length}
                </h3>
              </div>
            </div>

          {/* Learn Progression Line Chart */}
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glow)", paddingBottom: "10px", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
                Academic Progression ({chartRange === "all" ? "Lifetime" : `Last ${chartRange}`} Graded Attempts)
              </h3>
              
              {/* Timeline range selector controls */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { label: "Last 5", value: "5" },
                  { label: "Last 10", value: "10" },
                  { label: "Last 20", value: "20" },
                  { label: "Last 50", value: "50" },
                  { label: "Lifetime", value: "all" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn-secondary ${chartRange === opt.value ? "active" : ""}`}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      fontSize: "0.7rem",
                      border: "1px solid " + (chartRange === opt.value ? "var(--accent-cyan)" : "rgba(255,255,255,0.04)"),
                      color: chartRange === opt.value ? "var(--accent-cyan)" : "var(--text-secondary)",
                      background: chartRange === opt.value ? "rgba(6, 182, 212, 0.06)" : "rgba(255,255,255,0.01)"
                    }}
                    onClick={() => setChartRange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {last10Attempts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                <p style={{ fontSize: "0.95rem" }}>No attempts graded yet to display progress charts.</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "6px" }}>Scores will be plotted chronologically once worksheets are graded.</p>
              </div>
            ) : (
              <div style={{ position: "relative", width: "100%", maxWidth: "800px", margin: "0 auto", padding: "10px 0" }}>
                <svg viewBox="0 0 500 200" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                  <defs>
                    <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                  <line x1="40" y1="57.5" x2="480" y2="57.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                  <line x1="40" y1="95" x2="480" y2="95" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                  <line x1="40" y1="132.5" x2="480" y2="132.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                  <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.08)" />

                  {/* Y-axis Labels */}
                  <text x="30" y="24" fill="var(--text-muted)" fontSize="9" textAnchor="end">100%</text>
                  <text x="30" y="99" fill="var(--text-muted)" fontSize="9" textAnchor="end">50%</text>
                  <text x="30" y="174" fill="var(--text-muted)" fontSize="9" textAnchor="end">0%</text>

                  {/* Area Under Line */}
                  {(() => {
                    const points = last10Attempts.map((att, i) => {
                      const x = last10Attempts.length > 1
                        ? 40 + (i * (440 / (last10Attempts.length - 1)))
                        : 260;
                      const y = 170 - (att.percentage * 1.5);
                      return { x, y };
                    });
                    const pathStr = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                    const fillStr = points.length > 0
                      ? `${pathStr} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`
                      : "";
                    return (
                      <>
                        {fillStr && <path d={fillStr} fill="url(#chart-glow)" />}
                        {pathStr && <path d={pathStr} fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" />}
                        {last10Attempts.map((att, i) => {
                          const x = last10Attempts.length > 1
                            ? 40 + (i * (440 / (last10Attempts.length - 1)))
                            : 260;
                          const y = 170 - (att.percentage * 1.5);
                          const isHovered = hoveredProgressPoint?.x === x;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? "var(--accent-cyan)" : "var(--bg-primary)"}
                              stroke="var(--accent-cyan)"
                              strokeWidth="2"
                              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                              onMouseEnter={() => setHoveredProgressPoint({ x, y, percentage: att.percentage, dateStr: att.dateStr, topic: att.topic })}
                              onMouseLeave={() => setHoveredProgressPoint(null)}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                {hoveredProgressPoint && (
                  <div style={{
                    position: "absolute",
                    left: `${(hoveredProgressPoint.x / 500) * 100}%`,
                    top: `${(hoveredProgressPoint.y / 200) * 100}%`,
                    transform: hoveredProgressPoint.percentage > 70
                      ? "translate(-50%, 12px)"
                      : "translate(-50%, calc(-100% - 12px))",
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid var(--accent-cyan)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "0.72rem",
                    color: "#fff",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(6, 182, 212, 0.25)"
                  }}>
                    <strong>{hoveredProgressPoint.percentage}%</strong> - {hoveredProgressPoint.topic}<br/>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{hoveredProgressPoint.dateStr}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Concepts Mastery List */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {/* Strong Areas Card */}
            <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid rgba(16, 185, 129, 0.15)", paddingBottom: "10px", color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
                ✓ Strong Concepts
              </h3>
              {sortedStrong.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No concepts marked strong yet. Complete worksheets with high scores to populate.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "6px" }}>
                  {sortedStrong.map(wk => (
                    <div key={wk.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "6px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{wk.subtopic}</strong>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>{wk.subject} &bull; {wk.topic}</p>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#34d399", background: "rgba(16, 185, 129, 0.08)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                        {wk.successCount} Correct
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Focus Areas Card */}
            <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid rgba(239, 68, 68, 0.15)", paddingBottom: "10px", color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                ⚠️ Needs Improvement (Focus Areas)
              </h3>
              {sortedWeak.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Great job! No weak concepts identified.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "6px" }}>
                  {sortedWeak.map(wk => (
                    <div key={wk.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "6px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{wk.subtopic}</strong>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>{wk.subject} &bull; {wk.topic}</p>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.08)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                        {wk.errorCount} Mistakes
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )}

  {activeDashboardTab === "plan" && (
    <section style={{ maxWidth: "1200px", margin: "0 auto 60px auto" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <span style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "var(--accent-purple)",
          background: "rgba(124, 58, 237, 0.12)",
          padding: "5px 14px",
          borderRadius: "20px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          border: "1px solid rgba(124, 58, 237, 0.2)",
          display: "inline-block",
          marginBottom: "12px"
        }}>
          ⚡ Subscription & Usage Hub
        </span>
        <h2 className="gradient-text" style={{ fontSize: "2rem", marginBottom: "8px" }}>
          My Plan, Quotas & Add-Ons
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "600px", margin: "0 auto" }}>
          View real-time daily generation counters, monthly detailed review credits, active plan status, and upgrade options.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Active Subscription Details Card */}
        <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "28px", border: "1px solid rgba(124, 58, 237, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Current Subscription</span>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0 0 0" }}>
                {profile?.tier === "PLUS" ? "PracUp Plus" : profile?.tier === "FAMILY_PRO" ? "PracUp Family" : "Registered Free"}
              </h3>
            </div>
            <span style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "20px"
            }}>
              Active 🟢
            </span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
            {profile?.tier === "PLUS" 
              ? "Unlimited worksheet generation, unlimited detailed AI reviews, and priority processing speed."
              : profile?.tier === "FAMILY_PRO"
              ? "Up to 5 child profiles, unlimited generations & detailed evaluations, plus full analytics dashboard."
              : "Free student account with 5 daily worksheets & 18 monthly AI evaluation reviews."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Billing Rate</span>
              <strong style={{ color: "var(--text-primary)" }}>
                {profile?.tier === "PLUS" ? "₹199 / month" : profile?.tier === "FAMILY_PRO" ? "₹349 / month" : "₹0 / Free"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Payment Method</span>
              <strong style={{ color: "var(--accent-cyan)" }}>Razorpay Secure Gateway</strong>
            </div>
          </div>
        </div>

        {/* Real-time Usage & Quota Counter Card */}
        <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "28px", border: "1px solid rgba(6, 182, 212, 0.25)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "18px" }}>
            📊 Real-time Usage & Quota Gauges
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Daily Worksheet Generations */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>📝 Daily Worksheet Generations</span>
                <strong style={{ color: "var(--accent-cyan)" }}>
                  {profile?.tier !== "FREE" ? "Unlimited ∞" : `${quotaDetails.dailyGenerationsUsed} / ${quotaDetails.dailyGenerationLimit} Used Today`}
                </strong>
              </div>
              {profile?.tier === "FREE" && (
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, (quotaDetails.dailyGenerationsUsed / quotaDetails.dailyGenerationLimit) * 100)}%`,
                    height: "100%",
                    background: quotaDetails.dailyGenerationsUsed >= quotaDetails.dailyGenerationLimit ? "#ef4444" : "var(--accent-cyan)",
                    transition: "width 0.4s ease"
                  }} />
                </div>
              )}
            </div>

            {/* Monthly AI Solution Reviews */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>🔍 Detailed AI Solution Reviews</span>
                <strong style={{ color: "var(--accent-purple)" }}>
                  {profile?.tier !== "FREE" ? "Unlimited ∞" : `${quotaDetails.monthlyEvaluationsUsed} / ${quotaDetails.monthlyEvaluationLimit} Used This Month`}
                </strong>
              </div>
              {profile?.tier === "FREE" && (
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(100, (quotaDetails.monthlyEvaluationsUsed / quotaDetails.monthlyEvaluationLimit) * 100)}%`,
                    height: "100%",
                    background: quotaDetails.monthlyEvaluationsUsed >= quotaDetails.monthlyEvaluationLimit ? "#ef4444" : "var(--accent-purple)",
                    transition: "width 0.4s ease"
                  }} />
                </div>
              )}
            </div>

            {/* Extra Booster Credits Balance */}
            <div style={{
              background: "rgba(124, 58, 237, 0.05)",
              border: "1px solid rgba(124, 58, 237, 0.15)",
              borderRadius: "8px",
              padding: "12px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Extra Booster Pack Balance</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.95rem", fontWeight: 700, color: "#a78bfa" }}>
                  +{quotaDetails.extraBoosterCredits} Evaluation Credits
                </p>
              </div>
              <span style={{ fontSize: "1.2rem" }}>⚡</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Upgrade & Booster Purchase Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
        {/* Plus Upgrade Card */}
        <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px", border: "1px solid rgba(124, 58, 237, 0.3)", display: "flex", flexDirection: "column" }}>
          <h4 style={{ fontSize: "1.1rem", color: "#a78bfa", margin: "0 0 6px 0" }}>PracUp Plus</h4>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: "14px" }}>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>₹199</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "4px" }}>/ month</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
            <li>✓ Unlimited worksheet generations</li>
            <li>✓ Unlimited detailed AI solution reviews</li>
            <li>✓ Weekly parent progress summary emails</li>
          </ul>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", fontWeight: 700 }}
            onClick={() => {
              setShowEditModal(true);
              setEditProfileTab("billing");
            }}
          >
            {profile?.tier === "PLUS" ? "Active Plan ✓" : "Upgrade to Plus (₹199) 🚀"}
          </button>
        </div>

        {/* Family Upgrade Card */}
        <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px", border: "1px solid rgba(6, 182, 212, 0.3)", display: "flex", flexDirection: "column" }}>
          <h4 style={{ fontSize: "1.1rem", color: "var(--accent-cyan)", margin: "0 0 6px 0" }}>PracUp Family</h4>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: "14px" }}>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>₹349</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "4px" }}>/ month</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
            <li>✓ Up to 5 Child Profiles</li>
            <li>✓ Unlimited generations & AI reviews</li>
            <li>✓ Full Analytics & Weakness Heatmap</li>
          </ul>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", fontWeight: 700, background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
            onClick={() => {
              setShowEditModal(true);
              setEditProfileTab("billing");
            }}
          >
            {profile?.tier === "FAMILY_PRO" ? "Active Plan ✓" : "Upgrade to Family (₹349) 👑"}
          </button>
        </div>

        {/* Add-On Booster Credit Pack Card */}
        <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "24px", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", flexDirection: "column" }}>
          <h4 style={{ fontSize: "1.1rem", color: "#34d399", margin: "0 0 6px 0" }}>⚡ Booster Pack</h4>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: "14px" }}>
            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>₹99</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "4px" }}>/ one-time</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
            <li>✓ +20 Extra Detailed Evaluation Credits</li>
            <li>✓ No monthly subscription required</li>
            <li>✓ Valid for 90 days</li>
          </ul>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", fontWeight: 700, borderColor: "#34d399", color: "#34d399" }}
            onClick={() => {
              setShowEditModal(true);
              setEditProfileTab("billing");
            }}
          >
            Buy Credit Pack (₹99) 💳
          </button>
        </div>
      </div>
    </section>
  )}

      {/* Parent OTP Lock Modal */}
      {showPinModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
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
                color: "var(--accent-cyan)",
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
                <div style={{ color: "#dc2626", fontSize: "0.8rem", textAlign: "center", marginBottom: "16px" }}>
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
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
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
                AI PDF/Image Reviewer (New)
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
                                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                                        <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
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
                                    <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                      <div style={{ flex: 1, marginRight: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                                        <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                        <div style={{ flex: 1 }}>
                                          <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{q.sentence}</p>
                                          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                            Answer Box: <strong style={{ color: "#34d399" }}>{q.answer}</strong>
                                          </p>
                                        </div>
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
                                    <div key={qIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: isCorrect ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.25)" }}>
                                      <div style={{ flex: 1, marginRight: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                                        <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                        <div style={{ flex: 1 }}>
                                          <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>[ {q.words?.join(", ")} ]</p>
                                          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                            Odd One: <strong style={{ color: "#34d399" }}>{q.answer}</strong> ({q.explanation})
                                          </p>
                                        </div>
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
                                      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                        <div style={{ marginTop: "4px" }}>
                                          <GradingMark type={graderScores[key] === true ? "correct" : graderScores[key] === false ? "incorrect" : null} />
                                        </div>
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
                                            <p style={{ fontSize: "0.8rem", color: "#047857" }}>
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
                        accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: "none" }}
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                      />
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {pdfFile ? pdfFile.name : "Select or Drop Solved PDF or Scanned Photo"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        {pdfFile ? `(${(pdfFile.size / 1024 / 1024).toFixed(2)} MB) - Click to change` : "Supports PDF documents or PNG, JPG, WEBP photos"}
                      </p>
                    </div>

                    {/* OCR Formatting Guidelines */}
                    <div style={{
                      width: "100%",
                      background: "rgba(6, 182, 212, 0.03)",
                      border: "1px solid rgba(6, 182, 212, 0.15)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      textAlign: "left"
                    }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-cyan)" }}>OCR Scanner Formatting Guide</span>
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
                      style={{ padding: "12px 30px", fontSize: "0.85rem", display: "flex", gap: "10px", alignItems: "center" }}
                    >
                      <span>Analyze & Grade Solved Work</span>
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
                                expectedAnswer = matched?.right || item.expectedAnswer || "";
                              } else {
                                const q = act.questions?.[qIdx];
                                questionText = `Activity ${actIdx + 1}: ${q?.sentence || q?.words?.join(", ")}`;
                                expectedAnswer = q?.answer || item.expectedAnswer || "";
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
                                expectedAnswer = q.answer || item.expectedAnswer || "";
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
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isCorrect ? "#059669" : "#dc2626", background: isCorrect ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: "1px solid " + (isCorrect ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"), borderRadius: "4px", padding: "2px 8px" }}>
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
                                <p style={{ color: isCorrect ? "#059669" : "#dc2626", fontWeight: 600, marginTop: "2px" }}>{item.studentAnswer || "Not specified"}</p>
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
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "30px", width: "100%", maxWidth: "450px", margin: "20px", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Edit Student Profile</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  fontWeight: 300,
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
              Update your child&apos;s academic details, contact methods, and recovery configurations.
            </p>

            <form onSubmit={handleEditSubmit}>
              {/* Slider Tabs for Edit Profile Modal */}
              <div className="slider-tabs-container" style={{ margin: "0 auto 24px auto", background: "rgba(255,255,255,0.02)", padding: "3px" }}>
                <button
                  type="button"
                  className={`slider-tab-btn ${editProfileTab === "academic" ? "active" : ""}`}
                  onClick={() => setEditProfileTab("academic")}
                  style={{ fontSize: "0.76rem", padding: "6px 2px", flex: 1, whiteSpace: "nowrap" }}
                >
                  🎓 Academic
                </button>
                <button
                  type="button"
                  className={`slider-tab-btn ${editProfileTab === "contact" ? "active" : ""}`}
                  onClick={() => setEditProfileTab("contact")}
                  style={{ fontSize: "0.76rem", padding: "6px 2px", flex: 1, whiteSpace: "nowrap" }}
                >
                  👨‍👩‍👧 Contact
                </button>
                <button
                  type="button"
                  className={`slider-tab-btn ${editProfileTab === "security" ? "active" : ""}`}
                  onClick={() => setEditProfileTab("security")}
                  style={{ fontSize: "0.76rem", padding: "6px 2px", flex: 1, whiteSpace: "nowrap" }}
                >
                  🔑 Security
                </button>
                <button
                  type="button"
                  className={`slider-tab-btn ${editProfileTab === "billing" ? "active" : ""}`}
                  onClick={() => {
                    setEditProfileTab("billing");
                    const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || profile?.username || "";
                    if (contactToUse) {
                      setLoadingBilling(true);
                      fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`)
                        .then(r => r.json())
                        .then(data => setBillingInfo(data))
                        .catch(err => console.warn("Failed to fetch billing info:", err))
                        .finally(() => setLoadingBilling(false));
                    }
                  }}
                  style={{ fontSize: "0.76rem", padding: "6px 2px", flex: 1, whiteSpace: "nowrap" }}
                >
                  💳 Plan & Quotas
                </button>
                <div
                  className="slider-tab-indicator"
                  style={{
                    width: "calc(25% - 4px)",
                    left: editProfileTab === "academic" ? "2px" :
                          editProfileTab === "contact" ? "calc(25% + 2px)" :
                          editProfileTab === "security" ? "calc(50% + 2px)" : "calc(75% + 2px)",
                    transform: "none",
                    transition: "left 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s ease, box-shadow 0.3s ease"
                  }}
                />
              </div>

              {/* Tab 1: Academic Profile */}
              {editProfileTab === "academic" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                    <select className="form-select" value={editGrade} onChange={e => setEditGrade(e.target.value)} style={{ width: "100%" }}>
                      {["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">School Board</label>
                    <input type="text" className="form-input" value="Standard Board" disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                  </div>

                  <div className="form-group" style={{ marginBottom: "0px" }}>
                    <label className="form-label">Student Username (for Login)</label>
                    <input
                      type="text"
                      disabled
                      style={{ opacity: 0.6, cursor: "not-allowed" }}
                      className="form-input"
                      value={editUsername}
                    />
                    <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                      🔒 Username cannot be changed after account creation.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Contact Info */}
              {editProfileTab === "contact" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    background: "rgba(167, 139, 250, 0.05)",
                    border: "1px solid rgba(167, 139, 250, 0.15)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5
                  }}>
                    💡 Provide at least one contact method (email or phone) so you can recover your account or receive notifications.
                  </div>

                  <div className="form-group">
                    <label className="form-label">Parent / Recovery Email</label>
                    <input
                      type="email"
                      placeholder="parent@example.com"
                      className="form-input"
                      value={editParentEmail}
                      onChange={e => setEditParentEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Parent / Recovery Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="form-input"
                      value={editParentPhone}
                      onChange={e => setEditParentPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Security & Password */}
              {editProfileTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Account Recovery Security Question */}
                  <div style={{ paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 style={{ fontSize: "0.9rem", color: "var(--accent-cyan)", marginBottom: "8px", fontWeight: 700 }}>
                      🔒 Account Recovery Question
                    </h4>
                    <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
                      Used to reset password or recover username directly using a security answer.
                    </p>

                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Security Question</label>
                      <select
                        className="form-select"
                        value={editSecurityQuestion}
                        onChange={e => setEditSecurityQuestion(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="none">None - Disable security question recovery</option>
                        <option value="What is your favorite animal?">What is your favorite animal?</option>
                        <option value="In what city were you born?">In what city were you born?</option>
                        <option value="What is your childhood nickname?">What is your childhood nickname?</option>
                        <option value="What is the name of your first school?">What is the name of your first school?</option>
                      </select>
                    </div>

                    {editSecurityQuestion !== "none" && (
                      <div className="form-group" style={{ marginBottom: "0" }}>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Security Answer</label>
                        <input
                          type="text"
                          placeholder={profile?.securityQuestion ? "Enter new answer if changing" : "Enter answer"}
                          className="form-input"
                          value={editSecurityAnswer}
                          onChange={e => setEditSecurityAnswer(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Change Password Block */}
                  <div>
                    {!showPasswordChange ? (
                      <button
                        type="button"
                        onClick={() => setShowPasswordChange(true)}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          background: "rgba(167, 139, 250, 0.08)",
                          border: "1px solid rgba(167, 139, 250, 0.2)",
                          borderRadius: "8px",
                          color: "#a78bfa",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        🔑 Change Password
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#a78bfa" }}>🔑 Change Password</span>
                          <button
                            type="button"
                            onClick={() => { setShowPasswordChange(false); setEditPassword(""); }}
                            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8rem" }}
                          >
                            Cancel
                          </button>
                        </div>

                        {/* Forgot Password reset link */}
                        <div style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditModal(false);
                              setShowForgotPasswordModal(true);
                              setForgotPasswordStep("username");
                              setForgotPasswordUsername(profile?.username || "");
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--accent-cyan)",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0
                            }}
                          >
                            Forgot password? Reset it now
                          </button>
                        </div>

                        <div className="form-group">
                          <label className="form-label">New Password</label>
                          <div style={{ position: "relative" }}>
                            <input
                              type={showEditPassword ? "text" : "password"}
                              placeholder="Enter new strong password"
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
                                  <span style={{ color: "var(--text-secondary)" }}>Strength:</span>
                                  <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                                </div>
                                <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" }}>
                                  <div style={{ width: `${(strength.score / 5) * 100}%`, height: "100%", background: strength.color, transition: "width 0.3s ease" }} />
                                </div>
                                <ul className="pwd-checklist">
                                  {strength.feedback.map(f => (
                                    <li key={f.key} className={`pwd-checklist-item ${f.passed ? 'passed' : 'failed'}`}>
                                      <span>{f.passed ? "✓" : "○"}</span>
                                      <span>{f.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Deletion Panel */}
                  <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(239, 68, 68, 0.15)" }}>
                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          background: "rgba(239, 68, 68, 0.05)",
                          border: "1px solid rgba(239, 68, 68, 0.15)",
                          borderRadius: "8px",
                          color: "#f87171",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.15)";
                        }}
                      >
                        ⚠️ Delete Student Profile
                      </button>
                    ) : (
                      <div style={{
                        background: "rgba(239, 68, 68, 0.03)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "10px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f87171" }}>⚠️ Permanent Account Deletion</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteReason("");
                              setDeleteCustomFeedback("");
                              setDeletePassword("");
                              setDeleteTypeConfirm("");
                              setDeleteError(null);
                            }}
                            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8rem" }}
                          >
                            Cancel
                          </button>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                          Deleting this profile will permanently erase all custom worksheets, attempts history, and weakness logs. This cannot be undone.
                        </p>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.75rem" }}>Why do you want to delete this profile?</label>
                          <select
                            className="form-select"
                            value={deleteReason}
                            onChange={e => setDeleteReason(e.target.value)}
                            style={{ width: "100%" }}
                          >
                            <option value="">Select a reason...</option>
                            <option value="complicated">It's too complicated to use</option>
                            <option value="completed">Completed all chapters / No more topics needed</option>
                            <option value="missing_content">Missing a specific subject or topic</option>
                            <option value="different_board">Want a different school board (ICSE, State Boards, etc.)</option>
                            <option value="limits">Guest limits / Locked solutions</option>
                            <option value="other">Other (please specify)</option>
                          </select>
                        </div>

                        {/* Personalized Churn Reduction Guide Banner */}
                        {deleteReason === "complicated" && (
                          <div style={{ background: "rgba(167, 139, 250, 0.05)", border: "1px solid rgba(167, 139, 250, 0.15)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            💡 <strong>Did you know?</strong> We designed PracUp to be simple! You can click the floating <strong>AI Helper Chatbot</strong> in the bottom right corner of your dashboard and just type: <em>"Give me Class 5 Math Fractions, Easy difficulty"</em> to get sheets instantly without any menus.
                          </div>
                        )}

                        {deleteReason === "completed" && (
                          <div style={{ background: "rgba(6, 182, 212, 0.05)", border: "1px solid rgba(6, 182, 212, 0.15)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            💡 <strong>Did you know?</strong> PracUp dynamically generates brand new, unique questions every single time, even for the same topic! Try changing the difficulty level (Medium/Hard) or creating a <strong>Mixed</strong> format sheet to challenge your child further.
                          </div>
                        )}

                        {deleteReason === "missing_content" && (
                          <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            🚀 <strong>Coming Soon!</strong> We are actively adding new topics and extra-curricular subjects. If there is a specific chapter or topic you need right now, email us at <a href="mailto:request@pracup.co.in" style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>request@pracup.co.in</a> and we will add it for you in the next update!
                          </div>
                        )}

                        {deleteReason === "different_board" && (
                          <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            🚀 <strong>Roadmap Update:</strong> Support for <strong>ICSE</strong> and major <strong>State Boards</strong> (such as UP Board, Maharashtra, Bihar Board, etc.) is currently in active development and will be released in the upcoming update. We'd love for you to stay with us!
                          </div>
                        )}

                        {deleteReason === "limits" && (
                          <div style={{ background: "rgba(6, 182, 212, 0.05)", border: "1px solid rgba(6, 182, 212, 0.15)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            💡 <strong>Tip:</strong> Guest users are limited to 4 worksheets per day and don't get solutions. However, creating a student profile is <strong>100% free</strong> and unlocks unlimited sheet generations and detailed answer keys!
                          </div>
                        )}

                        {deleteReason === "other" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "0.75rem" }}>Please specify your feedback:</label>
                              <textarea
                                className="form-input"
                                placeholder="Tell us how we can improve..."
                                rows={2}
                                value={deleteCustomFeedback}
                                onChange={e => setDeleteCustomFeedback(e.target.value)}
                                style={{ width: "100%", fontSize: "0.8rem", resize: "none" }}
                              />
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                              💡 We appreciate your feedback! If there is any specific feature we can build to make you stay, please email us at <a href="mailto:feedback@pracup.co.in" style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>feedback@pracup.co.in</a>.
                            </div>
                          </div>
                        )}

                        {/* Deletion confirmation inputs - only unlocked when reason is selected */}
                        {deleteReason && (deleteReason !== "other" || deleteCustomFeedback.trim() !== "") && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px dashed rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "0.75rem" }}>Confirm with your Password</label>
                              <input
                                type="password"
                                placeholder="Enter current password"
                                className="form-input"
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                style={{ width: "100%" }}
                              />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "0.75rem" }}>
                                Type <strong style={{ color: "#f87171" }}>DELETE</strong> to confirm
                              </label>
                              <input
                                type="text"
                                placeholder="Type DELETE"
                                className="form-input"
                                value={deleteTypeConfirm}
                                onChange={e => setDeleteTypeConfirm(e.target.value)}
                                style={{ width: "100%" }}
                              />
                            </div>

                            {deleteError && (
                              <div style={{ color: "#f87171", fontSize: "0.75rem", textAlign: "center" }}>
                                ❌ {deleteError}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleDeleteProfile}
                              disabled={deletingProfile || !deletePassword || deleteTypeConfirm !== "DELETE"}
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: (deletePassword && deleteTypeConfirm === "DELETE") ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.02)",
                                border: "1px solid " + ((deletePassword && deleteTypeConfirm === "DELETE") ? "#ef4444" : "rgba(255,255,255,0.06)"),
                                color: (deletePassword && deleteTypeConfirm === "DELETE") ? "#f87171" : "var(--text-secondary)",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                cursor: (deletePassword && deleteTypeConfirm === "DELETE") ? "pointer" : "not-allowed"
                              }}
                            >
                              {deletingProfile ? "Deleting..." : "Permanently Delete Profile"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Billing, Subscriptions & Quotas */}
              {editProfileTab === "billing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{
                    background: "rgba(124, 58, 237, 0.05)",
                    border: "1px solid rgba(124, 58, 237, 0.15)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5
                  }}>
                    💳 <strong>Billing Control Panel</strong>: Manage subscription tiers, cancellation switches, and Booster credit packs.
                  </div>

                  {loadingBilling ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "30px" }}>
                      <div style={{ width: "24px", height: "24px", border: "2px solid rgba(124,58,237,0.1)", borderTop: "2px solid var(--accent-purple)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    </div>
                  ) : billingInfo ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                      {/* Subscription Details Card */}
                      <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border-glow)", borderRadius: "10px", padding: "16px" }}>
                        <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>Active Plan</h4>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#a78bfa" }}>
                            {billingInfo.subscription?.tier === "PLUS" ? "PracUp Plus" :
                             billingInfo.subscription?.tier === "FAMILY_PRO" ? "PracUp Family" : "PracUp Free"}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            {billingInfo.subscription?.endsAt ? `Renewing at ₹${billingInfo.subscription.billingPriceINR}` : "Free tier limits"}
                          </span>
                        </div>

                        {billingInfo.subscription?.endsAt && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                            <span>Renewal Date: {new Date(billingInfo.subscription.endsAt).toLocaleDateString()}</span>
                            <span>Auto-Renew status: <strong>{billingInfo.subscription.autoRenew ? "Enabled" : "Disabled (Expires on date)"}</strong></span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                          {billingInfo.subscription?.tier === "FREE" ? (
                            <>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={billingActionLoading}
                                style={{ flex: 1, padding: "8px 12px", fontSize: "0.75rem" }}
                                onClick={async () => {
                                  setBillingActionLoading(true);
                                  await fetch("/api/billing", {
                                    method: "POST",
                                    body: JSON.stringify({ action: "subscribe", contact: billingInfo.contact, tier: "PLUS" })
                                  });
                                  // Refresh billing details
                                  const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                                  const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                                  const data = await res.json();
                                  setBillingInfo(data);
                                  setBillingActionLoading(false);
                                }}
                              >
                                {billingActionLoading ? "Processing..." : "Get Plus (₹199)"}
                              </button>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={billingActionLoading}
                                style={{ flex: 1, padding: "8px 12px", fontSize: "0.75rem", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
                                onClick={async () => {
                                  setBillingActionLoading(true);
                                  await fetch("/api/billing", {
                                    method: "POST",
                                    body: JSON.stringify({ action: "subscribe", contact: billingInfo.contact, tier: "FAMILY_PRO" })
                                  });
                                  // Refresh billing details
                                  const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                                  const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                                  const data = await res.json();
                                  setBillingInfo(data);
                                  setBillingActionLoading(false);
                                }}
                              >
                                {billingActionLoading ? "Processing..." : "Get Family (₹349)"}
                              </button>
                            </>
                          ) : (
                            <>
                              {billingInfo.subscription?.tier === "PLUS" && (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={billingActionLoading}
                                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.75rem" }}
                                  onClick={async () => {
                                    setBillingActionLoading(true);
                                    await fetch("/api/billing", {
                                      method: "POST",
                                      body: JSON.stringify({ action: "subscribe", contact: billingInfo.contact, tier: "FAMILY_PRO" })
                                    });
                                    // Refresh billing
                                    const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                                    const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                                    const data = await res.json();
                                    setBillingInfo(data);
                                    setBillingActionLoading(false);
                                  }}
                                >
                                  {billingActionLoading ? "Upgrading..." : "Upgrade Family (₹349)"}
                                </button>
                              )}
                              
                              {billingInfo.subscription?.autoRenew ? (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  disabled={billingActionLoading}
                                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.75rem", color: "#f87171" }}
                                  onClick={async () => {
                                    setBillingActionLoading(true);
                                    await fetch("/api/billing", {
                                      method: "POST",
                                      body: JSON.stringify({ action: "cancel", contact: billingInfo.contact })
                                    });
                                    // Refresh billing
                                    const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                                    const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                                    const data = await res.json();
                                    setBillingInfo(data);
                                    setBillingActionLoading(false);
                                  }}
                                >
                                  {billingActionLoading ? "Processing..." : "Turn Off Auto-Renew"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  disabled={billingActionLoading}
                                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.75rem" }}
                                  onClick={async () => {
                                    setBillingActionLoading(true);
                                    await fetch("/api/billing", {
                                      method: "POST",
                                      body: JSON.stringify({ action: "subscribe", contact: billingInfo.contact, tier: billingInfo.subscription.tier, autoRenew: true })
                                    });
                                    // Refresh billing
                                    const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                                    const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                                    const data = await res.json();
                                    setBillingInfo(data);
                                    setBillingActionLoading(false);
                                  }}
                                >
                                  {billingActionLoading ? "Enabling..." : "Enable Auto-Renew"}
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={billingActionLoading}
                                style={{ padding: "8px 12px", fontSize: "0.75rem" }}
                                onClick={async () => {
                                  setBillingActionLoading(true);
                                  await fetch("/api/billing", {
                                    method: "POST",
                                    body: JSON.stringify({ action: "downgrade_free", contact: billingInfo.contact })
                                  });
                                  // Refresh billing
                                  const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                                  const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                                  const data = await res.json();
                                  setBillingInfo(data);
                                  setBillingActionLoading(false);
                                }}
                              >
                                Stop Subscription
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Credit Packs Card */}
                      <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border-glow)", borderRadius: "10px", padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>Booster Credit Balance</h4>
                          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{billingInfo.credits?.totalRemaining || 0} credits</span>
                        </div>

                        {billingInfo.credits?.packs?.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                            {billingInfo.credits.packs.map((pack: any) => (
                              <div key={pack.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", borderBottom: "1px dashed rgba(255,255,255,0.04)", paddingBottom: "6px" }}>
                                <span>📦 Pack of {pack.creditsRemaining} remaining</span>
                                <span style={{ color: pack.daysLeft <= 10 ? "#f87171" : "var(--text-muted)" }}>
                                  Expires in {pack.daysLeft} days
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: "0 0 16px 0", fontStyle: "italic" }}>
                            No active credit packs. Remaining credits expire in 90 days.
                          </p>
                        )}

                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={billingActionLoading}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", fontWeight: 600, fontSize: "0.78rem", border: "1px solid var(--border-glow)", background: "rgba(255,255,255,0.01)" }}
                          onClick={async () => {
                            setBillingActionLoading(true);
                            await fetch("/api/billing", {
                              method: "POST",
                              body: JSON.stringify({ action: "buy_credits", contact: billingInfo.contact, quantity: 1 })
                            });
                            // Refresh billing details
                            const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                            const res = await fetch(`/api/billing?contact=${encodeURIComponent(contactToUse)}`);
                            const data = await res.json();
                            setBillingInfo(data);
                            setBillingActionLoading(false);
                          }}
                        >
                          {billingActionLoading ? "Purchasing..." : "Buy 20 Extra Evaluation Credits (₹99)"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                      Please save valid parent contact details under the Contact tab before upgrading.
                    </p>
                  )}
                </div>
              )}

              {/* Dynamic verification section */}
              {(() => {
                const isPasswordChanging = editPassword.trim() !== "";
                const isEmailChanging = editParentEmail.trim() !== (profile?.parentEmail || "");
                const isPhoneChanging = editParentPhone.trim() !== (profile?.parentPhone || "");
                const origSecQuestion = profile?.securityQuestion || "none";
                const isSecurityQuestionChanging = editSecurityQuestion !== origSecQuestion;
                const isSecurityAnswerChanging = editSecurityAnswer.trim() !== "";
                const isSensitiveUpdate = isPasswordChanging || isEmailChanging || isPhoneChanging || isSecurityQuestionChanging || isSecurityAnswerChanging;

                if (!isSensitiveUpdate) return null;

                return (
                  <div style={{
                    background: "rgba(244, 63, 94, 0.04)",
                    border: "1px dashed rgba(244, 63, 94, 0.25)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginTop: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    <label className="form-label" style={{ color: "#f43f5e", fontSize: "0.8rem", marginBottom: "0", fontWeight: 700 }}>
                      🔒 Security Verification Required
                    </label>
                    <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      You are changing sensitive details (contact info, password, or recovery settings). Confirm your identity to save.
                    </p>

                    {/* Current security answer check if they already have recovery configured */}
                    {profile?.securityQuestion && (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>
                          Current Security Answer
                          <span style={{ color: "var(--text-secondary)", fontWeight: 400, marginLeft: "4px" }}>
                            (Question: {profile.securityQuestion})
                          </span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Verify answer"
                          className="form-input"
                          value={editVerifySecurityAnswerInput}
                          onChange={e => setEditVerifySecurityAnswerInput(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Current password check */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Current Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter password to authorize"
                        className="form-input"
                        value={editCurrentPassword}
                        onChange={e => setEditCurrentPassword(e.target.value)}
                      />
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
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
          </div>
        </div>
      )}
      {/* AI Help Agent Chatbot */}
      <ChatAgent />

      {/* Consecutive Month Quota Interstitial Modal */}
      {showUpgradeInterstitial && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <div className="glass-card spotlight-card" onMouseMove={handleMouseMove} style={{ padding: "40px", width: "100%", maxWidth: "500px", margin: "20px", textAlign: "center", border: "1px solid rgba(124, 58, 237, 0.3)", boxShadow: "0 0 30px rgba(124, 58, 237, 0.25)" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🚀</div>
            <h3 className="gradient-text" style={{ fontSize: "1.6rem", margin: "0 0 12px 0", fontWeight: 800 }}>PracUp Premium Upgrade</h3>
            <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 16px 0", lineHeight: "1.5" }}>
              Amazing work practicing! You have hit your free monthly evaluation limits in consecutive months.
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 24px 0", lineHeight: "1.5" }}>
              To ensure your child continues to get step-by-step explanations, interactive weak-topic analysis, and faster query queues, upgrade to a parent subscription tier.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "14px", fontWeight: 700, borderRadius: "10px", fontSize: "0.9rem" }}
                onClick={async () => {
                  const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                  if (contactToUse) {
                    await fetch("/api/billing", {
                      method: "POST",
                      body: JSON.stringify({ action: "subscribe", contact: contactToUse, tier: "PLUS" })
                    });
                  }
                  setShowUpgradeInterstitial(false);
                  if (showEditModal) {
                    setEditProfileTab("billing");
                  }
                }}
              >
                Upgrade to Plus (₹199/mo) — 1 Child Profile
              </button>

              <button
                type="button"
                className="btn-primary"
                style={{ padding: "14px", fontWeight: 700, borderRadius: "10px", fontSize: "0.9rem", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
                onClick={async () => {
                  const contactToUse = editParentEmail.trim() || editParentPhone.trim() || (profile ? (profile.parentEmail || profile.parentPhone) : "") || "";
                  if (contactToUse) {
                    await fetch("/api/billing", {
                      method: "POST",
                      body: JSON.stringify({ action: "subscribe", contact: contactToUse, tier: "FAMILY_PRO" })
                    });
                  }
                  setShowUpgradeInterstitial(false);
                  if (showEditModal) {
                    setEditProfileTab("billing");
                  }
                }}
              >
                Upgrade to Family/Pro (₹349/mo) — Up to 5 Profiles
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "12px", borderRadius: "10px", border: "1px solid var(--border-glow)", background: "rgba(255,255,255,0.01)" }}
                onClick={() => {
                  setShowUpgradeInterstitial(false);
                }}
              >
                Continue with Basic scoring (Lacks detailed feedback)
              </button>
            </div>
            
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
              PracUp ensures we never block a child's practice. Basic scoring remains active.
            </p>
          </div>
        </div>
      )}
      {showChildLimitModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
          <div className="glass-card spotlight-card" style={{ padding: "40px 32px", width: "100%", maxWidth: "480px", margin: "20px", textAlign: "center", border: "1px solid rgba(124, 58, 237, 0.3)", boxShadow: "0 0 40px rgba(124, 58, 237, 0.25)" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🔒</div>
            <h3 className="gradient-text" style={{ fontSize: "1.6rem", margin: "0 0 12px 0", fontWeight: 800 }}>Profile Limit Reached</h3>
            <p style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 16px 0", lineHeight: "1.5" }}>
              {childLimitModalMsg || "You have reached the maximum number of child profiles allowed for your tier."}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0 0 24px 0", lineHeight: "1.5" }}>
              Upgrade to the Family/Pro plan to register and manage up to 5 child profiles simultaneously, with active performance mapping and dedicated dashboards.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "14px", fontWeight: 700, borderRadius: "10px", fontSize: "0.9rem", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))" }}
                onClick={async () => {
                  const contactToUse = regRecoveryContact.trim() || regUsername.trim() || "";
                  if (contactToUse) {
                    await fetch("/api/billing", {
                      method: "POST",
                      body: JSON.stringify({ action: "subscribe", contact: contactToUse, tier: "FAMILY_PRO" })
                    });
                  }
                  setShowChildLimitModal(false);
                  alert("Subscribed to Family/Pro! Try creating your profile again now.");
                }}
              >
                Upgrade to Family/Pro (₹349/mo) &rarr;
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "12px", borderRadius: "10px", border: "1px solid var(--border-glow)", background: "rgba(255,255,255,0.01)" }}
                onClick={() => {
                  setShowChildLimitModal(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {renderRecoveryModals()}
    </main>
  );
}
