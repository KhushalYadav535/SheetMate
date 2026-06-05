// src/lib/openrouter.ts

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free" // Secondary free option on OpenRouter
];

/**
 * Clean up text returned by the model which might be wrapped in ```json ... ``` markdown tags.
 */
function cleanAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  
  // Remove markdown codeblock tags if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*/, "");
    cleaned = cleaned.replace(/```$/, "");
    cleaned = cleaned.trim();
  }

  // Find the first occurrence of '{' and last occurrence of '}' to slice out noise
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("JSON parsing failed on text:", rawText);
    throw new Error(`Failed to parse AI response as valid JSON: ${(error as Error).message}`);
  }
}

/**
 * Helper to query Groq's official API directly.
 */
async function queryGroq(prompt: string, systemPrompt: string, apiKey: string) {
  const groqModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
  ];
  
  let lastError = null;
  for (const model of groqModels) {
    try {
      console.log(`[Groq] Querying model: ${model}...`);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq model ${model} responded with code ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`Groq model ${model} returned empty response content.`);
      }

      return cleanAndParseJSON(content);
    } catch (error) {
      console.warn(`[Groq] Failed model ${model}:`, error);
      lastError = error;
    }
  }
  throw lastError || new Error("All Groq models failed");
}

export async function queryOpenRouter(prompt: string, systemPrompt: string) {
  let lastError = null;

  // 1. Primary: Direct query to Groq API (extremely fast and highly available)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      console.log(`[Groq] Querying primary pipeline...`);
      return await queryGroq(prompt, systemPrompt, groqApiKey);
    } catch (groqError) {
      console.warn("[Groq Failed] Direct query failed, falling back to OpenRouter:", groqError);
      lastError = groqError;
    }
  } else {
    console.warn("[Groq Config] Groq API key is not configured in .env, skipping primary pipeline");
  }

  // 2. Fallback: Query OpenRouter free models
  const apiKeys = [
    process.env.OPENROUTER_API_KEY,
    process.env.BACKUP_OPENROUTER_API_KEY
  ].filter(Boolean) as string[];

  if (apiKeys.length > 0) {
    for (const model of MODELS) {
      for (let kIdx = 0; kIdx < apiKeys.length; kIdx++) {
        const apiKey = apiKeys[kIdx];
        const keyLabel = kIdx === 0 ? "Primary" : "Backup";
        try {
          console.log(`[OpenRouter Fallback] Querying model: ${model} using ${keyLabel} key...`);
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": "https://sheetmate.in",
              "X-Title": "SheetMate",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: model,
              response_format: { type: "json_object" }, // Request JSON output format
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.7
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Model ${model} responded with code ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;

          if (!content) {
            throw new Error(`Model ${model} returned empty response content.`);
          }

          return cleanAndParseJSON(content);

        } catch (error) {
          console.warn(`[OpenRouter Fallback] Failed model ${model} with ${keyLabel} key:`, error);
          lastError = error;
        }
      }
    }
  }

  throw new Error(`All direct and OpenRouter fallback pipelines failed. Last error details: ${(lastError as Error)?.message || "Unknown error"}`);
}

export default queryOpenRouter;
