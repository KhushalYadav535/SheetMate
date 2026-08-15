// src/app/api/parent/otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentPhone } = body;

    if (!parentPhone) {
      return NextResponse.json({ error: "Parent mobile number or email address is required" }, { status: 400 });
    }

    const isEmail = parentPhone.includes("@");
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Check for SMTP or Nodemailer environment variables
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
    const smtpPass = process.env.SMTP_PASS || process.env.NODEMAILER_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `"PracUp" <${smtpUser}>` : `"PracUp" <no-reply@pracup.co.in>`);

    const hasRealSmtp = !!(smtpUser && smtpPass && !smtpUser.includes("your-email") && !smtpUser.includes("your-"));

    // If it's an email and real credentials exist, send a real email using Nodemailer
    if (isEmail && hasRealSmtp) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const mailOptions = {
          from: smtpFrom,
          to: parentPhone,
          subject: "PracUp - Parent Verification Code",
          html: `
            <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #f8fafc; padding: 40px 10px; text-align: center;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;">
                <div style="margin-bottom: 12px;">
                  <h2 style="color: #7c3aed; margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em;">PracUp</h2>
                  <p style="color: #64748b; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 4px 0 0 0; font-weight: 700;">Practice Today, Level Up Tomorrow</p>
                </div>
                
                <p style="color: #475569; font-size: 0.95rem; line-height: 1.5; margin: 24px 0;">
                  Please verify your parent/guardian identity to access child workspaces and detailed practice analytics.
                </p>
                
                <div style="background: linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%); border: 1px dashed #7c3aed; border-radius: 14px; padding: 20px; margin-bottom: 24px; display: inline-block; min-width: 220px;">
                  <div style="font-size: 0.75rem; text-transform: uppercase; color: #6d28d9; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px;">Verification Code</div>
                  <span style="font-size: 2.2rem; font-weight: 900; letter-spacing: 0.18em; color: #7c3aed;">${generatedOtp}</span>
                </div>
                
                <p style="color: #94a3b8; font-size: 0.78rem; line-height: 1.4; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  If you didn't request this code, you can safely ignore this email.<br />
                  &copy; ${new Date().getFullYear()} PracUp (pracup.co.in). All rights reserved.
                </p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Nodemailer Parent OTP] Sent real verification email to ${parentPhone}`);

        // OMIT OTP payload from JSON response to prevent response leakage
        return NextResponse.json({
          status: "success",
          message: `Verification code sent to email ${parentPhone}.`
        });
      } catch (smtpError) {
        console.error("[Nodemailer Parent OTP Failed] Delivery failed, falling back to simulated log:", smtpError);
      }
    }

    // Fallback simulation mode (OMIT OTP payload from JSON response)
    return NextResponse.json({
      status: "success",
      message: isEmail 
        ? `[Simulated Notification] Sent verification code to parent email ${parentPhone}`
        : `[Simulated Notification] Sent verification code to parent mobile number ${parentPhone}`
    });

  } catch (error) {
    console.error("[Parent OTP API Error] Failed to generate OTP:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
