import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RecursiveCharacterTextSplitter } from "npm:@langchain/textsplitters";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const body = await req.json();
    const { action } = body;

    if (action === "ingest") {
      const { pageId, text } = body;
      if (!pageId || !text) throw new Error("Missing pageId or text");

      // 1. Chunk the text
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.splitText(text);

      // 2. Generate embeddings for each chunk via Gemini API
      const embeddings = [];
      for (const chunk of chunks) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: { parts: [{ text: chunk }] },
            }),
          }
        );
        const geminiData = await geminiRes.json();
        if (!geminiRes.ok) throw new Error(geminiData.error?.message || "Gemini Embedding Error");
        embeddings.push(geminiData.embedding.values);
      }

      // 3. Insert into Supabase
      const { error } = await supabaseClient
        .from("onenote_embeddings")
        .insert(
          chunks.map((chunk, i) => ({
            page_id: pageId,
            content: chunk,
            embedding: embeddings[i],
          }))
        );

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, chunksIngested: chunks.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "chat") {
      const { query } = body;
      if (!query) throw new Error("Missing query");

      // 1. Generate embedding for the query
      const geminiEmbedRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: query }] },
          }),
        }
      );
      const embedData = await geminiEmbedRes.json();
      if (!geminiEmbedRes.ok) throw new Error(embedData.error?.message || "Gemini Query Embedding Error");
      const queryEmbedding = embedData.embedding.values;

      // 2. Match relevant chunks in Supabase
      const { data: matches, error: rpcError } = await supabaseClient.rpc(
        "match_page_chunks",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: 5,
        }
      );

      if (rpcError) throw rpcError;

      // 3. Construct context
      const contextText = matches
        .map((m: any) => `[Page ID: ${m.page_id}]\n${m.content}`)
        .join("\n\n---\n\n");

      // 4. Call Gemini Flash for chat
      const prompt = `You are a helpful assistant answering questions based on the provided OneNote context.
If the answer is not in the context, say so. Do not hallucinate.

Context:
${contextText}

Question: ${query}`;

      const geminiChatRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const chatData = await geminiChatRes.json();
      if (!geminiChatRes.ok) throw new Error(chatData.error?.message || "Gemini Chat Error");

      const answer = chatData.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

      return new Response(JSON.stringify({ answer, context: matches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
