import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  title: "SheetMate | AI-Powered School Worksheet Generator",
  description: "Generate customized practice worksheets aligned to LKG to Class 8 syllabus in seconds. Automatically target parent analytics and homework weaknesses.",
  keywords: [
    "Worksheet generator",
    "AI school worksheets",
    "CBSE worksheets LKG to Class 8",
    "ICSE worksheets generator",
    "personalized math practice sheets",
    "adaptive student learning dashboard",
  ],
  authors: [{ name: "SheetMate Team" }],
  metadataBase: new URL("https://sheetmate.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SheetMate | AI-Powered School Worksheet Generator",
    description: "Generate customized practice worksheets aligned to LKG to Class 8 syllabus in seconds. Target parent analytics and learning weaknesses automatically.",
    url: "https://sheetmate.app",
    siteName: "SheetMate",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "SheetMate AI school worksheet generator",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SheetMate | AI-Powered School Worksheet Generator",
    description: "Generate customized practice worksheets aligned to school board syllabus automatically.",
    images: ["/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SheetMate",
    "operatingSystem": "All",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD",
      "description": "Free demo workspace with premium features for parents and teachers",
    },
    "description": "AI-powered custom worksheet generator and student adaptive tracking dashboard for parents and teachers.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "2480",
    },
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
