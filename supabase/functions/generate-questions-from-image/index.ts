// QuizifAI — Supabase Edge Function: generate-questions-from-image
// Calls user-configured LLM APIs to generate quiz questions from an image with failover support.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Verify authentication and create Supabase client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Fetch user API configurations
    const { data: configs, error: configError } = await supabaseClient
      .from("user_api_configs")
      .select("*")
      .eq("is_enabled", true)
      .order("priority", { ascending: true });

    if (configError) {
      console.error("Database query error:", configError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve API configurations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No enabled API configurations found. Please configure your API keys in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
11. Frame the questions generally. Do NOT use phrases like "according to the chart", "based on the image", or "in the diagram". Instead, use specific context. The questions should be self-contained.

OUTPUT FORMAT:
Return a JSON object with a single "questions" array. Each question object must have:
- "question_text": string (the question)
- "answer_type": string (one of: MULTIPLE_CHOICE, CHECKBOX, SHORT_ANSWER, LONG_ANSWER)
- "correct_answers": string[] (array of correct answer strings)
- "incorrect_options": string[] | null (array of wrong options, null for text answers)
- "material_reference": string (source citation from the image content)
- "explanation": string (1-3 sentences explaining WHY the correct answer is right, and what makes the wrong options incorrect if applicable)
- "option_explanations": object | null (for MULTIPLE_CHOICE and CHECKBOX only: keys are the exact option text strings, values are 1-sentence strings explaining why that option is correct or incorrect. Omit or set to null for SHORT_ANSWER and LONG_ANSWER)
${tags && tags.length > 0 ? `- "tags": string[] (use these tags: ${tags.join(", ")})` : ""}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

    const userPrompt = `${prompt ? `ADDITIONAL CONTEXT FROM USER:\n${prompt}\n\n` : ''}Analyze the image and generate ${count} questions now.`;

    let finalError = null;

    // Loop through each configured provider in priority order
    for (const config of configs) {
      try {
        console.log(`Attempting image generation with provider: ${config.provider}`);
        let responseText = "";

        if (config.provider === "google") {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model_name}:generateContent?key=${config.api_key}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { inlineData: { mimeType, data: imageBase64 } },
                    { text: `${systemPrompt}\n\n${userPrompt}` }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 16384,
              },
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
        else if (config.provider === "openai") {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.api_key}`
            },
            body: JSON.stringify({
              model: config.model_name,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: [
                    { type: "text", text: userPrompt },
                    {
                      type: "image_url",
                      image_url: { url: `data:${mimeType};base64,${imageBase64}` }
                    }
                  ]
                }
              ],
              response_format: { type: "json_object" },
              max_tokens: 16384,
              temperature: 0.7
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.choices?.[0]?.message?.content || "";
        }
        else if (config.provider === "anthropic") {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": config.api_key,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: config.model_name,
              system: systemPrompt,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: mimeType,
                        data: imageBase64
                      }
                    },
                    { type: "text", text: userPrompt }
                  ]
                }
              ],
              max_tokens: 8192,
              temperature: 0.7
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.content?.[0]?.text || "";
        }
        else if (config.provider === "groq") {
          // Use standard vision model for Groq
          const visionModel = config.model_name.includes("vision") ? config.model_name : "llama-3.2-11b-vision-preview";
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.api_key}`
            },
            body: JSON.stringify({
              model: visionModel,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: [
                    { type: "text", text: userPrompt },
                    {
                      type: "image_url",
                      image_url: { url: `data:${mimeType};base64,${imageBase64}` }
                    }
                  ]
                }
              ],
              response_format: { type: "json_object" },
              max_tokens: 16384,
              temperature: 0.7
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.choices?.[0]?.message?.content || "";
        }
        else if (config.provider === "cloudflare") {
          // Cloudflare Workers AI expects the raw image/array buffer, but for simplicity 
          // we can send to model that parses prompt + image base64 if supported, or skip.
          const [accountId, token] = config.api_key.split(":");
          if (!accountId || !token) {
            throw new Error("Cloudflare key must be in format ACCOUNT_ID:TOKEN");
          }
          // Note: Standard Llava model URL
          const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${config.model_name}`;

          // Cloudflare vision models take a specific body structure: { image: [base64_as_array_or_string], prompt: prompt_text }
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              image: imageBase64,
              prompt: `${systemPrompt}\n\n${userPrompt}`
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.result?.response || data?.result?.text || "";
        }

        if (!responseText) {
          throw new Error("Empty response from AI");
        }

        // Clean up markdown wrapping if present
        const cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);
        const questions = parsed.questions || parsed;

        if (!Array.isArray(questions)) {
          throw new Error("Response is not an array of questions");
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
          explanation: q.explanation || null,
          option_explanations: (q.answer_type === "SHORT_ANSWER" || q.answer_type === "LONG_ANSWER")
            ? null
            : (q.option_explanations && typeof q.option_explanations === "object" ? q.option_explanations : null),
          tags: Array.isArray(q.tags) ? q.tags : tags || [],
        }));

        console.log(`Successfully generated questions from image using ${config.provider}`);
        return new Response(
          JSON.stringify({ questions: validatedQuestions, provider: config.provider }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err) {
        console.error(`Error with provider ${config.provider}:`, err);
        finalError = err;
      }
    }

    return new Response(
      JSON.stringify({ error: "All configured AI providers failed for image generation.", details: finalError?.message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
