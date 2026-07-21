// QuizifAI — Supabase Edge Function: generate-explanation
// Calls Gemini 3.5 Flash Lite to generate an explanation for a quiz question answer.
//
// Deploy with:
//   supabase functions deploy generate-explanation
//
// Requires the same secret:
//   GEMINI_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { questionText, answerType, correctAnswers, incorrectOptions } = await req.json();

    if (!questionText || !answerType || !correctAnswers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: questionText, answerType, correctAnswers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasOptions = (answerType === "MULTIPLE_CHOICE" || answerType === "CHECKBOX" || answerType === "TRUE_FALSE") &&
      incorrectOptions && incorrectOptions.length > 0;

    // Build prompt based on question type
    const allOptions = hasOptions
      ? [...correctAnswers, ...incorrectOptions]
      : [];

    const optionsSection = hasOptions
      ? `\nAnswer options:\n${allOptions.map((o: string) => `- ${o}`).join("\n")}`
      : "";

    const correctAnswersStr = correctAnswers.join(", ");

    const systemPrompt = `You are an expert educational tutor. Your task is to explain why quiz answers are correct or incorrect.

Given the following quiz question, provide a clear and concise explanation.

Question: ${questionText}
Question type: ${answerType}
Correct answer(s): ${correctAnswersStr}${optionsSection}

RULES:
1. Write a "explanation" field: a clear, concise explanation of WHY the correct answer(s) are right. Maximum 3 sentences.
2. ${hasOptions ? `Write an "option_explanations" field: a JSON object where each key is one of the answer options and the value is a 1-sentence explanation of why it is correct or incorrect.` : `Do NOT include "option_explanations" since this question has no selectable options.`}
3. Be educational and helpful. Avoid repeating the question text.
4. Write in a neutral, factual tone.

OUTPUT FORMAT:
Return a JSON object with:
- "explanation": string (max 3 sentences, general explanation of the correct answer)${hasOptions ? `\n- "option_explanations": object where keys are the exact option text strings and values are 1-sentence strings` : ""}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to generate explanation from AI", details: errorBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();

    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let result;
    try {
      const cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      result = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: responseText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate
    if (!result.explanation) {
      return new Response(
        JSON.stringify({ error: "AI response missing explanation field" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        explanation: result.explanation,
        option_explanations: result.option_explanations || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
