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

    // If it's an email and SMTP credentials exist, send a real email using nodemailer!
    if (isEmail && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: `"PracticeMitra Admin" <${process.env.SMTP_USER}>`,
          to: parentPhone,
          subject: "PracticeMitra Parent Verification Code",
          html: `
            <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #f9fafb; padding: 40px; text-align: center;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.03); border: 1px solid #f3f4f6;">
                <h2 style="color: #7c3aed; margin-top: 0; font-size: 1.5rem; letter-spacing: -0.02em;">PracticeMitra</h2>
                <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">
                  Please verify your parent/guardian identity to access child workspaces and detailed practice analytics.
                </p>
                <div style="background-color: #f5f3ff; border: 1px dashed #c084fc; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: inline-block;">
                  <span style="font-size: 1.8rem; font-weight: 800; letter-spacing: 0.1em; color: #6d28d9;">${generatedOtp}</span>
                </div>
                <p style="color: #9ca3af; font-size: 0.75rem; line-height: 1.4; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`[SMTP Parent OTP] Sent real verification email with OTP ${generatedOtp} to ${parentPhone}`);

        return NextResponse.json({
          status: "success",
          otp: generatedOtp,
          message: `Verification code sent to email ${parentPhone}.`
        });
      } catch (smtpError) {
        console.error("[SMTP Parent OTP Failed] SMTP delivery failed, falling back to simulated console logs:", smtpError);
      }
    }

    // Fallback simulation (default behavior for phone numbers or if SMTP is missing)
    return NextResponse.json({
      status: "success",
      otp: generatedOtp,
      message: isEmail 
        ? `[Simulated Notification] Sent verification code ${generatedOtp} to parent email ${parentPhone}`
        : `[Simulated Notification] Sent verification code ${generatedOtp} to parent mobile number ${parentPhone}`
    });

  } catch (error) {
    console.error("[Parent OTP API Error] Failed to generate OTP:", error);
    return NextResponse.json({ error: (error as Error).message || "Internal Server Error" }, { status: 500 });
  }
}
