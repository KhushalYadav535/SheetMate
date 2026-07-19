import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://practicemitra.in";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/_next/",
        "/worksheets/*/review",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
