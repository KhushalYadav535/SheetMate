// src/lib/auth.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface SessionPayload {
  profileId: string;
  parentContact: string;
  name: string;
  role: string;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret || secret.trim().length === 0) {
    if (isProduction) {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET or SESSION_SECRET environment variable must be set in production.");
    }
    return "sheetmate_dev_session_secret_32bytes_fallback";
  }
  return secret;
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const secret = getJwtSecret();
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const sessionData: SessionPayload = { ...payload, exp };
  const base64Data = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(base64Data).digest("base64url");
  return `${base64Data}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [base64Data, signature] = parts;
    const secret = getJwtSecret();
    const expectedSig = crypto.createHmac("sha256", secret).update(base64Data).digest("base64url");
    
    if (signature !== expectedSig) return null;
    
    const payloadStr = Buffer.from(base64Data, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(payloadStr);
    
    if (payload.exp && Date.now() > payload.exp) return null;
    
    return payload;
  } catch (err) {
    if (process.env.NODE_ENV === "production" && (err as Error).message.includes("CRITICAL SECURITY ERROR")) {
      throw err; // Fail closed in production if secret is unconfigured
    }
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get("pracup_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set("pracup_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set("pracup_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
