// src/lib/openrouter.ts

const MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free" // Automatic routing to active free models (avoids 404s/deprecations)
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

export async function queryOpenRouter(prompt: string, systemPrompt: string) {
  const apiKeys = [
    process.env.OPENROUTER_API_KEY,
    process.env.BACKUP_OPENROUTER_API_KEY
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    throw new Error("Missing OPENROUTER_API_KEY env variable.");
  }

  let lastError = null;

  for (const model of MODELS) {
    for (let kIdx = 0; kIdx < apiKeys.length; kIdx++) {
      const apiKey = apiKeys[kIdx];
      const keyLabel = kIdx === 0 ? "Primary" : "Backup";
      try {
        console.log(`[OpenRouter] Querying model: ${model} using ${keyLabel} key...`);
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
        console.warn(`[OpenRouter] Failed model ${model} with ${keyLabel} key:`, error);
        lastError = error;
      }
    }
  }

  throw new Error(`All OpenRouter models and API keys failed. Last error details: ${(lastError as Error)?.message || "Unknown error"}`);
}
export default queryOpenRouter;
