// src/app/api/parent/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import nodemailer from "nodemailer";

// GET /api/parent/summary?contact=... (optional contact to run specifically)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactInput = searchParams.get("contact");

    // Fetch active Plus and Family/Pro subscriptions
    const subscriptions = await prisma.parentSubscription.findMany({
      where: contactInput ? {
        contact: contactInput.trim(),
        tier: { in: ["PLUS", "FAMILY_PRO"] },
        status: "ACTIVE"
      } : {
        tier: { in: ["PLUS", "FAMILY_PRO"] },
        status: "ACTIVE"
      }
    });

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
    const smtpPass = process.env.SMTP_PASS || process.env.NODEMAILER_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"PracUp Admin" <${smtpUser}>` : `"PracUp Admin" <no-reply@pracup.co.in>`);

    const smtpConfigured = !!(smtpUser && smtpPass && !smtpUser.includes("your-email") && !smtpUser.includes("your-"));
    const reportsSent: any[] = [];

    let transporter: any = null;
    if (smtpConfigured) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const sub of subscriptions) {
      const contact = sub.contact;
      const isEmail = contact.includes("@");
      
      // Look up student profiles for this contact
      let searchConditions: any = {};
      if (isEmail) {
        searchConditions = { parentEmail: { equals: contact, mode: "insensitive" } };
      } else {
        const digits = contact.replace(/\D/g, "");
        const localNum = digits.length >= 10 ? digits.slice(-10) : digits;
        searchConditions = { parentPhone: { contains: localNum } };
      }

      const profiles = await prisma.studentProfile.findMany({
        where: {
          AND: [
            searchConditions,
            { deletedAt: null }
          ]
        }
      });

      if (profiles.length === 0) {
        continue;
      }

      // Compile summaries for each child
      const childSummaries = [];
      for (const profile of profiles) {
        const worksheets = await prisma.generatedWorksheet.findMany({
          where: {
            studentProfileId: profile.id,
            createdAt: { gte: sevenDaysAgo }
          },
          orderBy: { createdAt: "desc" }
        });

        const weaknesses = await prisma.weaknessLog.findMany({
          where: {
            studentProfileId: profile.id,
            errorCount: { gt: 0 }
          },
          orderBy: { errorCount: "desc" },
          take: 3
        });

        const completedCount = worksheets.filter(w => w.score !== null).length;
        const totalScore = worksheets.reduce((sum, w) => sum + (w.score || 0), 0);
        const totalMaxMarks = worksheets.reduce((sum, w) => sum + (w.score !== null ? w.totalMarks : 0), 0);
        const avgPercentage = totalMaxMarks > 0 ? Math.round((totalScore / totalMaxMarks) * 100) : 0;

        childSummaries.push({
          name: profile.name,
          grade: profile.grade,
          board: profile.board,
          totalWorksheets: worksheets.length,
          completedCount,
          avgPercentage,
          worksheets: worksheets.map(w => ({
            topic: w.topic,
            subject: w.subject,
            score: w.score,
            totalMarks: w.totalMarks,
            date: new Date(w.createdAt).toLocaleDateString("en-IN")
          })),
          weaknesses: weaknesses.map(w => ({
            subject: w.subject,
            subtopic: w.subtopic,
            errorCount: w.errorCount
          }))
        });
      }

      // Generate HTML report body
      const emailBody = `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 40px 10px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em;">PracUp</h1>
              <p style="margin: 4px 0 0 0; font-size: 0.95rem; opacity: 0.9;">Weekly Parent & Student Performance Summary</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 32px 24px;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Hi Parent,</h2>
              <p style="font-size: 0.95rem; line-height: 1.5; color: #475569; margin-bottom: 24px;">
                Here is the PracUp weekly progress report for your child profile(s). Review their scores and subtopics needing attention to help them perform better!
              </p>
              
              ${childSummaries.map(child => `
                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 4px 0; font-size: 1.1rem; color: #7c3aed; font-weight: 700;">${child.name}</h3>
                  <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 16px;">Grade: ${child.grade} &bull; Board: ${child.board}</div>
                  
                  <!-- Stats grid -->
                  <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <div style="flex: 1; background: #ffffff; border-radius: 8px; padding: 12px; border: 1px solid #cbd5e1; text-align: center;">
                      <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px;">Sheets Practiced</div>
                      <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">${child.totalWorksheets}</div>
                    </div>
                    <div style="flex: 1; background: #ffffff; border-radius: 8px; padding: 12px; border: 1px solid #cbd5e1; text-align: center;">
                      <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px;">Average Accuracy</div>
                      <div style="font-size: 1.3rem; font-weight: 800; color: ${child.avgPercentage >= 75 ? '#16a34a' : child.avgPercentage >= 45 ? '#d97706' : '#dc2626'};">${child.avgPercentage}%</div>
                    </div>
                  </div>

                  <!-- Recent worksheets -->
                  <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; font-weight: 700; color: #0f172a;">Recent Worksheets</h4>
                  ${child.worksheets.length === 0 ? `
                    <p style="font-size: 0.85rem; color: #94a3b8; font-style: italic; margin-bottom: 16px;">No worksheets generated in the last 7 days.</p>
                  ` : `
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 20px;">
                      <thead>
                        <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b; text-align: left;">
                          <th style="padding: 6px 0; font-weight: 600;">Worksheet</th>
                          <th style="padding: 6px 0; font-weight: 600; text-align: right;">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${child.worksheets.map(w => `
                          <tr style="border-bottom: 1px dashed #e2e8f0; color: #334155;">
                            <td style="padding: 8px 0;"><strong>${w.subject}</strong>: ${w.topic}</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600;">
                              ${w.score !== null ? `${w.score}/${w.totalMarks}` : `<span style="color: #64748b; font-weight: normal; font-style: italic;">Unsubmitted</span>`}
                            </td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  `}

                  <!-- Weak Topics -->
                  <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; font-weight: 700; color: #0f172a;">Concepts Needing Practice</h4>
                  ${child.weaknesses.length === 0 ? `
                    <p style="font-size: 0.85rem; color: #16a34a; font-weight: 600; margin-bottom: 0;">Excellent! No major weaknesses flagged this week.</p>
                  ` : `
                    <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem; color: #dc2626; line-height: 1.5;">
                      ${child.weaknesses.map(w => `
                        <li><strong>${w.subject}</strong>: ${w.subtopic} (${w.errorCount} mistakes flagged)</li>
                      `).join("")}
                    </ul>
                  `}
                </div>
              `).join("")}
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; display: inline-block;">
                  Go to PracUp Dashboard
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; line-height: 1.4;">
              This report was sent to you because your email is linked to an active PracUp Plus or Family/Pro subscription.<br />
              &copy; ${new Date().getFullYear()} PracUp (pracup.co.in). All rights reserved.
            </div>
          </div>
        </div>
      `;

      if (isEmail && smtpConfigured) {
        try {
          await transporter.sendMail({
            from: smtpFrom,
            to: contact,
            subject: "PracUp Weekly Student Progress Summary",
            html: emailBody
          });
          reportsSent.push({ contact, childCount: childSummaries.length, status: "sent_email" });
        } catch (err) {
          console.error(`[Weekly Summary Email] Failed to send email to ${contact}:`, err);
          reportsSent.push({ contact, childCount: childSummaries.length, status: `email_failed: ${(err as Error).message}` });
        }
      } else {
        // Log in console/debug if no SMTP or if phone number
        console.log(`[Weekly Summary Simulation] Weekly Summary Compiled for ${contact}:\n`, childSummaries);
        reportsSent.push({ contact, childCount: childSummaries.length, status: "simulated_console_log" });
      }
    }

    return NextResponse.json({
      status: "success",
      totalProcessed: subscriptions.length,
      reports: reportsSent
    });

  } catch (error) {
    console.error("[Summary Report GET Error]:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
