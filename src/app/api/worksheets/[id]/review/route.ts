// src/app/api/worksheets/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { queryOpenRouter } from "@/lib/openrouter";
import { getSystemConfig } from "@/lib/config";
import fs from "fs";

function logDebugInfo(info: string) {
  try {
    const logPath = "C:\\Users\\Ayush Karan\\.gemini\\antigravity-ide\\brain\\5d94aa4a-c5bf-4a1a-9318-9fb945963eb3\\scratch\\grading_debug.log";
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${info}\n`);
  } catch (err) {
    console.error("Failed to write to debug log:", err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    logDebugInfo(`[POST Review] Starting request for worksheet ID: ${id}`);

    // 1. Fetch worksheet details
    const worksheet = await prisma.generatedWorksheet.findUnique({
      where: { id }
    });

    if (!worksheet) {
      logDebugInfo(`[POST Review] Error: Worksheet not found: ${id}`);
      return NextResponse.json({ error: "Worksheet not found" }, { status: 404 });
    }

    logDebugInfo(`[POST Review] Fetched worksheet. Subject: ${worksheet.subject}, Topic: ${worksheet.topic}, hasstudentProfile: ${!!worksheet.studentProfileId}`);

    const config = await getSystemConfig();
    let contact = "";
    let tier = "FREE";
    let profile = null;

    if (worksheet.studentProfileId) {
      profile = await prisma.studentProfile.findUnique({
        where: { id: worksheet.studentProfileId }
      });
      if (profile) {
        contact = (profile.parentPhone || profile.parentEmail || "").trim();
        if (contact) {
          const sub = await prisma.parentSubscription.findUnique({
            where: { contact }
          });
          tier = sub?.tier || "FREE";
        }
      }
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      logDebugInfo(`[POST Review] Error: No file uploaded in form data`);
      return NextResponse.json({ error: "No file uploaded in form data" }, { status: 400 });
    }

    const fileType = file.type || "";
    const fileName = file.name || "";
    const buffer = Buffer.from(await file.arrayBuffer());

    logDebugInfo(`[POST Review] Received file: name="${fileName}", type="${fileType}", size=${buffer.length} bytes.`);

    // 3. Contact Python FastAPI OCR Microservice
    const ocrServiceUrl = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000';
    logDebugInfo(`[POST Review] Contacting OCR service at ${ocrServiceUrl}/grade-document`);

    let ocrResult: {
      answers: Record<string, any>;
      confidence: Record<string, number>;
    };

    try {
      const ocrFormData = new FormData();
      const fileBlob = new Blob([buffer], { type: fileType || "application/pdf" });
      ocrFormData.append("file", fileBlob, fileName || "document.pdf");
      ocrFormData.append("worksheetId", id);

      const ocrHeaders: Record<string, string> = {};
      if (tier === "FAMILY_PRO") {
        ocrHeaders["X-Priority"] = "High";
      }

      const ocrResponse = await fetch(`${ocrServiceUrl}/grade-document`, {
        method: "POST",
        body: ocrFormData,
        headers: ocrHeaders
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        logDebugInfo(`[POST Review] OCR Service Error: ${ocrResponse.status} - ${errorText}`);
        throw new Error(`OCR service failed: ${errorText || ocrResponse.statusText}`);
      }

      ocrResult = await ocrResponse.json();
      logDebugInfo(`[POST Review] OCR Service response received successfully. Detected keys: ${Object.keys(ocrResult.answers || {}).join(", ")}`);
    } catch (ocrErr: any) {
      logDebugInfo(`[POST Review] OCR Service request failed: ${ocrErr.message}`);
      console.error("[OCR Service Connection Error]:", ocrErr);
      return NextResponse.json({ error: "Failed to connect to local OCR microservice. Ensure the Python FastAPI service is running." }, { status: 502 });
    }

    // 4. Load Worksheet structure
    let worksheetContent = JSON.parse(worksheet.contentJson);
    const gradeLevel = worksheetContent.grade || "Class 6";
    const isEarly = ["LKG", "UKG", "Class 1", "Class 2"].includes(gradeLevel);

    // Self-healing solver: if answers are missing, generate them on-the-fly and update the DB
    const needsSolving = hasEmptyAnswers(worksheetContent, isEarly);
    logDebugInfo(`[POST Review] Self-healing solver check: needsSolving = ${needsSolving}`);

    if (needsSolving) {
      logDebugInfo(`[POST Review] Worksheet is missing answers. Generating solved content via LLM...`);
      const solveSystemPrompt = `You are PracUp AI, an expert school textbook editor.
Your task is to take a school worksheet that is missing its answer key and solution explanations, solve all the questions, and return the complete worksheet JSON containing the correct answers and detailed explanations.

ORIGINAL WORKSHEET (MISSING ANSWERS):
${JSON.stringify(worksheetContent, null, 2)}

INSTRUCTIONS:
1. Solve every question in the worksheet with 100% academic accuracy.
2. For MCQs, the "answer" field MUST be the exact correct option text (e.g. "Acid" or "Hydrochloric acid") or the option letter + text (e.g. "b) Hydrochloric acid" or "a) Base").
3. For Short/Long questions, the "answer" field MUST contain the correct answer/solution key details, and "solutionExplanation" MUST contain a detailed step-by-step solution or grading criteria for parents.
4. For Early Learner Activities:
   - For MATCHING: fill in the correct matching pairs.
   - For FILL_BLANKS: fill in the correct word from the wordBank in the "answer" field.
   - For ODD_OUT: designate the correct odd word in the "answer" field and provide an "explanation".
5. Return ONLY a valid JSON object matching the exact structure of the input worksheet but with all "answer", "solutionExplanation", and other answer-related fields fully populated. Do not change any question text, options, ids, or titles. Do not wrap in markdown or add extra text.`;

      const solvePrompt = `Solve this worksheet and return the complete JSON with all answers populated.`;
      
      try {
        const solvedJson = await queryOpenRouter(solvePrompt, solveSystemPrompt);
        if (solvedJson && typeof solvedJson === "object") {
          solvedJson.includeAnswerKey = worksheetContent.includeAnswerKey;
          worksheetContent = solvedJson;
          
          await prisma.generatedWorksheet.update({
            where: { id },
            data: {
              contentJson: JSON.stringify(solvedJson)
            }
          });
          logDebugInfo(`[POST Review] Automatically updated worksheet in the DB with solved answers.`);
        }
      } catch (solveErr: any) {
        logDebugInfo(`[POST Review] Solver error: ${solveErr.message}`);
        console.error(`[Self-Healing Solver Error] Failed to solve worksheet ${id}:`, solveErr);
      }
    }

    // 5. Gather worksheet questions sequentially
    const allQuestions: any[] = [];
    if (isEarly) {
      const activities = worksheetContent.activities || [];
      for (let actIdx = 0; actIdx < activities.length; actIdx++) {
        const act = activities[actIdx];
        if (act.type === "MATCHING") {
          const items = act.items || [];
          for (let i = 0; i < items.length; i++) {
            allQuestions.push({
              id: `act_${actIdx}_q_${i}`,
              type: "MATCHING",
              text: `Match: ${items[i].left || ""}`,
              original: items[i]
            });
          }
        } else {
          const questions = act.questions || [];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            allQuestions.push({
              id: `act_${actIdx}_q_${i}`,
              type: act.type,
              text: q.sentence || q.words?.join(", ") || "Early learner question",
              original: q
            });
          }
        }
      }
    } else {
      const sections = worksheetContent.sections || [];
      for (const sec of sections) {
        const questions = sec.questions || [];
        for (const q of questions) {
          allQuestions.push(q);
        }
      }
    }

    // 6. Handle Fallback vs Box-Preprocessed modes
    let isFallback = false;
    const answerKeys = Object.keys(ocrResult.answers || {});
    if (answerKeys.length === 1 && answerKeys[0] === "q1") {
      isFallback = true;
    }

    let alignedAnswers: { [key: string]: string } | null = null;
    let studentSubmissionSegment = "";

    if (isFallback) {
      // Whole page crop fallback (like for raw notebook uploads or failed box detection)
      let rawText = "";
      const ansVal = ocrResult.answers.q1;
      if (typeof ansVal === "object" && ansVal !== null) {
        rawText = ansVal.text || "";
      } else {
        rawText = String(ansVal || "");
      }

      logDebugInfo(`[POST Review] OCR fell back to whole-page text. Raw text length: ${rawText.length}`);

      const lines = rawText
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (allQuestions.every(q => q.type === "MCQ") && allQuestions.length > 0) {
        // Pure MCQ page: Use sequential pre-alignment matching
        alignedAnswers = alignMCQQuestions(allQuestions, lines);
        studentSubmissionSegment = `STUDENT'S SUBMITTED ANSWERS (Pre-aligned from raw OCR lines):
---
${allQuestions.map(q => {
  const rawStudentAnswer = alignedAnswers ? alignedAnswers[q.id] : "(No answer found)";
  const studentAnswer = cleanStudentAnswer(rawStudentAnswer);
  return `- Question ${q.id} ("${q.text}"): Student Answer is "${studentAnswer}"`;
}).join("\n")}
---

RAW OCR TEXT FROM SUBMISSION (Use this to cross-reference, verify, and correct any alignment errors):
---
${rawText || "[NO READABLE TEXT DETECTED]"}
---`;
      } else {
        // Mixed/short worksheets: let OpenRouter map the full raw page text
        studentSubmissionSegment = `STUDENT'S SUBMITTED TEXT (Extracted raw page text):
---
${rawText || "[NO READABLE TEXT DETECTED]"}
---`;
      }
    } else {
      // Box contour detection succeeded. Match boxes sequentially
      alignedAnswers = {};
      allQuestions.forEach((q, idx) => {
        const qKey = `q${idx + 1}`;
        const answerObj = ocrResult.answers[qKey];
        let studentAns = "Not found";
        if (answerObj !== undefined && answerObj !== null) {
          if (typeof answerObj === "object") {
            studentAns = answerObj.text || "";
          } else {
            studentAns = String(answerObj);
          }
        }
        if (alignedAnswers) {
          alignedAnswers[q.id] = studentAns;
        }
      });

      studentSubmissionSegment = `STUDENT'S SUBMITTED ANSWERS (Extracted per question from Answer Response Sheet):
---
${allQuestions.map((q, idx) => {
  const qKey = `q${idx + 1}`;
  const answerObj = ocrResult.answers[qKey];
  let studentAns = "Not found";
  if (answerObj !== undefined && answerObj !== null) {
    if (typeof answerObj === "object") {
      studentAns = answerObj.text || "";
    } else {
      studentAns = String(answerObj);
    }
  }
  const cleanAns = cleanStudentAnswer(studentAns);
  return `- Question ${q.id} ("${q.text}"): Student Answer is "${cleanAns}"`;
}).join("\n")}
---`;
    }

    // Check if we can perform deterministic grading bypass (to avoid LLM costs/latency)
    let deterministicFeedback: any[] | null = null;
    if (alignedAnswers && allQuestions.every(q => q.type === "MCQ") && allQuestions.length > 0) {
      deterministicFeedback = tryDeterministicGrading(allQuestions, alignedAnswers);
    }

    let finalFeedback: any[] = [];
    let detailedAllowed = true;
    let quotaExceeded = false;
    let deductedCredit = false;

    if (deterministicFeedback) {
      logDebugInfo(`[POST Review] Deterministic grading bypass succeeded! Skipping LLM call.`);
      finalFeedback = deterministicFeedback.map((item: any) => {
        const idx = allQuestions.findIndex(q => q.id === item.questionId);
        let lowConfidence = false;
        if (isFallback) {
          const q1Conf = ocrResult.confidence.q1 || 0.0;
          if (q1Conf < 0.6) {
            lowConfidence = true;
          }
        } else {
          if (idx !== -1) {
            const qKey = `q${idx + 1}`;
            const answerObj = ocrResult.answers[qKey];
            if (answerObj !== undefined && answerObj !== null && typeof answerObj === "object") {
              lowConfidence = !!answerObj.lowConfidence;
            }
          }
        }

        let expectedAnswer = "";
        if (idx !== -1) {
          const q = allQuestions[idx];
          if (q.type === "MATCHING" && q.original) {
            expectedAnswer = q.original.right || "";
          } else if (q.original) {
            expectedAnswer = q.original.answer || "";
          } else {
            expectedAnswer = q.answer || "";
          }
        }

        return {
          questionId: item.questionId,
          status: item.status,
          studentAnswer: item.studentAnswer,
          feedback: item.feedback,
          expectedAnswer,
          lowConfidence
        };
      });
    } else {
      // LLM grading pathway
      const systemPrompt = `You are PracUp AI, an expert school workbook reviewer.
Your job is to grade a student's worksheet submission against the original worksheet content and correct answer key.

Worksheet Subject: ${worksheet.subject}
Worksheet Topic: ${worksheet.topic}
Grade Level: ${gradeLevel}
Total Marks: ${worksheet.totalMarks}

ORIGINAL WORKSHEET DETAILS:
${JSON.stringify(worksheetContent, null, 2)}

${studentSubmissionSegment}

INSTRUCTIONS:
1. Carefully compare the student's submission to the correct answers of each question in the original worksheet details.
2. The student's answer for each question is provided in the STUDENT'S SUBMITTED ANSWERS section mapped by the question's unique ID.
3. MCQ GRADING & ALIGNMENT RULES:
   - Identify the correct option for each question based on the "answer" field in the worksheet details.
   - Map options to letters: 1st option in the list is "A", 2nd is "B", 3rd is "C", 4th is "D".
   - ALIGNMENT CORRECTION: The pre-aligned student answers may contain alignment errors or be marked as "No answer found" because the raw OCR text contains handwritten cursive spelling/character errors (e.g., "To fonew fcoterties of malerials" instead of "To know the properties of materials", "Togs & clothes" instead of "Toys and clothes", "Polrter" instead of "Polyester") or misread prefixes (e.g., "85)" instead of "Q5)").
   - You MUST cross-reference the pre-aligned answers with the RAW OCR TEXT. If you find a line in the RAW OCR TEXT that corresponds to a question (e.g. by matching the question prefix or option context), but was misaligned or missed (marked as "(No answer found)"), you MUST correct the alignment and grade the correct answer for that question.
   - IMPORTANT: The pre-aligned mapping is highly accurate. Do NOT systematically shift the answers (e.g., mapping line 1 to Q1, line 2 to Q2, etc.) if that changes the correct mapping of other questions. Extra noise lines at the top or bottom of the RAW OCR TEXT (such as "Eote", "Q1", or "S") are OCR artifacts and must be ignored. You should ONLY override a pre-aligned answer if the raw text clearly shows the student answered a different option for that specific question.
   - The student's answer is CORRECT if it matches (either in the pre-aligned answer or after you correct it from the RAW OCR TEXT):
     - The correct option letter/indicator (case-insensitive: e.g. "a", "b", "c", "d", "a)", "b)", "Option A", "Option B"). Note that the student may write ONLY the letter/indicator, which is a valid answer and must be marked as CORRECT if that option is correct.
     - The correct option text (case-insensitive: e.g. "Acid", "acid").
     - The correct option letter and text combined (e.g. "b) Hydrochloric acid").
   - OCR ARTIFACT HANDLING: Treat visually similar OCR errors as the intended letter/word (e.g. "$g)" or "G)" -> likely "b)"; "0)" -> likely "a)" or "c)"; "S)" -> likely "b)"). Focus on the semantic intent and visually similar option mappings to resolve handwritten/OCR variations.
   - The student's answer is INCORRECT if:
     - It matches an incorrect option letter (e.g. writing "a" or "a)" when correct is "b").
     - It matches an incorrect option text (e.g. writing "Base" when correct is "Acid").
     - It is completely unrelated or wrong.
4. SHORT/LONG ANSWER GRADING RULES:
   - Grade based on semantic correctness, conceptual understanding, and key terms.
   - Do NOT require exact word-for-word matching. Accept appropriate synonyms, simple phrasing, minor spelling mistakes (e.g., "ard" instead of "and"), or minimal answers that demonstrate correct understanding.
5. Early Learner Activities: Be highly lenient with formatting, symbols, and matching associations.
6. Calculate the total score out of the maximum marks (${worksheet.totalMarks}) based on the proportion of correct answers.
7. Provide a short feedback/explanation for each question, including what the student wrote and why it was marked correct or incorrect.
8. Only trigger the "No readable answers found" rule if the parsed text is completely blank or unreadable. If there are any recognizable answers, you must grade them.
9. Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown or add extra text.

SCHEMA:
{
  "score": number, // calculated score out of ${worksheet.totalMarks}
  "feedback": [
    {
      "questionId": "string", // The exact ID of the question (e.g. "q1", "q2", or for early learners "act_0_q_0", "act_0_q_1", etc.)
      "status": "CORRECT" | "INCORRECT",
      "studentAnswer": "what the student wrote, or 'Not found'",
      "feedback": "constructive short tip explaining correctness"
    }
  ]
}`;

      const prompt = `Grade this student submission against the answer key. Provide feedback for every question.`;
      logDebugInfo(`[POST Review] Prompt prepared. Sending request to OpenRouter...`);
      let gradingResult;

      // Determine if detailed feedback is allowed and deduct credits if needed
      detailedAllowed = true;
      quotaExceeded = false;
      deductedCredit = false;

      if (!worksheet.studentProfileId) {
        detailedAllowed = false;
      } else if (tier === "FREE") {
        const limit = config.tiers.registeredFree.monthlyDetailedFeedbackQuota || 18;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const detailedCount = await prisma.evaluationLog.count({
          where: {
            parentContact: contact,
            type: "DETAILED",
            createdAt: { gte: startOfMonth }
          }
        });

        if (detailedCount >= limit) {
          const now = new Date();
          const activeCredits = await prisma.creditPurchase.findMany({
            where: {
              parentContact: contact,
              creditsRemaining: { gt: 0 },
              expiresAt: { gte: now }
            },
            orderBy: { expiresAt: "asc" }
          });

          if (activeCredits.length > 0) {
            const oldestPack = activeCredits[0];
            await prisma.creditPurchase.update({
              where: { id: oldestPack.id },
              data: { creditsRemaining: oldestPack.creditsRemaining - 1 }
            });
            deductedCredit = true;
            detailedAllowed = true;
            logDebugInfo(`[POST Review] Quota exhausted but credit pack found. Deducted 1 credit.`);
          } else {
            detailedAllowed = false;
            quotaExceeded = true;
            logDebugInfo(`[POST Review] Quota exhausted and no credits found. Basic scoring mode.`);
          }
        }
      }

      // Check model routing and escalations
      let hasLowOcrConfidence = false;
      if (ocrResult && ocrResult.confidence) {
        const confidences = Object.values(ocrResult.confidence);
        if (confidences.length > 0) {
          const avgConf = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
          if (avgConf < (config.modelRouting.evaluation.ocrConfidenceEscalationThreshold || 0.65)) {
            hasLowOcrConfidence = true;
          }
        }
      }

      const hasMultiStepProblems = allQuestions.some(q => q.type === "LONG" || q.type === "SHORT");
      let evaluationModel = config.modelRouting.evaluation.defaultModel || "haiku";

      if (
        (hasLowOcrConfidence && config.modelRouting.evaluation.escalateToSonnetOnLowOcrConfidence) ||
        (hasMultiStepProblems && config.modelRouting.evaluation.escalateOnMultiStepProblem)
      ) {
        evaluationModel = "sonnet";
        logDebugInfo(`[POST Review] Escalating to Sonnet. Low confidence: ${hasLowOcrConfidence}, Multi-step: ${hasMultiStepProblems}`);
      }

      try {
        gradingResult = await queryOpenRouter(prompt, systemPrompt, undefined, undefined, evaluationModel);
      } catch (aiErr: any) {
        logDebugInfo(`[POST Review] OpenRouter request failed: ${aiErr.message}`);
        console.error("[AI Review Error] OpenRouter request failed:", aiErr);
        return NextResponse.json({ error: "AI grading service is temporarily unavailable. Please try manual grading." }, { status: 502 });
      }

      logDebugInfo(`[POST Review] OpenRouter response received.`);
      const { feedback } = gradingResult;

      // Attach low confidence scores from OCR metadata and format final feedback
      finalFeedback = (feedback || []).map((item: any) => {
        const idx = allQuestions.findIndex(q => q.id === item.questionId);
        let lowConfidence = false;
        if (isFallback) {
          const q1Conf = ocrResult.confidence.q1 || 0.0;
          if (q1Conf < 0.6) {
            lowConfidence = true;
          }
        } else {
          if (idx !== -1) {
            const qKey = `q${idx + 1}`;
            const answerObj = ocrResult.answers[qKey];
            if (answerObj !== undefined && answerObj !== null && typeof answerObj === "object") {
              lowConfidence = !!answerObj.lowConfidence;
            }
          }
        }

        let expectedAnswer = "";
        if (idx !== -1) {
          const q = allQuestions[idx];
          if (q.type === "MATCHING" && q.original) {
            expectedAnswer = q.original.right || "";
          } else if (q.original) {
            expectedAnswer = q.original.answer || "";
          } else {
            expectedAnswer = q.answer || "";
          }
        }

        return {
          questionId: item.questionId,
          status: item.status,
          studentAnswer: item.studentAnswer,
          feedback: item.feedback,
          expectedAnswer,
          lowConfidence
        };
      });
    }

    // Calculate score programmatically based on question-wise marks
    let computedScore = 0;
    if (finalFeedback && Array.isArray(finalFeedback)) {
      for (const item of finalFeedback) {
        if (item.status === "CORRECT") {
          let questionMarks = 1;
          if (isEarly) {
            // Find activity item to lookup marks if specified
            const parts = item.questionId.split("_");
            const actIdx = parseInt(parts[1], 10);
            const act = worksheetContent.activities?.[actIdx];
            if (act) {
              if (act.type === "MATCHING" && act.items) {
                const itemIdx = parseInt(parts[3], 10);
                const matchingItem = act.items[itemIdx];
                if (matchingItem && matchingItem.marks !== undefined && matchingItem.marks !== null) {
                  questionMarks = Number(matchingItem.marks);
                }
              } else if (act.questions) {
                const qIdx = parseInt(parts[3], 10);
                const questionObj = act.questions[qIdx];
                if (questionObj && questionObj.marks !== undefined && questionObj.marks !== null) {
                  questionMarks = Number(questionObj.marks);
                }
              }
            }
          } else {
            const sections = worksheetContent.sections || [];
            let qFound = false;
            for (const sec of sections) {
              const q = sec.questions?.find((quest: any) => quest.id === item.questionId);
              if (q) {
                qFound = true;
                if (q.marks !== undefined && q.marks !== null) {
                  questionMarks = Number(q.marks);
                } else {
                  // Fallback to defaults
                  if (q.type === "MCQ") questionMarks = 1;
                  else if (q.type === "SHORT") questionMarks = 2;
                  else if (q.type === "LONG" || q.type === "CRITICAL") questionMarks = 4;
                  else questionMarks = 1;
                }
                break;
              }
            }
          }
          computedScore += questionMarks;
        }
      }
    }
    computedScore = Math.max(0, Math.min(worksheet.totalMarks, computedScore));

    logDebugInfo(`[POST Review] Calculated score: ${computedScore} out of ${worksheet.totalMarks}`);

    // Parse Attempts and Update attempts history
    let attempts = [];
    if (worksheet.attemptsJson) {
      try {
        attempts = JSON.parse(worksheet.attemptsJson);
      } catch (e) {
        console.error("Failed to parse attempts history:", e);
      }
    }
    attempts.push({
      score: computedScore,
      date: new Date()
    });

    await prisma.generatedWorksheet.update({
      where: { id },
      data: {
        score: computedScore,
        attemptsJson: JSON.stringify(attempts)
      }
    });

    // Log Concept Performance (if student is registered)
    if (worksheet.studentProfileId && finalFeedback && Array.isArray(finalFeedback)) {
      const studentProfileId = worksheet.studentProfileId;
      const subject = worksheet.subject;
      const topic = worksheet.topic;

      for (const item of finalFeedback) {
        const subtopicName = getQuestionSubtopic(item.questionId, worksheetContent, topic, isEarly);
        if (item.status === "INCORRECT") {
          await prisma.weaknessLog.upsert({
            where: {
              id: await findWeaknessLogId(studentProfileId, subject, topic, subtopicName) || "non-existent-uuid"
            },
            update: {
              errorCount: { increment: 1 },
              lastTestedAt: new Date()
            },
            create: {
              studentProfileId,
              subject,
              topic,
              subtopic: subtopicName,
              errorCount: 1,
              successCount: 0,
              lastTestedAt: new Date()
            }
          });
        } else {
          await prisma.weaknessLog.upsert({
            where: {
              id: await findWeaknessLogId(studentProfileId, subject, topic, subtopicName) || "non-existent-uuid"
            },
            update: {
              successCount: { increment: 1 },
              lastTestedAt: new Date()
            },
            create: {
              studentProfileId,
              subject,
              topic,
              subtopic: subtopicName,
              errorCount: 0,
              successCount: 1,
              lastTestedAt: new Date()
            }
          });
        }
      }
    }

    logDebugInfo(`[POST Review] Review request successfully completed. Score: ${computedScore}`);

    // Log detailed vs basic evaluation
    if (contact) {
      await prisma.evaluationLog.create({
        data: {
          worksheetId: id,
          parentContact: contact,
          type: detailedAllowed ? "DETAILED" : "BASIC"
        }
      });
    }

    // Check consecutive months quota exhaustion for FREE tier users to show upgrade dialog
    let escalateMessaging = false;
    if (tier === "FREE" && contact) {
      const startOfCurrentMonth = new Date();
      startOfCurrentMonth.setDate(1);
      startOfCurrentMonth.setHours(0, 0, 0, 0);

      const startOfPrevMonth = new Date();
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
      startOfPrevMonth.setDate(1);
      startOfPrevMonth.setHours(0, 0, 0, 0);

      const currentMonthCount = await prisma.evaluationLog.count({
        where: {
          parentContact: contact,
          type: "DETAILED",
          createdAt: { gte: startOfCurrentMonth }
        }
      });

      const prevMonthCount = await prisma.evaluationLog.count({
        where: {
          parentContact: contact,
          type: "DETAILED",
          createdAt: {
            gte: startOfPrevMonth,
            lt: startOfCurrentMonth
          }
        }
      });

      const limit = config.tiers.registeredFree.monthlyDetailedFeedbackQuota || 18;
      if (currentMonthCount >= limit && prevMonthCount >= limit) {
        escalateMessaging = true;
      }
    }

    logDebugInfo(`[POST Review] Review request successfully completed. Score: ${computedScore}, escalateMessaging: ${escalateMessaging}`);

    // If it's a guest or if detailedAllowed is false, strip detailed question feedback
    let sanitizedFeedback = finalFeedback;
    if (finalFeedback && (!worksheet.studentProfileId || !detailedAllowed)) {
      sanitizedFeedback = finalFeedback.map((item: any) => ({
        ...item,
        feedback: "Detailed feedback locked. Register for free or upgrade to unlock."
      }));
    }

    return NextResponse.json({
      status: "success",
      score: computedScore,
      feedback: sanitizedFeedback,
      escalateMessaging,
      detailedAllowed,
      quotaExceeded
    });

  } catch (error: any) {
    logDebugInfo(`[POST Review] CRITICAL ERROR: ${error.stack}`);
    console.error("[Review API Error] Failed to grade PDF:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

// Helper to determine question subtopic
function getQuestionSubtopic(questionId: string, worksheetContent: any, worksheetTopic: string, isEarly: boolean): string {
  if (isEarly) {
    const parts = questionId.split("_");
    const actIdx = parseInt(parts[1], 10);
    const act = worksheetContent.activities?.[actIdx];
    if (act) {
      const actTypeLabel = act.type === "MATCHING" ? "Matching" : act.type === "FILL_BLANKS" ? "Fill Blanks" : "Odd Out";
      return `${worksheetTopic} (${actTypeLabel})`;
    }
    return worksheetTopic;
  } else {
    const sections = worksheetContent.sections || [];
    for (const sec of sections) {
      const q = sec.questions?.find((quest: any) => quest.id === questionId);
      if (q) {
        return q.subtopic || worksheetTopic;
      }
    }
    return worksheetTopic;
  }
}

// Helper to lookup weakness record
async function findWeaknessLogId(
  studentProfileId: string,
  subject: string,
  topic: string,
  subtopic: string
): Promise<string | null> {
  const log = await prisma.weaknessLog.findFirst({
    where: {
      studentProfileId,
      subject,
      topic,
      subtopic
    },
    select: { id: true }
  });
  return log ? log.id : null;
}

// Helper to determine if worksheet JSON has any empty answer fields
function hasEmptyAnswers(content: any, isEarly: boolean): boolean {
  if (isEarly) {
    const activities = content.activities || [];
    if (activities.length === 0) return true;
    for (const act of activities) {
      if (act.type === "FILL_BLANKS" || act.type === "ODD_OUT") {
        const questions = act.questions || [];
        if (questions.length === 0) return true;
        for (const q of questions) {
          if (!q.answer) return true;
        }
      } else if (act.type === "MATCHING") {
        const items = act.items || [];
        if (items.length === 0) return true;
        for (const item of items) {
          if (!item.right) return true;
        }
      }
    }
  } else {
    const sections = content.sections || [];
    if (sections.length === 0) return true;
    for (const sec of sections) {
      const questions = sec.questions || [];
      if (questions.length === 0) return true;
      for (const q of questions) {
        if (!q.answer) return true;
      }
    }
  }
  return false;
}

function isWordSimilar(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (Math.abs(w1.length - w2.length) > 3) return false;
  
  const track = Array(w2.length + 1).fill(null).map(() => Array(w1.length + 1).fill(null));
  for (let i = 0; i <= w1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= w2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= w2.length; j += 1) {
    for (let i = 1; i <= w1.length; i += 1) {
      const indicator = w1[i - 1] === w2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = track[w2.length][w1.length];
  const maxLength = Math.max(w1.length, w2.length);
  const similarity = 1 - (distance / maxLength);
  return similarity >= 0.6; // 60% similarity threshold
}

function matchesOptionText(line: string, option: string): boolean {
  const lineLower = line.toLowerCase();
  const optLower = option.toLowerCase();
  
  // Clean line and option by stripping prefixes
  let cleanedLine = lineLower.trim();
  cleanedLine = cleanedLine.replace(/^[a-z0-9$gG09S]\s*[\).\-:]\s*/i, "");
  cleanedLine = cleanedLine.replace(/^[^a-z0-9]+/i, "");

  const cleanedOpt = optLower.trim();

  if (cleanedLine === cleanedOpt) return true;

  const stopWords = new Set(["it", "a", "and", "an", "the", "of", "in", "on", "to", "is", "are", "was", "were", "form", "for"]);
  
  const getSignificantWords = (text: string) => {
    return text
      .split(/[^a-z0-9]/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !stopWords.has(w));
  };

  const optWords = getSignificantWords(cleanedOpt);
  const lineWords = getSignificantWords(cleanedLine);

  if (optWords.length === 0 || lineWords.length === 0) return false;

  let matchCount = 0;
  for (const optWord of optWords) {
    let wordMatched = false;
    for (const lineWord of lineWords) {
      if (isWordSimilar(optWord, lineWord)) {
        wordMatched = true;
        break;
      }
    }
    if (wordMatched) {
      matchCount++;
    }
  }

  // Use the max length of significant words to prevent partial matching of different options
  const maxWords = Math.max(optWords.length, lineWords.length);
  const matchRatio = matchCount / maxWords;
  if (matchRatio >= 0.5) return true; // 50% match ratio for spelling-tolerant options matching

  return false;
}

function alignMCQQuestions(allQuestions: any[], lines: string[]): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};
  const questionMatchLineIdx = new Array(allQuestions.length).fill(-1);
  const matchedLineIndices = new Set<number>();

  const optionIndicatorRegex = /^([$]?\(?[a-dA-D1-4$gG09S]\)?[)\uFF09]?\s*[\).\-:\uFF09]?|\boption\s+[a-d1-4])(\s|$)/i;

  // Pass 1: Match lines containing explicit option texts
  for (let qIdx = 0; qIdx < allQuestions.length; qIdx++) {
    const q = allQuestions[qIdx];
    if (!q.options || q.options.length === 0) continue;

    let bestLineIdx = -1;
    let bestMatchScore = 0;

    for (let i = 0; i < lines.length; i++) {
      if (matchedLineIndices.has(i)) continue;
      const line = lines[i];

      for (const opt of q.options) {
        if (opt.length < 3) continue;

        if (matchesOptionText(line, opt)) {
          if (opt.length > bestMatchScore) {
            bestMatchScore = opt.length;
            bestLineIdx = i;
          }
        }
      }
    }

    if (bestLineIdx !== -1) {
      mapping[q.id] = lines[bestLineIdx];
      questionMatchLineIdx[qIdx] = bestLineIdx;
      matchedLineIndices.add(bestLineIdx);
    }
  }

  // Pass 2: Align remaining unmatched questions to remaining candidate lines (enforcing order-preservation)
  for (let qIdx = 0; qIdx < allQuestions.length; qIdx++) {
    const q = allQuestions[qIdx];
    if (mapping[q.id]) continue; // Already matched in Pass 1

    let minLineIdx = -1;
    for (let prevIdx = qIdx - 1; prevIdx >= 0; prevIdx--) {
      if (questionMatchLineIdx[prevIdx] !== -1) {
        minLineIdx = questionMatchLineIdx[prevIdx];
        break;
      }
    }

    let maxLineIdx = lines.length;
    for (let nextIdx = qIdx + 1; nextIdx < allQuestions.length; nextIdx++) {
      if (questionMatchLineIdx[nextIdx] !== -1) {
        maxLineIdx = questionMatchLineIdx[nextIdx];
        break;
      }
    }

    const candidates = [];
    for (let i = minLineIdx + 1; i < maxLineIdx; i++) {
      if (matchedLineIndices.has(i)) continue;
      const line = lines[i];

      const cleanLine = line.replace(/^(q(uestion)?\.?\s*\d+|\(?\d+\)?)\s*[\).\-:]?\s*/i, "").trim();
      let isCandidate = optionIndicatorRegex.test(cleanLine);
      if (!isCandidate) {
        for (const targetQ of allQuestions) {
          if (!targetQ.options) continue;
          for (const opt of targetQ.options) {
            if (opt.length >= 3 && matchesOptionText(line, opt)) {
              isCandidate = true;
              break;
            }
          }
          if (isCandidate) break;
        }
      }

      if (isCandidate) {
        candidates.push({ text: line, index: i });
      }
    }

    if (candidates.length > 0) {
      const bestCandidate = candidates[0];
      mapping[q.id] = bestCandidate.text;
      questionMatchLineIdx[qIdx] = bestCandidate.index;
      matchedLineIndices.add(bestCandidate.index);
    } else {
      mapping[q.id] = "(No answer found)";
    }
  }

  return mapping;
}

function cleanStudentAnswer(answer: string): string {
  if (!answer || answer === "(No answer found)") return answer;
  let cleaned = answer.trim();
  // Strip question indicator prefix (e.g. Q1, Question 2, (3), 4., etc. at the start of the line)
  cleaned = cleaned.replace(/^(q(uestion)?\.?\s*\d+|\(?\d+\)?)\s*[\).\-:]?\s*/i, "").trim();
  return cleaned;
}

interface DeterministicFeedbackItem {
  questionId: string;
  status: "CORRECT" | "INCORRECT";
  studentAnswer: string;
  feedback: string;
}

function tryDeterministicGrading(
  allQuestions: any[],
  alignedAnswers: { [key: string]: string }
): DeterministicFeedbackItem[] | null {
  const feedbackList: DeterministicFeedbackItem[] = [];

  for (const q of allQuestions) {
    if (q.type !== "MCQ" || !q.options || q.options.length === 0) {
      return null; // Can't grade short/long answers deterministically
    }

    const rawAns = alignedAnswers[q.id];
    if (!rawAns || rawAns === "(No answer found)") {
      feedbackList.push({
        questionId: q.id,
        status: "INCORRECT",
        studentAnswer: "Not found",
        feedback: "No readable answer was found for this question."
      });
      continue;
    }

    const studentAns = cleanStudentAnswer(rawAns);
    const correctText = (q.original?.answer || q.answer || "").trim().toLowerCase();
    const correctIdx = q.options.findIndex((opt: string) => opt.trim().toLowerCase() === correctText);

    if (correctIdx === -1) {
      return null; // Expected answer not in options list
    }

    const correctLetter = String.fromCharCode(65 + correctIdx); // 'A', 'B', etc.
    const normAns = studentAns.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const normCorrectText = correctText.replace(/[^a-z0-9]/g, "");

    // Check match
    const optionLetters = q.options.map((_: any, i: number) => String.fromCharCode(65 + i)); // ['A', 'B', ...]
    
    let isCorrect = false;
    let graded = false;

    // Case 1: Exact match with correct text
    if (normAns === normCorrectText || studentAns.toLowerCase() === correctText) {
      isCorrect = true;
      graded = true;
    } else {
      // Check if it matches any other option text exactly
      let matchedOtherText = false;
      for (let i = 0; i < q.options.length; i++) {
        if (i === correctIdx) continue;
        const optText = q.options[i].trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normAns === optText || studentAns.toLowerCase() === q.options[i].trim().toLowerCase()) {
          matchedOtherText = true;
          break;
        }
      }
      if (matchedOtherText) {
        isCorrect = false;
        graded = true;
      }
    }

    // Case 2: Match with option letter (e.g. "a", "b", "a)", "b)", "Option A")
    if (!graded) {
      const matchLetter = studentAns.replace(/[^a-zA-Z]/g, "").toUpperCase();
      if (matchLetter === correctLetter && studentAns.length <= 10) {
        isCorrect = true;
        graded = true;
      } else {
        // Check if matches incorrect letter
        for (const letChar of optionLetters) {
          if (letChar === correctLetter) continue;
          if (matchLetter === letChar && studentAns.length <= 10) {
            isCorrect = false;
            graded = true;
            break;
          }
        }
      }
    }

    if (!graded) {
      return null; // Handwriting spelling variation, let LLM handle it safely
    }

    feedbackList.push({
      questionId: q.id,
      status: isCorrect ? "CORRECT" : "INCORRECT",
      studentAnswer: studentAns,
      feedback: isCorrect
        ? `The correct answer is '${q.options[correctIdx]}'. Good job!`
        : `The correct answer is '${q.options[correctIdx]}'. The student's answer does not match the correct option.`
    });
  }

  return feedbackList;
}
