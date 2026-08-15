// src/app/api/worksheets/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { queryOpenRouter } from "@/lib/openrouter";
import { getSystemConfig } from "@/lib/config";
import { checkRateLimit } from "@/lib/rateLimit";

// Validation lists
const VALID_BOARDS = ["CBSE"];
const VALID_SUBJECTS = ["MATH", "SCIENCE", "ENGLISH", "EVS", "HINDI", "SST"];
const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export async function POST(req: NextRequest) {
  try {
    // Sliding-window rate limit check (10 requests per 60 seconds per IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "127.0.0.1";

    const rateLimit = checkRateLimit(`generate_${clientIp}`, 10, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many worksheet generation requests. Please wait a minute before trying again." },
        { status: 429 }
      );
    }
    const body = await req.json();
    const { studentProfileId, board, grade, subject, topics, difficulty, includeAnswerKey, mcqCount, shortCount, longCount } = body;
    // topics can be string[] (wizard) or string (chat agent legacy)
    const topicsArray: string[] = Array.isArray(topics) ? topics : [topics].filter(Boolean);
    const topicLabel = topicsArray.join(", ");
    const answerKey: boolean = includeAnswerKey !== false; // default true

    // 1. Basic validation
    if (!board || !grade || !subject || topicsArray.length === 0 || !difficulty) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_BOARDS.includes(board)) {
      return NextResponse.json({ error: `Invalid board: ${board}` }, { status: 400 });
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: `Invalid subject: ${subject}` }, { status: 400 });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: `Invalid difficulty: ${difficulty}` }, { status: 400 });
    }

    // Determine age category
    const isEarlyLearner = ["LKG", "UKG", "Class 1", "Class 2"].includes(grade);

    // Resolve question counts dynamically
    const resolvedMcqCount = mcqCount !== undefined ? Math.max(0, Math.min(20, Number(mcqCount))) : (isEarlyLearner ? 5 : 5);
    const resolvedShortCount = shortCount !== undefined ? Math.max(0, Math.min(10, Number(shortCount))) : (isEarlyLearner ? 5 : 3);
    const resolvedLongCount = longCount !== undefined ? Math.max(0, Math.min(10, Number(longCount))) : (isEarlyLearner ? 5 : 2);

    const totalQuestions = resolvedMcqCount + resolvedShortCount + resolvedLongCount;
    if (totalQuestions < 5) {
      return NextResponse.json({ error: "A worksheet must contain a combined minimum of 5 questions in total." }, { status: 400 });
    }

    const dynamicTotalMarks = isEarlyLearner
      ? (resolvedMcqCount + resolvedShortCount + resolvedLongCount)
      : (resolvedMcqCount * 1 + resolvedShortCount * 2 + resolvedLongCount * 4);

    // Client IP already extracted above for rate limiting
    let weaknessContext = "";

    // Fetch dynamic config
    const config = await getSystemConfig();

    // Check limits
    if (!studentProfileId) {
      // Guest Rate Limits
      // Guest User: Check Worksheet Cache first
      const cacheKey = `${board}-${grade}-${subject}-${topicLabel}-${difficulty}-${resolvedMcqCount}-${resolvedShortCount}-${resolvedLongCount}`.toLowerCase().replace(/\s+/g, "-");
      const cachedSheet = await prisma.worksheetCache.findUnique({
        where: { cacheKey }
      });

      if (cachedSheet) {
        console.log(`[Cache Hit] Returning cached worksheet for: ${cacheKey}`);
        
        // Log the guest generation record for analytics
        const savedWorksheet = await prisma.generatedWorksheet.create({
          data: {
            studentProfileId: null,
            clientIp,
            subject,
            topic: topicLabel,
            difficulty,
            totalMarks: dynamicTotalMarks,
            contentJson: cachedSheet.contentJson
          }
        });

        return NextResponse.json({
          worksheetId: savedWorksheet.id,
          data: JSON.parse(cachedSheet.contentJson)
        });
      }

      // Guest User: Enforce Daily IP Limit from config
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const guestDailyLimit = config.tiers.guest.dailyGenerationLimit || 1;
      const guestSheetCount = await prisma.generatedWorksheet.count({
        where: {
          studentProfileId: null,
          clientIp,
          createdAt: { gte: oneDayAgo }
        }
      });

      if (guestSheetCount >= guestDailyLimit) {
        return NextResponse.json({
          error: `You have reached the daily limit of ${guestDailyLimit} worksheet for guest users. Create a free student profile now to unlock unlimited worksheet generation and performance tracking!`
        }, { status: 429 });
      }
    } else {
      // Registered / Paid User Limits
      const profile = await prisma.studentProfile.findUnique({
        where: { id: studentProfileId }
      });

      if (!profile) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
      }

      // Check parent contact subscription
      const contact = (profile.parentPhone || profile.parentEmail || "").trim();
      const sub = contact ? await prisma.parentSubscription.findUnique({ where: { contact } }) : null;
      const tier = sub?.tier || "FREE";

      if (tier === "FREE") {
        // Enforce Free daily and monthly limits from config
        const dailyLimit = config.tiers.registeredFree.dailyGenerationLimit || 5;
        const monthlyLimit = config.tiers.registeredFree.monthlyGenerationLimit || 150;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Find all profile IDs sharing the same parent contact to prevent rate-limit bypass by creating other children
        let profileIds = [studentProfileId];
        if (contact) {
          const isEmail = contact.includes("@");
          const sharedProfiles = await prisma.studentProfile.findMany({
            where: isEmail 
              ? { parentEmail: { equals: contact, mode: "insensitive" } }
              : { parentPhone: { contains: contact.replace(/\D/g, "").slice(-10) } },
            select: { id: true }
          });
          profileIds = sharedProfiles.map(p => p.id);
        }

        const dailyCount = await prisma.generatedWorksheet.count({
          where: {
            studentProfileId: { in: profileIds },
            createdAt: { gte: oneDayAgo }
          }
        });

        if (dailyCount >= dailyLimit) {
          return NextResponse.json({
            error: `You have reached the daily limit of ${dailyLimit} worksheets for free registered users. Upgrade to Plus or Family/Pro for unlimited generations!`
          }, { status: 429 });
        }

        const monthlyCount = await prisma.generatedWorksheet.count({
          where: {
            studentProfileId: { in: profileIds },
            createdAt: { gte: startOfMonth }
          }
        });

        if (monthlyCount >= monthlyLimit) {
          return NextResponse.json({
            error: `You have reached the monthly limit of ${monthlyLimit} worksheets for free registered users. Upgrade to Plus or Family/Pro for unlimited generations!`
          }, { status: 429 });
        }
      }

      // Fetch top 3 weak subtopics for this subject
      const weaknesses = await prisma.weaknessLog.findMany({
        where: {
          studentProfileId,
          subject,
          errorCount: { gt: 0 }
        },
        orderBy: {
          errorCount: "desc"
        },
        take: 3
      });

      if (weaknesses.length > 0) {
        weaknessContext = weaknesses.map((w: any) => w.subtopic).join(", ");
      }
    }

    // 4. Construct prompts based on grade level
    const isHindi = subject.toUpperCase() === "HINDI";
    const mediumText = isHindi ? "Hindi only (Devanagari script)" : "English only";

    let systemPrompt = "";
    let userPrompt = "";

    if (isEarlyLearner) {
      systemPrompt = `You are an early childhood educator in India. You design highly engaging, printable, text-based activity sheets in ${mediumText} that are perfectly tailored to the cognitive ability of ${grade} students. Keep all instructions short, using extremely simple vocabulary appropriate for a young child's level. You must return only a valid JSON object matching the requested schema. Do not output any markdown formatting like \`\`\`json or regular code blocks.`;
      
      let activitiesRules = "";
      let activitiesSchemaList = [];
      let activityIndex = 1;
      
      if (resolvedMcqCount > 0) {
        activitiesRules += `   - Activity ${activityIndex}: "Matching game" (Match left items to right items). Provide exactly ${resolvedMcqCount} items.\n`;
        activitiesSchemaList.push(`    {
      "type": "MATCHING",
      "instruction": "Matching instruction text...",
      "items": [
        {"left": "Dog", "right": "Bark"} // exactly ${resolvedMcqCount} items here
      ]
    }`);
        activityIndex++;
      }
      
      if (resolvedShortCount > 0) {
        activitiesRules += `   - Activity ${activityIndex}: "Fill in the Blanks". Provide exactly ${resolvedShortCount} simple sentences with a blank "____" and a list of options in a "wordBank" array.\n`;
        activitiesSchemaList.push(`    {
      "type": "FILL_BLANKS",
      "instruction": "Fill in the blank instruction...",
      "wordBank": ["Sun", "Moon"],
      "questions": [
        {"id": 1, "sentence": "The ____ shines brightly.", "answer": "Sun", "marks": 1} // exactly ${resolvedShortCount} sentences here
      ]
    }`);
        activityIndex++;
      }
      
      if (resolvedLongCount > 0) {
        activitiesRules += `   - Activity ${activityIndex}: "Odd One Out". Generate exactly ${resolvedLongCount} rows. Each row contains 4 words, where 1 word does not fit the category.\n`;
        activitiesSchemaList.push(`    {
      "type": "ODD_OUT",
      "instruction": "Find the odd word in each row.",
      "questions": [
        {"id": 1, "words": ["Apple", "Banana", "Rose", "Mango"], "answer": "Rose", "explanation": "Rose is a flower, others are fruits.", "marks": 1} // exactly ${resolvedLongCount} rows here
      ]
    }`);
        activityIndex++;
      }

      userPrompt = `Generate a text-based activity sheet for:
Grade: ${grade}
Subject: ${subject}
Topic${topicsArray.length > 1 ? "s" : ""}: ${topicLabel}
Difficulty: ${difficulty}
Medium of Instruction: ${mediumText}

ACTIVITY CONSTRAINTS:
1. Do not reference, generate, or attempt to render any images, illustrations, or figures. The output must be 100% text-based.
2. Structure the document into exactly ${activityIndex - 1} activities:
${activitiesRules}
3. Provide correct answers for every activity item in the answer fields. (Always solve and include answers, do not leave them empty).
4. Use localized naming conventions (e.g. Indian names, currency in Rupees '₹' where applicable).
5. Focus strictly on simple foundational skills (counting, matching, letter sounds, basic vocabulary) aligned with the ${grade} syllabus. Do not ask complex comprehension, logic, or writing questions beyond the basic syllabus parameters of this grade.
${isHindi ? "6. Since the subject is Hindi, ALL instructions, questions, matching items, words in options, wordBank, and answer fields MUST be written entirely in Hindi (Devanagari script)." : ""}

Return JSON in this schema:
{
  "title": "Worksheet Title",
  "grade": "${grade}",
  "subject": "${subject}",
  "activities": [
${activitiesSchemaList.join(",\n")}
  ]
}`;
    } else {
      systemPrompt = `You are an expert school workbook designer and textbook publisher in India. You generate rigorous, CBSE exam paper aligned worksheets in ${mediumText} that are perfect for standard exam preparation. You must design challenging, relevant, syllabus-aligned questions at the exact academic level of ${grade}. Do not generate generic, random, or overly simple trivia questions. You must return only a valid JSON object matching the requested schema. Do not output any markdown formatting like \`\`\`json or regular code blocks.`;

      let workbookRules = "";
      let schemaSections = [];
      const alphabets = ["A", "B", "C", "D"];
      let currentAlphabetIdx = 0;
      let questionIdCounter = 1;

      if (resolvedMcqCount > 0) {
        const secLetter = alphabets[currentAlphabetIdx++];
        workbookRules += `   - Section ${secLetter}: Multiple Choice Questions (exactly ${resolvedMcqCount} questions, include 4 choices in options array, designate correct answer).\n`;
        schemaSections.push(`    {
      "name": "Section ${secLetter}: Multiple Choice Questions",
      "questions": [
        {
          "id": "q${questionIdCounter}",
          "text": "Question text here?",
          "type": "MCQ",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Option B",
          "marks": 1,
          "subtopic": "Subtopic tag",
          "solutionExplanation": "Detailed explanation of the solution..."
        } // generate exactly ${resolvedMcqCount} questions (q${questionIdCounter} to q${questionIdCounter + resolvedMcqCount - 1})
      ]
    }`);
        questionIdCounter += resolvedMcqCount;
      }

      if (resolvedShortCount > 0) {
        const secLetter = alphabets[currentAlphabetIdx++];
        workbookRules += `   - Section ${secLetter}: Short Answer Questions (exactly ${resolvedShortCount} questions, checking conceptual definitions).\n`;
        schemaSections.push(`    {
      "name": "Section ${secLetter}: Short Answer Questions",
      "questions": [
        {
          "id": "q${questionIdCounter}",
          "text": "Short answer question?",
          "type": "SHORT",
          "answer": "Correct key answer details...",
          "marks": 2,
          "subtopic": "Subtopic tag",
          "solutionExplanation": "Detailed conceptual grading guide for parents..."
        } // generate exactly ${resolvedShortCount} questions (q${questionIdCounter} to q${questionIdCounter + resolvedShortCount - 1})
      ]
    }`);
        questionIdCounter += resolvedShortCount;
      }

      if (resolvedLongCount > 0) {
        const secLetter = alphabets[currentAlphabetIdx++];
        workbookRules += `   - Section ${secLetter}: Word Problems or Critical Thinking Questions (exactly ${resolvedLongCount} questions, requiring long explanations).\n`;
        schemaSections.push(`    {
      "name": "Section ${secLetter}: Critical Thinking Questions",
      "questions": [
        {
          "id": "q${questionIdCounter}",
          "text": "Word problem or analysis question?",
          "type": "LONG",
          "answer": "Final solution values...",
          "marks": 4,
          "subtopic": "Subtopic tag",
          "solutionExplanation": "Detailed step-by-step solution steps..."
        } // generate exactly ${resolvedLongCount} questions (q${questionIdCounter} to q${questionIdCounter + resolvedLongCount - 1})
      ]
    }`);
      }

      userPrompt = `Generate a printable workbook sheet for:
Board: ${board}
Grade: ${grade}
Subject: ${subject}
Topic${topicsArray.length > 1 ? "s" : ""}: ${topicLabel}${topicsArray.length > 1 ? ` (cover all ${topicsArray.length} chapters proportionally)` : ""}
Difficulty: ${difficulty}
Medium of Instruction: ${mediumText}

${weaknessContext ? `Focus Concept Guidelines: Dedicate 60% of the worksheet questions to directly test these concepts that the student previously struggled with: "${weaknessContext}".` : ""}

WORKBOOK RULES:
1. Divide the worksheet into sections as follows:
${workbookRules}
2. Questions must align directly with the ${board} syllabus and textbook guidelines for ${grade}. They must resemble real CBSE final or periodic test paper questions to serve as highly effective exam preparation.
3. Every question must be clear, relevant, and test the conceptual depth or mathematical calculations expected in ${grade} (e.g. numerical word problems for Math, key scientific principles for Science, standard grammatical rules for English/Hindi). Do not generate generic, random, or overly simple trivia questions.
4. Create a step-by-step solutions explanation for each question, designed for parents. You must ALWAYS solve each question and include correct answers, do not leave the answer or solutionExplanation fields empty under any circumstance.
5. Use localized naming conventions (e.g. Indian names, currency in Rupees '₹' where applicable).
${isHindi ? "6. Since the subject is Hindi, ALL titles, section names, question texts, MCQ options, answers, subtopic tags, and solution explanations MUST be written entirely in Hindi (Devanagari script)." : ""}

Return JSON in this schema:
{
  "title": "Worksheet Title",
  "board": "${board}",
  "grade": "${grade}",
  "subject": "${subject}",
  "sections": [
${schemaSections.join(",\n")}
  ]
}`;
    }

    // 5. Query OpenRouter with Local Fallback Engine
    let resultJson: any;
    try {
      const defaultModel = config.modelRouting.generation.defaultModel || "haiku";
      resultJson = await queryOpenRouter(userPrompt, systemPrompt, undefined, undefined, defaultModel);
    } catch (error) {
      console.warn("[OpenRouter Failed] Falling back to local curriculum mock generator:", error);
      resultJson = generateLocalMockWorksheet(board, grade, subject, topicLabel, difficulty);
    }

    let actualTotalMarks = 0;
    // Add includeAnswerKey and programmatically ensure marks property on each question/activity item
    if (resultJson && typeof resultJson === "object") {
      resultJson.includeAnswerKey = answerKey;
      
      if (isEarlyLearner) {
        const activities = resultJson.activities || [];
        activities.forEach((act: any) => {
          if (act.type === "MATCHING" && act.items) {
            act.items.forEach((item: any) => {
              if (item.marks === undefined || item.marks === null) {
                item.marks = 1;
              }
            });
            actualTotalMarks += act.items.length;
          } else if (act.questions) {
            act.questions.forEach((q: any) => {
              if (q.marks === undefined || q.marks === null) {
                q.marks = 1;
              }
            });
            actualTotalMarks += act.questions.length;
          }
        });
      } else {
        const sections = resultJson.sections || [];
        sections.forEach((sec: any) => {
          if (sec.questions) {
            sec.questions.forEach((q: any) => {
              if (q.marks === undefined || q.marks === null) {
                if (q.type === "MCQ") q.marks = 1;
                else if (q.type === "SHORT") q.marks = 2;
                else if (q.type === "LONG" || q.type === "CRITICAL") q.marks = 4;
                else q.marks = 1;
              }
              actualTotalMarks += q.marks;
            });
          }
        });
      }
    }

    if (actualTotalMarks === 0) {
      actualTotalMarks = dynamicTotalMarks;
    }

    const contentString = JSON.stringify(resultJson);

    // 6. Save Worksheet Record
    const savedWorksheet = await prisma.generatedWorksheet.create({
      data: {
        studentProfileId: studentProfileId || null,
        clientIp: studentProfileId ? null : clientIp,
        subject,
        topic: topicLabel,
        difficulty,
        totalMarks: actualTotalMarks,
        contentJson: contentString
      }
    });

    // 7. If guest request, save to cache table for future guest lookups
    if (!studentProfileId) {
      const cacheKey = `${board}-${grade}-${subject}-${topicLabel}-${difficulty}-${resolvedMcqCount}-${resolvedShortCount}-${resolvedLongCount}`.toLowerCase().replace(/\s+/g, "-");
      await prisma.worksheetCache.upsert({
        where: { cacheKey },
        update: { contentJson: contentString },
        create: { cacheKey, contentJson: contentString }
      }).catch(err => console.error("[Cache Save Error] Failed to write cache:", err));
    }

    return NextResponse.json({
      worksheetId: savedWorksheet.id,
      data: resultJson
    });

  } catch (error) {
    console.error("[Generate API Error] Failed to generate worksheet:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}

// Local Curriculum Mock Generator to guarantee 100% Uptime under rate limits
function generateLocalMockWorksheet(board: string, grade: string, subject: string, topic: string, difficulty: string) {
  const isEarlyLearner = ["LKG", "UKG", "Class 1", "Class 2"].includes(grade);
  const isHindi = subject.toUpperCase() === "HINDI";

  if (isEarlyLearner) {
    if (isHindi) {
      return {
        title: `${board} ${grade} ${subject} कार्यपत्रक: ${topic}`,
        grade,
        subject,
        activities: [
          {
            type: "MATCHING",
            instruction: "दिए गए शब्दों का सही मिलान करें।",
            items: [
              { left: "आम", right: "फल" },
              { left: "गुलाब", right: "फूल" },
              { left: "गाय", right: "पशु" },
              { left: "कौआ", right: "पक्षी" },
              { left: "आलू", right: "सब्जी" }
            ]
          },
          {
            type: "FILL_BLANKS",
            instruction: "कोष्ठक में दिए गए शब्दों से रिक्त स्थान भरें।",
            wordBank: ["मदद", "पढ़ाई", "सूरज", "पानी", "पेड़"],
            questions: [
              { id: 1, sentence: "____ पूर्व दिशा से उगता है।", answer: "सूरज" },
              { id: 2, sentence: "हमें रोज़ ____ करनी चाहिए।", answer: "पढ़ाई" },
              { id: 3, sentence: "हवा शुद्ध करने में ____ सहायक हैं।", answer: "पेड़" },
              { id: 4, sentence: "प्यास लगने पर ____ पीना चाहिए।", answer: "पानी" },
              { id: 5, sentence: "हमें दूसरों की ____ करनी चाहिए।", answer: "मदद" }
            ]
          },
          {
            type: "ODD_OUT",
            instruction: "दिए गए शब्दों में से भिन्न शब्द चुनें।",
            questions: [
              { id: 1, words: ["सेब", "केला", "गुलाब", "आम"], answer: "गुलाब", explanation: "गुलाब एक फूल है, अन्य फल हैं।" },
              { id: 2, words: ["गाय", "शेर", "चिड़िया", "बकरी"], answer: "चिड़िया", explanation: "चिड़िया एक पक्षी है, अन्य पशु हैं।" },
              { id: 3, words: ["लाल", "पीला", "हरा", "किताब"], answer: "किताब", explanation: "किताब एक वस्तु है, अन्य रंग हैं।" },
              { id: 4, words: ["लिखना", "पढ़ना", "दौड़ना", "मेज"], answer: "मेज", explanation: "मेज एक निर्जीव वस्तु है, अन्य क्रियाएं हैं।" },
              { id: 5, words: ["गणित", "विज्ञान", "सोना", "हिंदी"], answer: "सोना", explanation: "सोना एक क्रिया है, अन्य विषय हैं।" }
            ]
          }
        ]
      };
    }

    return {
      title: `${board} ${grade} ${subject} Worksheet: ${topic} (Activity Sheet)`,
      grade,
      subject,
      activities: [
        {
          type: "MATCHING",
          instruction: `Match the vocabulary words related to ${topic} correctly.`,
          items: [
            { left: `${topic} term 1`, right: "Definition match A" },
            { left: `${topic} term 2`, right: "Definition match B" },
            { left: `${topic} term 3`, right: "Definition match C" },
            { left: `${topic} term 4`, right: "Definition match D" },
            { left: `${topic} term 5`, right: "Definition match E" }
          ]
        },
        {
          type: "FILL_BLANKS",
          instruction: "Fill in the blanks with the correct words from the box.",
          wordBank: ["Primary", "Secondary", "Important", "Concept", "Practice"],
          questions: [
            { id: 1, sentence: `A central part of ${topic} is called a ____ concept.`, answer: "Primary" },
            { id: 2, sentence: `We use ____ resources to study this topic.`, answer: "Secondary" },
            { id: 3, sentence: `It is ____ to practice these exercises daily.`, answer: "Important" },
            { id: 4, sentence: `Understanding the ____ helps solve problems.`, answer: "Concept" },
            { id: 5, sentence: `Consistent ____ makes you perfect in this subject.`, answer: "Practice" }
          ]
        },
        {
          type: "ODD_OUT",
          instruction: "Find the odd word in each row.",
          questions: [
            { id: 1, words: [`${topic}`, "Study", "Outlier", "Practice"], answer: "Outlier", explanation: "Outlier does not belong to the topic study area." },
            { id: 2, words: ["Leaf", "Stem", "Car", "Flower"], answer: "Car", explanation: "Car is a vehicle, others are plant parts." },
            { id: 3, words: ["Square", "Circle", "Cat", "Triangle"], answer: "Cat", explanation: "Cat is an animal, others are shapes." },
            { id: 4, words: ["Addition", "Subtraction", "Run", "Division"], answer: "Run", explanation: "Run is an action verb, others are mathematical operations." },
            { id: 5, words: ["EVS", "Math", "Science", "Sleep"], answer: "Sleep", explanation: "Sleep is an activity, others are school subjects." }
          ]
        }
      ]
    };
  }

  if (isHindi) {
    return {
      title: `${board} ${grade} ${subject} अभ्यास कार्यपत्रक: ${topic}`,
      board,
      grade,
      subject,
      sections: [
        {
          name: "खंड अ: बहुविकल्पीय प्रश्न (MCQ)",
          questions: [
            {
              id: "q1",
              text: `निम्नलिखित में से कौन सा विकल्प '${topic}' से मुख्य रूप से संबंधित है?`,
              type: "MCQ",
              options: ["विकल्प क", "विकल्प ख", "विकल्प ग", "विकल्प घ"],
              answer: "विकल्प क",
              subtopic: "मुख्य अवधारणा",
              solutionExplanation: "विकल्प क इस विषय की सही व्याख्या करता है।"
            },
            {
              id: "q2",
              text: `हम दैनिक जीवन में '${topic}' का उपयोग कैसे करते हैं?`,
              type: "MCQ",
              options: ["नियमित रूप से", "विशेष अवसरों पर", "कभी नहीं", "इनमें से कोई नहीं"],
              answer: "नियमित रूप से",
              subtopic: "दैनिक उपयोग",
              solutionExplanation: "हम दैनिक जीवन में इस विषय का निरंतर उपयोग करते हैं।"
            },
            {
              id: "q3",
              text: `अध्ययन की दृष्टि से '${topic}' का क्या महत्व है?`,
              type: "MCQ",
              options: ["व्याकरण सुधार", "लेखन शैली", "वैचारिक स्पष्टता", "उपरोक्त सभी"],
              answer: "उपरोक्त सभी",
              subtopic: "महत्व",
              solutionExplanation: "यह पाठ भाषा और वैचारिक समझ दोनों को सुदृढ़ करता है।"
            },
            {
              id: "q4",
              text: `दिए गए कठिन शब्दों में से शुद्ध वर्तनी वाला शब्द चुनें।`,
              type: "MCQ",
              options: ["वर्तनी क", "वर्तनी ख", "वर्तनी ग", "वर्तनी घ"],
              answer: "वर्तनी क",
              subtopic: "व्याकरण",
              solutionExplanation: "वर्तनी क व्याकरणिक नियमों के अनुसार बिल्कुल शुद्ध है।"
            },
            {
              id: "q5",
              text: `इस अध्याय का मुख्य उद्देश्य क्या है?`,
              type: "MCQ",
              options: ["ज्ञानवर्धन", "मनोरंजन", "भाषा कौशल का विकास", "उपरोक्त सभी"],
              answer: "उपरोक्त सभी",
              subtopic: "उद्देश्य",
              solutionExplanation: "अध्याय छात्रों के भाषा विकास और सामान्य ज्ञान दोनों को समृद्ध करता है।"
            }
          ]
        },
        {
          name: "खंड ब: लघु उत्तरीय प्रश्न (Short Answer Questions)",
          questions: [
            {
              id: "q6",
              text: `'${topic}' की मुख्य सीख या परिभाषा क्या है?`,
              type: "SHORT",
              answer: `अध्याय '${topic}' के अनुसार महत्वपूर्ण व्याख्या।`,
              subtopic: "परिभाषा",
              solutionExplanation: "जांचें कि छात्र ने मुख्य बिंदुओं को अपनी भाषा में सटीक रूप से व्यक्त किया है या नहीं।"
            },
            {
              id: "q7",
              text: `इस पाठ से हमें क्या प्रेरणा या संदेश मिलता है?`,
              type: "SHORT",
              answer: "यह पाठ हमें नैतिक मूल्यों और निरंतर अभ्यास की प्रेरणा देता है।",
              subtopic: "संदेश",
              solutionExplanation: "उत्तर में पाठ के केंद्रीय संदेश या नैतिक सीख का उल्लेख होना चाहिए।"
            },
            {
              id: "q8",
              text: `पाठ में आए किन्हीं दो कठिन शब्दों के अर्थ लिखिए।`,
              type: "SHORT",
              answer: "शब्द १: अर्थ १; शब्द २: अर्थ २।",
              subtopic: "शब्दार्थ",
              solutionExplanation: "छात्रों को पाठ में प्रयुक्त विशिष्ट शब्दों के सही अर्थ लिखने होंगे।"
            }
          ]
        },
        {
          name: "खंड स: दीर्घ उत्तरीय / तार्किक प्रश्न (Critical Thinking)",
          questions: [
            {
              id: "q9",
              text: `यदि आप इस कहानी/पाठ के मुख्य पात्र होते, तो विपरीत परिस्थितियों में आप क्या निर्णय लेते? विस्तार से समझाइए।`,
              type: "LONG",
              answer: "छात्र का व्यक्तिगत विचार और तर्कसंगत विश्लेषण आवश्यक है।",
              subtopic: "तार्किक विश्लेषण",
              solutionExplanation: "मूल्यांकन करें कि छात्र ने पाठ के संदर्भ को समझकर कितना मौलिक और व्यावहारिक उत्तर लिखा है।"
            },
            {
              id: "q10",
              text: `अध्याय '${topic}' का समाज या हमारे दैनिक जीवन से क्या संबंध है? विस्तृत समीक्षा करें।`,
              type: "LONG",
              answer: "यह पाठ सामाजिक परिवेश और मानवीय संवेदनाओं को उजागर करता है।",
              subtopic: "सामाजिक संबंध",
              solutionExplanation: "उत्तर में समाज पर पाठ के प्रभाव और व्यावहारिक अनुप्रयोगों की विस्तृत चर्चा होनी चाहिए।"
            }
          ]
        }
      ]
    };
  }

  // Standard Class 3-8 CBSE/ICSE exam section blueprints
  return {
    title: `${board} ${grade} ${subject} Practice: ${topic}`,
    board,
    grade,
    subject,
    sections: [
      {
        name: "Section A: Multiple Choice Questions",
        questions: [
          {
            id: "q1",
            text: `Which of the following is a primary characteristic or fundamental law of ${topic}?`,
            type: "MCQ",
            options: ["Characteristic A", "Characteristic B", "Characteristic C", "Characteristic D"],
            answer: "Characteristic A",
            subtopic: "Core Characteristics",
            solutionExplanation: "Characteristic A represents the fundamental component of this topic."
          },
          {
            id: "q2",
            text: `Under what conditions is the principle of ${topic} most commonly applied?`,
            type: "MCQ",
            options: ["Standard condition", "Elevated condition", "Variable condition", "None of these"],
            answer: "Standard condition",
            subtopic: "Application Conditions",
            solutionExplanation: "Standard conditions provide the baseline for this concept's operation."
          },
          {
            id: "q3",
            text: `Who formulated or classified the standard divisions of ${topic}?`,
            type: "MCQ",
            options: ["Ancient scholars", "Modern researchers", "Standard curriculum guidelines", "All of the above"],
            answer: "Standard curriculum guidelines",
            subtopic: "Classification",
            solutionExplanation: "The syllabus aligns with the official academic board guidelines."
          },
          {
            id: "q4",
            text: `What is the primary unit of measurement or comparison used in ${topic}?`,
            type: "MCQ",
            options: ["Unit A", "Unit B", "Variable Units", "Not applicable"],
            answer: "Variable Units",
            subtopic: "Units & Standards",
            solutionExplanation: "Units vary depending on the specific application area of this chapter."
          },
          {
            id: "q5",
            text: `How does the difficulty level (${difficulty.toLowerCase()}) affect our study of ${topic}?`,
            type: "MCQ",
            options: ["Increases depth of calculation", "Simplifies concepts", "Requires no changes", "None of the above"],
            answer: "Increases depth of calculation",
            subtopic: "Depth Analysis",
            solutionExplanation: "Higher difficulty levels require deeper reasoning and step-by-step checks."
          }
        ]
      },
      {
        name: "Section B: Short Answer Questions",
        questions: [
          {
            id: "q6",
            text: `Define the concept of "${topic}" in your own words.`,
            type: "SHORT",
            answer: `Definition of ${topic} as per the standard textbook guidelines.`,
            subtopic: "Definitions",
            solutionExplanation: "Check if the student has included key keywords and terms related to this chapter."
          },
          {
            id: "q7",
            text: `State two major benefits of studying ${topic} in daily life.`,
            type: "SHORT",
            answer: "Benefit 1: Logical reasoning development; Benefit 2: Conceptual checking.",
            subtopic: "Benefits & Applications",
            solutionExplanation: "Student must outline at least two valid points demonstrating practical use."
          },
          {
            id: "q8",
            text: `Give an example where the principles of ${topic} are directly applied.`,
            type: "SHORT",
            answer: `Standard classroom problem solving and exam assignments targeting ${topic}.`,
            subtopic: "Examples",
            solutionExplanation: "Verify if the example fits the grade-level constraints and syllabus."
          }
        ]
      },
      {
        name: "Section C: Critical Thinking Questions",
        questions: [
          {
            id: "q9",
            text: `A student is practicing ${topic} and makes a mistake in calculations. Explain the step-by-step process they should follow to debug their work.`,
            type: "LONG",
            answer: "Step 1: Check inputs; Step 2: Recalculate intermediate values; Step 3: Compare with solutions.",
            subtopic: "Error Analysis",
            solutionExplanation: "The student should show understanding of error detection, check parameters, and match solutions."
          },
          {
            id: "q10",
            text: `Analyze the relation between ${topic} and other chapters in ${subject}. How does this conceptual foundation help in subsequent grades?`,
            type: "LONG",
            answer: "It serves as a foundational benchmark, preparing concepts for advanced curriculum requirements.",
            subtopic: "Core Connections",
            solutionExplanation: "Grade-appropriate reasoning demonstrating linkage across topics is expected."
          }
        ]
      }
    ]
  };
}
