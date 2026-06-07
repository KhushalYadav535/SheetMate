import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SheetMate | AI-Powered School Worksheet Generator",
  description: "Generate customized practice worksheets aligned to school board syllabus for Grades LKG to Class 8. Personalize homework for weak topics automatically.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
