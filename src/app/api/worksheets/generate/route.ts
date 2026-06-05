// src/app/api/worksheets/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { queryOpenRouter } from "@/lib/openrouter";

// Validation lists
const VALID_BOARDS = ["CBSE"];
const VALID_SUBJECTS = ["MATH", "SCIENCE", "ENGLISH", "EVS", "HINDI", "SST"];
const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentProfileId, board, grade, subject, topics, difficulty, includeAnswerKey } = body;
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

    // Get client IP for guest rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "127.0.0.1";

    let weaknessContext = "";

    // 2. If authenticated user, fetch student profile and weakness context
    if (studentProfileId) {
      const profile = await prisma.studentProfile.findUnique({
        where: { id: studentProfileId }
      });

      if (!profile) {
        return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
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
    } else {
      // 3. Guest User: Check Worksheet Cache first
      const cacheKey = `${board}-${grade}-${subject}-${topicLabel}-${difficulty}`.toLowerCase().replace(/\s+/g, "-");
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
            totalMarks: isEarlyLearner ? 15 : 20,
            contentJson: cachedSheet.contentJson
          }
        });

        return NextResponse.json({
          worksheetId: savedWorksheet.id,
          data: JSON.parse(cachedSheet.contentJson)
        });
      }

      // Guest User: Enforce Daily IP Limit (Max 4 per 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const guestSheetCount = await prisma.generatedWorksheet.count({
        where: {
          studentProfileId: null,
          clientIp,
          createdAt: { gte: oneDayAgo }
        }
      });

      if (guestSheetCount >= 4) {
        return NextResponse.json({
          error: "You have reached the daily limit of 4 worksheets for guest users. Create a free student profile now to unlock unlimited worksheet generation and performance tracking!"
        }, { status: 429 });
      }
    }

    // 4. Construct prompts based on grade level
    const isHindi = subject.toUpperCase() === "HINDI";
    const mediumText = isHindi ? "Hindi only (Devanagari script)" : "English only";

    let systemPrompt = "";
    let userPrompt = "";

    if (isEarlyLearner) {
      systemPrompt = `You are an early childhood educator in India. You design highly engaging, printable, text-based activity sheets in ${mediumText}. You must return only a valid JSON object matching the requested schema. Do not output any markdown formatting like \`\`\`json or regular code blocks.`;
      
      userPrompt = `Generate a text-based activity sheet for:
Grade: ${grade}
Subject: ${subject}
Topic${topicsArray.length > 1 ? "s" : ""}: ${topicLabel}
Difficulty: ${difficulty}
Medium of Instruction: ${mediumText}

ACTIVITY CONSTRAINTS:
1. Do not reference, generate, or attempt to render any images, illustrations, or figures. The output must be 100% text-based.
2. Structure the document into exactly 3 activities:
   - Activity 1: "Matching game" (Match left items to right items). Provide exactly 5 items.
   - Activity 2: "Fill in the Blanks". Provide exactly 5 simple sentences with a blank "____" and a list of options in a "wordBank" array.
   - Activity 3: "Odd One Out". Generate exactly 5 rows. Each row contains 4 words, where 1 word does not fit the category.
3. ${answerKey ? "Provide correct answers for every activity item in the answer fields." : "Set all answer fields to empty string \"\" — do NOT include any answers."}
${isHindi ? "4. Since the subject is Hindi, ALL instructions, questions, matching items, words in options, wordBank, and answer fields MUST be written entirely in Hindi (Devanagari script)." : ""}

Return JSON in this schema:
{
  "title": "Worksheet Title",
  "grade": "${grade}",
  "subject": "${subject}",
  "activities": [
    {
      "type": "MATCHING",
      "instruction": "Matching instruction text...",
      "items": [
        {"left": "Dog", "right": "Bark"},
        {"left": "Cat", "right": "Meow"},
        {"left": "Cow", "right": "Moo"},
        {"left": "Sheep", "right": "Baa"},
        {"left": "Lion", "right": "Roar"}
      ]
    },
    {
      "type": "FILL_BLANKS",
      "instruction": "Fill in the blank instruction...",
      "wordBank": ["Sun", "Moon", "Star", "Cloud", "Sky"],
      "questions": [
        {"id": 1, "sentence": "The ____ shines brightly in the day.", "answer": "Sun"},
        {"id": 2, "sentence": "We see the ____ at night.", "answer": "Moon"},
        {"id": 3, "sentence": "A twinkle ____ is far away.", "answer": "Star"},
        {"id": 4, "sentence": "A white ____ brings rain.", "answer": "Cloud"},
        {"id": 5, "sentence": "The birds fly in the blue ____.", "answer": "Sky"}
      ]
    },
    {
      "type": "ODD_OUT",
      "instruction": "Find the odd word in each row.",
      "questions": [
        {"id": 1, "words": ["Apple", "Banana", "Rose", "Mango"], "answer": "Rose", "explanation": "Rose is a flower, others are fruits."}
      ]
    }
  ]
}`;
    } else {
      systemPrompt = `You are an expert school workbook designer and textbook publisher in India. You generate CBSE/ICSE exam paper aligned worksheets in ${mediumText}. You must return only a valid JSON object matching the requested schema. Do not output any markdown formatting like \`\`\`json or regular code blocks.`;

      userPrompt = `Generate a printable workbook sheet for:
Board: ${board}
Grade: ${grade}
Subject: ${subject}
Topic${topicsArray.length > 1 ? "s" : ""}: ${topicLabel}${topicsArray.length > 1 ? ` (cover all ${topicsArray.length} chapters proportionally)` : ""}
Difficulty: ${difficulty}
Medium of Instruction: ${mediumText}

${weaknessContext ? `Focus Concept Guidelines: Dedicate 60% of the worksheet questions to directly test these concepts that the student previously struggled with: "${weaknessContext}".` : ""}

WORKBOOK RULES:
1. Divide the worksheet into three sections:
   - Section A: Multiple Choice Questions (5 questions, include 4 choices in options array, designate correct answer).
   - Section B: Short Answer Questions (3 questions, checking conceptual definitions).
   - Section C: Word Problems or Critical Thinking Questions (2 questions, requiring long explanations).
2. Questions must align directly with the ${board} syllabus for ${grade}.
3. ${answerKey ? "Create a step-by-step solutions explanation for each question, designed for parents." : "Set all answer and solutionExplanation fields to empty string \"\" — do NOT include any answers."}
4. Use localized naming conventions (e.g. Indian names, currency in Rupees '₹' where applicable).
${isHindi ? "5. Since the subject is Hindi, ALL titles, section names, question texts, MCQ options, answers, subtopic tags, and solution explanations MUST be written entirely in Hindi (Devanagari script)." : ""}

Return JSON in this schema:
{
  "title": "Worksheet Title",
  "board": "${board}",
  "grade": "${grade}",
  "subject": "${subject}",
  "sections": [
    {
      "name": "Section A: Multiple Choice Questions",
      "questions": [
        {
          "id": "q1",
          "text": "Question text here?",
          "type": "MCQ",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Option B",
          "subtopic": "Subtopic tag",
          "solutionExplanation": "Detailed explanation of the solution..."
        }
      ]
    },
    {
      "name": "Section B: Short Answer Questions",
      "questions": [
        {
          "id": "q6",
          "text": "Short answer question?",
          "type": "SHORT",
          "answer": "Correct key answer details...",
          "subtopic": "Subtopic tag",
          "solutionExplanation": "Detailed conceptual grading guide for parents..."
        }
      ]
    },
    {
      "name": "Section C: Critical Thinking Questions",
      "questions": [
        {
          "id": "q9",
          "text": "Word problem or analysis question?",
          "type": "LONG",
          "answer": "Final solution values...",
          "subtopic": "Subtopic tag",
          "solutionExplanation": "Detailed step-by-step solution steps..."
        }
      ]
    }
  ]
}`;
    }

    // 5. Query OpenRouter with Local Fallback Engine
    let resultJson;
    try {
      resultJson = await queryOpenRouter(userPrompt, systemPrompt);
    } catch (error) {
      console.warn("[OpenRouter Failed] Falling back to local curriculum mock generator:", error);
      resultJson = generateLocalMockWorksheet(board, grade, subject, topicLabel, difficulty);
    }

    // Add includeAnswerKey to result JSON so it is saved in the DB
    if (resultJson && typeof resultJson === "object") {
      (resultJson as any).includeAnswerKey = answerKey;
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
        totalMarks: isEarlyLearner ? 15 : 20,
        contentJson: contentString
      }
    });

    // 7. If guest request, save to cache table for future guest lookups
    if (!studentProfileId) {
      const cacheKey = `${board}-${grade}-${subject}-${topicLabel}-${difficulty}`.toLowerCase().replace(/\s+/g, "-");
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
