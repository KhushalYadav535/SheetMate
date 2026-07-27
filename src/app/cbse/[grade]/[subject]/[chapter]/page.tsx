// src/app/cbse/[grade]/[subject]/[chapter]/page.tsx
import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { queryOpenRouter } from "@/lib/openrouter";

interface PageProps {
  params: Promise<{
    grade: string;
    subject: string;
    chapter: string;
  }>;
}

// Convert slug back to readable chapter title
function formatSlug(slug: string): string {
  return decodeURIComponent(slug)
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function SeoChapterPage({ params }: PageProps) {
  const { grade, subject, chapter } = await params;
  
  const formattedGrade = formatSlug(grade);
  const formattedSubject = subject.toUpperCase();
  const formattedChapter = formatSlug(chapter);

  const cacheKey = `cbse-${grade}-${subject}-${chapter}`.toLowerCase();
  
  let worksheetData: any = null;

  try {
    // 1. Check cache for this NCERT chapter worksheet
    const cached = await prisma.worksheetCache.findUnique({
      where: { cacheKey }
    });

    if (cached) {
      worksheetData = JSON.parse(cached.contentJson);
    } else {
      // 2. Cache miss: trigger a prompt to build a default sheet
      const systemPrompt = "You are an expert CBSE textbook publisher. Generate a high-quality, printable practice worksheet in English. You must return only a valid JSON object matching the requested schema. Do not output markdown wrapping like ```json.";
      const userPrompt = `Generate a worksheet for:
Board: CBSE
Grade: ${formattedGrade}
Subject: ${formattedSubject}
Topic/Chapter: ${formattedChapter}
Difficulty: MEDIUM

Return JSON in this schema:
{
  "title": "CBSE Worksheet: ${formattedChapter}",
  "grade": "${formattedGrade}",
  "subject": "${formattedSubject}",
  "sections": [
    {
      "name": "Section A: Multiple Choice Questions",
      "questions": [
        {
          "id": "q1",
          "text": "Sample MCQ Question?",
          "type": "MCQ",
          "options": ["Opt A", "Opt B", "Opt C", "Opt D"],
          "answer": "Opt A",
          "subtopic": "Introduction",
          "solutionExplanation": "Basic solution guide."
        }
      ]
    }
  ]
}`;

      // Call OpenRouter free route
      worksheetData = await queryOpenRouter(userPrompt, systemPrompt);
      
      // Save to cache
      await prisma.worksheetCache.create({
        data: {
          cacheKey,
          contentJson: JSON.stringify(worksheetData)
        }
      });
    }
  } catch (err) {
    console.error("[SEO Page API Error] Failed to retrieve cached sheet:", err);
  }

  const getQuestionNumber = (secIdx: number, qIdx: number) => {
    let count = 0;
    const sections = worksheetData?.sections || [];
    for (let i = 0; i < secIdx; i++) {
      count += sections[i]?.questions?.length || 0;
    }
    return count + qIdx + 1;
  };

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", background: "#0a0a0f", color: "#f8fafc" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Breadcrumbs for SEO crawlers */}
        <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "20px" }}>
          <Link href="/" style={{ color: "#a78bfa", textDecoration: "none" }}>Home</Link>
          &nbsp;&raquo;&nbsp;
          <span>CBSE</span>
          &nbsp;&raquo;&nbsp;
          <span>{formattedGrade}</span>
          &nbsp;&raquo;&nbsp;
          <span>{formattedSubject}</span>
          &nbsp;&raquo;&nbsp;
          <span style={{ color: "#f8fafc" }}>{formattedChapter}</span>
        </div>

        {/* Floating Call To Action Card */}
        <div style={{ 
          background: "rgba(124, 58, 237, 0.08)", 
          border: "1px solid rgba(124, 58, 237, 0.2)", 
          borderRadius: "12px", 
          padding: "24px", 
          marginBottom: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "4px" }}>Want to generate personalized sheets?</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Create a profile, manually score sheets, and let our AI adjust to your weak spots.</p>
          </div>
          <Link href="/" style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem"
          }}>
            Open Generator Workspace
          </Link>
        </div>

        {/* SEO Header content */}
        <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "20px", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "2rem", lineHeight: 1.2, marginBottom: "8px" }}>
            CBSE {formattedGrade} {formattedSubject} Worksheets: {formattedChapter}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
            Free, printable PDF worksheet for CBSE {formattedGrade} students practicing chapter "{formattedChapter}". Answer keys and solution walkthroughs are appended at the end of the sheet.
          </p>
        </header>

        {/* Renders the Worksheet Preview */}
        {worksheetData ? (
          <div style={{ background: "#fff", color: "#000", padding: "40px", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
            <div style={{ borderBottom: "2px solid #000", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700 }}>
                <span>CBSE BOARD PRACTICE</span>
                <span>{worksheetData.grade}</span>
              </div>
              <h2 style={{ fontSize: "1.4rem", marginTop: "8px", color: "#000" }}>{worksheetData.title}</h2>
              <p style={{ fontSize: "0.9rem", color: "#475569", marginTop: "2px" }}>Subject: {worksheetData.subject} &bull; Rating: verified NCERT standard</p>
            </div>

            <div>
              {worksheetData.sections?.map((sec: any, sIdx: number) => (
                <div key={sIdx} style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "1.05rem", borderBottom: "1.5px solid #000", paddingBottom: "4px", marginBottom: "10px", color: "#000" }}>
                    {sec.name}
                  </h3>
                  {sec.questions?.map((q: any, qIdx: number) => (
                    <div key={q.id} style={{ marginBottom: "16px", fontSize: "0.9rem" }}>
                      <p style={{ fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span>Q{getQuestionNumber(sIdx, qIdx)}: {q.text}</span>
                        <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500, whiteSpace: "nowrap", marginLeft: "10px" }}>
                          [{q.marks || (q.type === "MCQ" ? 1 : q.type === "SHORT" ? 2 : 4)} {(q.marks === 1 || (!q.marks && q.type === "MCQ")) ? 'Mark' : 'Marks'}]
                        </span>
                      </p>
                      {q.options && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", paddingLeft: "12px", marginTop: "6px" }}>
                          {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx}>{String.fromCharCode(97 + oIdx)}) {opt}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Print trigger notice */}
            <div style={{ marginTop: "30px", borderTop: "1.5px solid #cbd5e1", paddingTop: "12px", textAlign: "center", fontSize: "0.8rem", color: "#475569" }}>
              <span>Generated on pracup.co.in &bull; Save or print directly to download</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "#94a3b8" }}>Could not fetch worksheet content. Please check OpenRouter configurations.</p>
          </div>
        )}
      </div>
    </main>
  );
}
