const fs = require("fs");

// Load .env
const dotenvPath = "c:\\Users\\Ayush Karan\\OneDrive\\Desktop\\sheetmate_project\\.env";
const envContent = fs.readFileSync(dotenvPath, "utf8");
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const firstEq = trimmed.indexOf("=");
    if (firstEq !== -1) {
      const key = trimmed.slice(0, firstEq).trim();
      const val = trimmed.slice(firstEq + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  }
});

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free"
];

function cleanAndParseJSON(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*/, "");
    cleaned = cleaned.replace(/```$/, "");
    cleaned = cleaned.trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

async function queryOpenRouter(prompt, systemPrompt) {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      console.log(`[Groq] Querying primary pipeline...`);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      return cleanAndParseJSON(content);
    } catch (err) {
      console.warn("Groq failed, falling back to OpenRouter...", err);
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://sheetmate.in",
      "X-Title": "SheetMate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODELS[0],
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return cleanAndParseJSON(content);
}

const worksheetContent = {
  "title": "Acids, Bases and Salts Worksheet",
  "board": "CBSE",
  "grade": "Class 7",
  "subject": "SCIENCE",
  "sections": [
    {
      "name": "Section A: Multiple Choice Questions",
      "questions": [
        {
          "id": "q1",
          "text": "What is the common term for a substance that donates a proton or accepts an electron pair?",
          "type": "MCQ",
          "options": ["Base", "Acid", "Salt", "Alkali"],
          "answer": "Acid"
        },
        {
          "id": "q2",
          "text": "Which of the following is an example of a strong acid?",
          "type": "MCQ",
          "options": ["Citric acid", "Hydrochloric acid", "Sodium hydroxide", "Sodium carbonate"],
          "answer": "Hydrochloric acid"
        },
        {
          "id": "q3",
          "text": "What happens when a base reacts with an acid?",
          "type": "MCQ",
          "options": ["It forms a salt and water", "It forms an acid and a base", "It forms a gas and a liquid", "It forms a solid and a liquid"],
          "answer": "It forms a salt and water"
        },
        {
          "id": "q4",
          "text": "Which of the following salts is formed by the reaction between sodium hydroxide and hydrochloric acid?",
          "type": "MCQ",
          "options": ["Sodium chloride", "Sodium carbonate", "Potassium nitrate", "Calcium sulphate"],
          "answer": "Sodium chloride"
        },
        {
          "id": "q5",
          "text": "What is the pH of a neutral solution?",
          "type": "MCQ",
          "options": ["Less than 7", "Equal to 7", "More than 7", "Equal to 0"],
          "answer": "Equal to 7"
        }
      ]
    }
  ]
};

function getSystemPrompt(studentSubmissionSegment) {
  return `You are SheetMate AI, an expert school workbook reviewer.
Your job is to grade a student's worksheet submission against the original worksheet content and correct answer key.

Worksheet Subject: SCIENCE
Worksheet Topic: Acids, Bases and Salts
Grade Level: Class 7
Total Marks: 5

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
6. Calculate the total score out of the maximum marks (5) based on the proportion of correct answers.
7. Provide a short feedback/explanation for each question, including what the student wrote and why it was marked correct or incorrect.
8. Only trigger the "No readable answers found" rule if the parsed text is completely blank or unreadable. If there are any recognizable answers, you must grade them.
9. Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown or add extra text.

SCHEMA:
{
  "score": number,
  "feedback": [
    {
      "questionId": "string",
      "status": "CORRECT" | "INCORRECT",
      "studentAnswer": "what the student wrote, or 'Not found'",
      "feedback": "constructive short tip explaining correctness"
    }
  ]
}`;
}

const rawText = `OP
81)
a) Base
(2)
g) Hydrochloric acid
(3)
a) It forms salt and water
(4) a)
5) b)`;

// Simulation 1: Raw pre-aligned answers (without cleaning)
const submissionSegment1 = `STUDENT'S SUBMITTED ANSWERS (Pre-aligned from raw OCR lines):
---
- Question q1 ("What is the common term for a substance that donates a proton or accepts an electron pair?"): Student Answer is "a) Base"
- Question q2 ("Which of the following is an example of a strong acid?"): Student Answer is "g) Hydrochloric acid"
- Question q3 ("What happens when a base reacts with an acid?"): Student Answer is "a) It forms salt and water"
- Question q4 ("Which of the following salts is formed by the reaction between sodium hydroxide and hydrochloric acid?"): Student Answer is "(4) a)"
- Question q5 ("What is the pH of a neutral solution?"): Student Answer is "5) b)"
---

RAW OCR TEXT FROM SUBMISSION (Use this to cross-reference, verify, and correct any alignment errors):
---
${rawText}
---`;

// Simulation 2: Cleaned pre-aligned answers
const submissionSegment2 = `STUDENT'S SUBMITTED ANSWERS (Pre-aligned from raw OCR lines):
---
- Question q1 ("What is the common term for a substance that donates a proton or accepts an electron pair?"): Student Answer is "a) Base"
- Question q2 ("Which of the following is an example of a strong acid?"): Student Answer is "g) Hydrochloric acid"
- Question q3 ("What happens when a base reacts with an acid?"): Student Answer is "a) It forms salt and water"
- Question q4 ("Which of the following salts is formed by the reaction between sodium hydroxide and hydrochloric acid?"): Student Answer is "a)"
- Question q5 ("What is the pH of a neutral solution?"): Student Answer is "b)"
---

RAW OCR TEXT FROM SUBMISSION (Use this to cross-reference, verify, and correct any alignment errors):
---
${rawText}
---`;

async function runSimulations() {
  console.log("=== RUNNING SIMULATION 1: RAW PRE-ALIGNED ===");
  try {
    const res1 = await queryOpenRouter("Grade this student submission against the answer key. Provide feedback for every question.", getSystemPrompt(submissionSegment1));
    console.log(JSON.stringify(res1, null, 2));
  } catch (e) {
    console.error("Simulation 1 failed:", e);
  }

  console.log("\n=== RUNNING SIMULATION 2: CLEANED PRE-ALIGNED ===");
  try {
    const res2 = await queryOpenRouter("Grade this student submission against the answer key. Provide feedback for every question.", getSystemPrompt(submissionSegment2));
    console.log(JSON.stringify(res2, null, 2));
  } catch (e) {
    console.error("Simulation 2 failed:", e);
  }
}

runSimulations();
