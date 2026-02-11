import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, eventId, qrToken } = await req.json();

    if (action === "generate_qr") {
      // Only organizer can generate QR
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .select("organizer_id, status")
        .eq("id", eventId)
        .single();

      if (eventErr || !event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (event.organizer_id !== user.id) {
        return new Response(JSON.stringify({ error: "Only the organizer can generate QR" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a secure random token
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const newToken = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

      await supabase
        .from("events")
        .update({ qr_token: newToken })
        .eq("id", eventId);

      return new Response(JSON.stringify({ qrToken: newToken }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "checkin") {
      // Participant checks in via QR
      if (!eventId || !qrToken) {
        return new Response(JSON.stringify({ error: "Missing eventId or qrToken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate the QR token matches the event
      const { data: event, error: eventErr } = await supabase
        .from("events")
        .select("id, title, qr_token, status, event_date")
        .eq("id", eventId)
        .single();

      if (eventErr || !event) {
        return new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (event.qr_token !== qrToken) {
        return new Response(JSON.stringify({ error: "Invalid QR code" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check time validity: allow check-in from 2 hours before to 6 hours after event
      const eventDate = new Date(event.event_date);
      const now = new Date();
      const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
      const sixHoursAfter = new Date(eventDate.getTime() + 6 * 60 * 60 * 1000);

      if (now < twoHoursBefore || now > sixHoursAfter) {
        return new Response(JSON.stringify({ error: "QR code is not valid at this time. Check-in is only available around the event time." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user is registered
      const { data: registration } = await supabase
        .from("registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!registration) {
        return new Response(JSON.stringify({ error: "You are not registered for this event" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for duplicate check-in
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Already checked in", alreadyCheckedIn: true }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record attendance
      const { error: insertErr } = await supabase
        .from("attendance")
        .insert({ event_id: eventId, user_id: user.id });

      if (insertErr) {
        console.error("Attendance insert error:", insertErr);
        return new Response(JSON.stringify({ error: "Failed to record attendance" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, eventTitle: event.title }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("QR checkin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
