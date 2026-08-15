import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineDetector from "@/components/OfflineDetector";

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export const metadata: Metadata = {
  title: "PracUp | Practice Today, Level Up Tomorrow",
  description: "Generate customized practice worksheets aligned to LKG to Class 8 syllabus in seconds. Automatically target parent analytics and homework weaknesses.",
  keywords: [
    "PracUp",
    "Worksheet generator",
    "AI school worksheets",
    "CBSE worksheets LKG to Class 8",
    "ICSE worksheets generator",
    "personalized math practice sheets",
    "adaptive student learning dashboard",
  ],
  authors: [{ name: "PracUp Team" }],
  metadataBase: new URL("https://pracup.co.in"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PracUp | Practice Today, Level Up Tomorrow",
    description: "Generate customized practice worksheets aligned to LKG to Class 8 syllabus in seconds. Target parent analytics and learning weaknesses automatically.",
    url: "https://pracup.co.in",
    siteName: "PracUp",
    images: [
      {
        url: "/finallogo3.png",
        width: 1200,
        height: 630,
        alt: "PracUp AI school worksheet generator",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PracUp | Practice Today, Level Up Tomorrow",
    description: "Generate customized practice worksheets aligned to school board syllabus automatically.",
    images: ["/finallogo3.png"],
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
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
    "name": "PracUp",
    "operatingSystem": "All",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "INR",
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
        <OfflineDetector>
          {children}
        </OfflineDetector>
      </body>
    </html>
  );
}
