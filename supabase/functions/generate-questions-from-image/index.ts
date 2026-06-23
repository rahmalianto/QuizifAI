// QuizifAI — Supabase Edge Function: generate-questions-from-image
// Calls Gemini 2.5 Flash to generate quiz questions from an uploaded image.
//
// Deploy with:
//   supabase functions deploy generate-questions-from-image
//
// Set the secret:
//   supabase secrets set GEMINI_API_KEY=your-api-key-here

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
    const { imageBase64, mimeType, questionTypes, count, tags, prompt } = await req.json();

    if (!imageBase64 || !mimeType || !questionTypes || !count) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageBase64, mimeType, questionTypes, count" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the system prompt
    const systemPrompt = `You are an expert educational content creator. Your task is to:
1. First, carefully read and understand ALL text and visual content in the provided image.
2. Then, generate quiz questions based on that content.

RULES:
1. Generate exactly ${count} questions.
2. Only use these question types: ${questionTypes.join(", ")}.
3. Each question must be directly based on information visible in the image.
4. For MULTIPLE_CHOICE questions: provide exactly 1 correct answer and exactly 3 incorrect options.
5. For CHECKBOX questions: provide 2-3 correct answers and 2-3 incorrect options.
6. For SHORT_ANSWER questions: provide 1 correct answer. Do not include incorrect_options.
7. For LONG_ANSWER questions: provide 1 correct answer (a comprehensive expected response). Do not include incorrect_options.
8. The "material_reference" field must contain the most relevant sentence or phrase from the image content that supports this question.
9. Questions should test understanding, not just recall. Include a mix of difficulty levels.
10. Distribute question types roughly evenly across the allowed types.
11. Frame the questions generally. Do NOT use phrases like "according to the chart", "based on the image", or "in the diagram". Instead, use specific context (e.g., if it's a chart about 'Global Sales', ask "What were the Global Sales in 2023?"). The questions should be self-contained.

OUTPUT FORMAT:
Return a JSON object with a single "questions" array. Each question object must have:
- "question_text": string (the question)
- "answer_type": string (one of: MULTIPLE_CHOICE, CHECKBOX, SHORT_ANSWER, LONG_ANSWER)
- "correct_answers": string[] (array of correct answer strings)
- "incorrect_options": string[] | null (array of wrong options, null for text answers)
- "material_reference": string (source citation from the image content)
${tags && tags.length > 0 ? `- "tags": string[] (use these tags: ${tags.join(", ")})` : ""}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

    // Call Gemini API with multimodal content (image + text)
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64,
                },
              },
              {
                text: `${systemPrompt}\n\n${prompt ? `ADDITIONAL CONTEXT FROM USER:\n${prompt}\n\n` : ''}Analyze the image above and generate ${count} questions now.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to generate questions from AI", details: errorBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract the text content from Gemini response
    const responseText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let questions;
    try {
      // Strip markdown code blocks if the AI includes them
      const cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      questions = parsed.questions || parsed;

      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array of questions");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          raw: responseText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize questions
    const validatedQuestions = questions.map((q: any, i: number) => ({
      question_text: q.question_text || `Question ${i + 1}`,
      answer_type: questionTypes.includes(q.answer_type) ? q.answer_type : questionTypes[0],
      correct_answers: Array.isArray(q.correct_answers)
        ? q.correct_answers
        : [String(q.correct_answers || "")],
      incorrect_options:
        q.answer_type === "SHORT_ANSWER" || q.answer_type === "LONG_ANSWER"
          ? null
          : Array.isArray(q.incorrect_options)
            ? q.incorrect_options
            : null,
      material_reference: q.material_reference || null,
      tags: Array.isArray(q.tags) ? q.tags : tags || [],
    }));

    return new Response(
      JSON.stringify({ questions: validatedQuestions }),
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
