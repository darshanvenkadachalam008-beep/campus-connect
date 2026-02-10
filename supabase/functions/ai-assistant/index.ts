import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, data } = await req.json();

    let messages: any[] = [];

    switch (action) {
      case "generate_description": {
        const { title, category, venue } = data;
        messages = [
          {
            role: "system",
            content: "You are a campus event copywriter. Generate engaging, professional event descriptions for college campus events. Keep it 2-3 paragraphs, enthusiastic but informative. Include what attendees will learn/experience, who should attend, and why it's valuable. Do NOT use markdown headings or bullet points - write flowing paragraphs."
          },
          {
            role: "user",
            content: `Generate a compelling description for this campus event:\nTitle: ${title}\nCategory: ${category}\nVenue: ${venue}`
          }
        ];
        break;
      }
      case "predict_turnout": {
        const { eventTitle, category, registrationCount, maxCapacity, daysUntilEvent, historicalAvg } = data;
        messages = [
          {
            role: "system",
            content: "You are an event analytics AI. Predict the likely turnout percentage and provide a brief insight. Respond ONLY with valid JSON: {\"predictedTurnout\": number, \"confidence\": \"high\"|\"medium\"|\"low\", \"insight\": \"string\"}. No markdown, no code blocks."
          },
          {
            role: "user",
            content: `Predict turnout for: "${eventTitle}" (${category}). ${registrationCount} registered, capacity ${maxCapacity || 'unlimited'}, ${daysUntilEvent} days away. Historical avg turnout: ${historicalAvg || 75}%.`
          }
        ];
        break;
      }
      case "recommend_events": {
        const { pastCategories, pastEvents, availableEvents } = data;
        messages = [
          {
            role: "system",
            content: "You are a campus event recommendation engine. Based on the user's past event interests, recommend the most relevant upcoming events. Respond ONLY with valid JSON: {\"recommendedIds\": [\"id1\", \"id2\", ...], \"reason\": \"string\"}. Maximum 5 recommendations. No markdown."
          },
          {
            role: "user",
            content: `User's past categories: ${JSON.stringify(pastCategories)}. Past events: ${JSON.stringify(pastEvents?.slice(0, 5))}. Available events: ${JSON.stringify(availableEvents?.map((e: any) => ({ id: e.id, title: e.title, category: e.category })))}`
          }
        ];
        break;
      }
      case "detect_conflicts": {
        const { newEvent, existingEvents } = data;
        messages = [
          {
            role: "system",
            content: "You are a scheduling conflict detector. Analyze if the new event conflicts with existing events (same venue + overlapping time, or same target audience). Respond ONLY with valid JSON: {\"hasConflict\": boolean, \"conflicts\": [{\"eventTitle\": \"string\", \"reason\": \"string\"}], \"suggestion\": \"string\"}. No markdown."
          },
          {
            role: "user",
            content: `New event: ${JSON.stringify(newEvent)}. Existing events: ${JSON.stringify(existingEvents?.slice(0, 10))}`
          }
        ];
        break;
      }
      case "suggest_schedule": {
        const { category, venue, pastEvents } = data;
        messages = [
          {
            role: "system",
            content: "You are a campus scheduling assistant. Suggest the best day and time for an event based on historical patterns. Respond ONLY with valid JSON: {\"suggestedDay\": \"string\", \"suggestedTime\": \"string\", \"reason\": \"string\"}. No markdown."
          },
          {
            role: "user",
            content: `Category: ${category}, Venue: ${venue}. Past event patterns: ${JSON.stringify(pastEvents?.slice(0, 10))}`
          }
        ];
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
