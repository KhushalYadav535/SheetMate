// src/app/api/chat/extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queryOpenRouter } from "@/lib/openrouter";
import prisma from "@/lib/db";
import { CURRICULUM_DATA, Subject } from "@/lib/curriculumData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, profile } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing or invalid messages history" }, { status: 400 });
    }

    let profileContext = "";
    let limitContext = "";

    if (profile && profile.name) {
      profileContext = `\nACTIVE STUDENT PROFILE CONTEXT:\n- Student Name: ${profile.name}\n- Grade: ${profile.grade}\n- School Board: ${profile.board.replace("_", " ")}\nUse these as defaults when resolving the worksheet details if the user does not specify otherwise. If the user explicitly asks for a different grade, subject, or board, respect their explicit text.`;
      
      limitContext = `\nACTIVE USER STATUS:\n- Login Status: Registered User\n- Worksheet Limit: Unlimited (No limits apply to registered student/parent profiles). If the user asks how many worksheets they can generate, inform them they have unlimited worksheets.`;
    } else {
      // Guest User: Check daily IP limit
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                       req.headers.get("x-real-ip") || 
                       "127.0.0.1";

      const guestSheetCount = await prisma.generatedWorksheet.count({
        where: {
          studentProfileId: null,
          clientIp,
          createdAt: { gte: oneDayAgo }
        }
      });
      const remaining = Math.max(0, 4 - guestSheetCount);
      
      limitContext = `\nACTIVE USER STATUS:\n- Login Status: Guest User (Not logged in)\n- Daily Worksheet Limit: 4 worksheets per 24 hours\n- Worksheets Generated Today: ${guestSheetCount}\n- Worksheets Remaining: ${remaining} out of 4\nUse this number (${remaining}) as the absolute truth to answer the user if they ask how many worksheets they have left or can generate today. If they have ${remaining} left, explicitly tell them "${remaining} worksheets left". Never make up any other number or guess that they have exhausted their limit unless remaining is 0.`;
    }

    const systemPrompt = `You are a helpful, friendly AI worksheet generation and support assistant for PracUp.${profileContext}${limitContext}
Your goal is to extract the following parameters from the conversation history if the user wants to generate a worksheet:
1. 'board': Must always be "CBSE". If the user explicitly requests another board like ICSE or a State Board, politely inform them in the clarifyingMessage that PracUp currently only supports CBSE (with ICSE and State Boards coming soon), and then set board to "CBSE".
2. 'grade': Must be one of: LKG, UKG, Class 1, Class 2, Class 3, Class 4, Class 5, Class 6, Class 7, Class 8.
3. 'subject': Must be one of: MATH, SCIENCE, ENGLISH, EVS, HINDI, SST.
4. 'topic': The specific topic or chapter name (e.g. "Fractions", "Photosynthesis", "Prepositions", "Plants").
5. 'difficulty': Must be one of: EASY, MEDIUM, HARD. Default to MEDIUM if not specified.
6. 'format': The question format. Must be one of: "MCQ" (only multiple choice questions), "SHORT" (only short answer questions), "CRITICAL" (only critical thinking / long questions), or "MIXED" (combination of types). Default to "MIXED" if not specified.
7. 'mcqCount': The quantity of MCQ questions. If format is "MCQ", this is the total questions count. If format is "SHORT" or "CRITICAL", this is 0. If format is "MIXED", default to 5.
8. 'shortCount': The quantity of Short Answer questions. If format is "SHORT", this is the total questions count. If format is "MCQ" or "CRITICAL", this is 0. If format is "MIXED", default to 3 (or 5 for LKG-Class 2).
9. 'longCount': The quantity of Critical Thinking / Long questions. If format is "CRITICAL", this is the total questions count. If format is "MCQ" or "SHORT", this is 0. If format is "MIXED", default to 2 (or 5 for LKG-Class 2).

IMPORTANT EXTRACTOR GUIDELINE:
- You MUST always extract and populate the 'params' object with whatever details you can find in the user's input, even if some fields are still missing. Do NOT set 'params' to null when asking a clarifying question.
- Always return a non-null 'params' object containing the extracted properties (use null inside specific properties if they are not yet resolved).
- Provide the property 'isComplete': boolean. Set 'isComplete' to true ONLY if all required worksheet parameters ('grade', 'subject', 'topic') are specified, AND we also have resolved question types/counts. Otherwise set 'isComplete' to false.

IMPORTANT GUIDELINES:
- If key details like 'grade', 'subject', or 'topic' are missing, or if you want to clarify 'difficulty', prompt the user for them in a warm, concise manner.
- Ask for Format and Quantity: If the user has not specified whether they want a mixed paper or only specific types (like MCQ only, Short only, or Critical only), and/or they have not specified how many questions they want, you MUST ask them to clarify this (e.g., "Would you prefer a mixed paper, or only MCQs/Short/Critical questions? And how many questions would you like in total?") in the clarifyingMessage, and set 'isComplete' to false. The combined total of 'mcqCount', 'shortCount', and 'longCount' MUST be at least 5. If the user requests question counts that sum to less than 5 in total, politely inform them in the clarifyingMessage that the worksheet must contain a combined minimum of 5 questions in total, and set 'isComplete' to false.
- If the user asks support or guide questions about PracUp's platform features rather than generating a worksheet (for example: how to edit their profile, how to change passwords, credentials recovery, what the default parent PIN is, how guest worksheet limits work, why the answer key/solutions download is locked for guests, how manual or AI PDF grading works, or what the tabbed profile settings are), you MUST provide a friendly, direct, and concise answer to their question inside 'clarifyingMessage' and set 'isComplete' to false.
- Key reference logic to explain when asked:
  1. Default Parent PIN: "0000". Locked parent dashboard features and grading actions require this PIN.
  2. Credentials Recovery: In the main login view, there are "Forgot Username" and "Forgot Password" modal flows that use simulated verification codes sent to the registered parent email/phone to recover credentials.
  3. Edit Profile Modal: Redesigned into three tabs (Academic, Contact, Security). When updating sensitive details like contact methods, security questions/answers, or changing the password, the user must input their current password and current security answer inside the dynamic bottom verification panel.
  4. Guest Rate Limits: Guest users are limited to 4 worksheets per 24 hours (tracked by client IP). Solution keys and detailed step-by-step explanations are reserved for registered or paid profiles. Creating a profile unlocks higher quotas and features.
- Return ONLY a valid JSON object matching the schema below. Do not wrap the JSON in markdown code blocks or output any extra conversational text outside the JSON.


SCHEMA:
{
  "clarifyingMessage": "Friendly, short message to the user asking for missing info, answering a support question, or confirming generation if complete.",
  "isComplete": boolean, // Set to true only if all details are successfully resolved and verified, and we are ready to generate. Otherwise set to false.
  "params": {
    "board": "CBSE",
    "grade": "LKG" | "UKG" | "Class 1" | "Class 2" | "Class 3" | "Class 4" | "Class 5" | "Class 6" | "Class 7" | "Class 8",
    "subject": "MATH" | "SCIENCE" | "ENGLISH" | "EVS" | "HINDI" | "SST",
    "topic": "extracted topic string",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "format": "MCQ" | "SHORT" | "CRITICAL" | "MIXED",
    "mcqCount": number,
    "shortCount": number,
    "longCount": number
  } // Must always be populated with whatever details are extracted from history. Use null or default values for unmentioned fields.
}
`;

    // Format the conversation history for the AI prompt
    const formattedHistory = messages
      .map((msg: any) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const prompt = `Here is the current conversation transcript:\n\n${formattedHistory}\n\nPlease analyze the transcript above and return the JSON object:`;

    const aiResult = await queryOpenRouter(prompt, systemPrompt);

    // Validate and clean parameters against CURRICULUM_DATA to align with the wizard options
    if (aiResult && aiResult.params) {
      const { grade, subject, topic } = aiResult.params;

      const validGrades = Object.keys(CURRICULUM_DATA);
      
      if (grade && !validGrades.includes(grade)) {
        aiResult.clarifyingMessage = `Please select a valid grade. We support LKG, UKG, and Class 1 to Class 8.`;
        aiResult.params = null;
        aiResult.isComplete = false;
      } else if (grade && subject) {
        const gradeCurriculum = CURRICULUM_DATA[grade];
        const subjectUpper = subject.toUpperCase() as Subject;
        const availableTopics = gradeCurriculum?.[subjectUpper] || [];

        if (availableTopics.length === 0) {
          const validSubjectsForGrade = Object.keys(gradeCurriculum).filter(
            sub => (gradeCurriculum[sub as Subject] || []).length > 0
          );
          aiResult.clarifyingMessage = `For ${grade}, the available subjects are: ${validSubjectsForGrade.join(", ")}. Please choose one of these subjects.`;
          aiResult.params = null;
          aiResult.isComplete = false;
        } else if (topic) {
          const normalizedInputTopic = topic.trim().toLowerCase();
          
          // Try to match the topic from the list of chapters
          const matchedTopic = availableTopics.find(t => {
            const normalizedName = t.name.toLowerCase();
            return (
              normalizedName.includes(normalizedInputTopic) ||
              normalizedInputTopic.includes(normalizedName)
            );
          });

          if (matchedTopic) {
            aiResult.params.topic = matchedTopic.name;
            aiResult.params.subject = subjectUpper; // Normalize subject capitalization
          } else {
            // No match found - politely ask to pick from the available ones
            aiResult.clarifyingMessage = `I couldn't find a chapter matching "${topic}" in the CBSE ${grade} ${subjectUpper} syllabus. Please choose one of the available topics:\n${availableTopics.map(t => `• ${t.name}`).join("\n")}`;
            aiResult.params = null;
            aiResult.isComplete = false;
          }
        }
      }

      // If the LLM thinks it is complete, double check we have all three keys and a minimum of 5 questions in total
      if (aiResult.isComplete) {
        if (!aiResult.params || !aiResult.params.grade || !aiResult.params.subject || !aiResult.params.topic) {
          aiResult.isComplete = false;
          aiResult.params = null;
          aiResult.clarifyingMessage = `Please make sure you specify the grade, subject, and topic for the worksheet.`;
        } else {
          // Check question count
          const mcq = aiResult.params.mcqCount !== undefined && aiResult.params.mcqCount !== null ? Number(aiResult.params.mcqCount) : null;
          const short = aiResult.params.shortCount !== undefined && aiResult.params.shortCount !== null ? Number(aiResult.params.shortCount) : null;
          const long = aiResult.params.longCount !== undefined && aiResult.params.longCount !== null ? Number(aiResult.params.longCount) : null;
          
          const isEarlyLearner = ["LKG", "UKG", "Class 1", "Class 2"].includes(aiResult.params.grade);
          const resolvedMcq = mcq !== null ? Math.max(0, Math.min(20, mcq)) : (isEarlyLearner ? 5 : 5);
          const resolvedShort = short !== null ? Math.max(0, Math.min(10, short)) : (isEarlyLearner ? 5 : 3);
          const resolvedLong = long !== null ? Math.max(0, Math.min(10, long)) : (isEarlyLearner ? 5 : 2);
          
          const finalTotal = resolvedMcq + resolvedShort + resolvedLong;
          if (finalTotal < 5) {
            aiResult.isComplete = false;
            aiResult.clarifyingMessage = `A worksheet must contain a combined minimum of 5 questions in total. Currently, the parameters specify only ${finalTotal} questions. Please specify a higher question count or add other question types to proceed!`;
          }
        }
      }
    }

    return NextResponse.json(aiResult);

  } catch (error) {
    console.error("[Chat Extract API Error] Failed to process message:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
