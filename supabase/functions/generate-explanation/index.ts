// QuizifAI — Supabase Edge Function: generate-explanation
// Calls user-configured LLM APIs to generate quiz explanations with failover support.

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
    const { questionText, answerType, correctAnswers, incorrectOptions } = await req.json();

    if (!questionText || !answerType || !correctAnswers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: questionText, answerType, correctAnswers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasOptions = (answerType === "MULTIPLE_CHOICE" || answerType === "CHECKBOX" || answerType === "TRUE_FALSE") &&
      incorrectOptions && incorrectOptions.length > 0;

    const allOptions = hasOptions ? [...correctAnswers, ...incorrectOptions] : [];
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

    let finalError = null;

    // Loop through each configured provider in priority order
    for (const config of configs) {
      try {
        console.log(`Attempting explanation generation with provider: ${config.provider}`);
        let responseText = "";

        if (config.provider === "google") {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model_name}:generateContent?key=${config.api_key}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
                maxOutputTokens: 2048,
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
              messages: [{ role: "user", content: systemPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.4
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
              messages: [{ role: "user", content: systemPrompt }],
              max_tokens: 2048,
              temperature: 0.4
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.content?.[0]?.text || "";
        }
        else if (config.provider === "groq") {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.api_key}`
            },
            body: JSON.stringify({
              model: config.model_name,
              messages: [{ role: "user", content: systemPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.4
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.choices?.[0]?.message?.content || "";
        }
        else if (config.provider === "cloudflare") {
          const [accountId, token] = config.api_key.split(":");
          if (!accountId || !token) {
            throw new Error("Cloudflare key must be in format ACCOUNT_ID:TOKEN");
          }
          const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${config.model_name}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: systemPrompt }]
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          responseText = data?.result?.response || data?.result?.text || "";
        }

        if (!responseText) {
          throw new Error("Empty response from AI");
        }

        // Clean and parse JSON
        const cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleanText);

        if (!result.explanation) {
          throw new Error("AI response missing explanation field");
        }

        console.log(`Successfully generated explanation using ${config.provider}`);
        return new Response(
          JSON.stringify({
            explanation: result.explanation,
            option_explanations: result.option_explanations || null,
            provider: config.provider
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err) {
        console.error(`Error with provider ${config.provider}:`, err);
        finalError = err;
      }
    }

    return new Response(
      JSON.stringify({ error: "All configured AI providers failed for explanation generation.", details: finalError?.message }),
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
