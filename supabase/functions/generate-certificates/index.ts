import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId } = await req.json();

    // Verify organizer
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("*, profiles!events_organizer_id_fkey(full_name)")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.organizer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the organizer can generate certificates" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all attendees (people who checked in)
    const { data: attendees, error: attErr } = await supabase
      .from("attendance")
      .select("user_id, profiles(full_name)")
      .eq("event_id", eventId);

    if (attErr) {
      console.error("Attendance fetch error:", attErr);
      return new Response(JSON.stringify({ error: "Failed to fetch attendance" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!attendees || attendees.length === 0) {
      return new Response(JSON.stringify({ error: "No attendees found. Certificates are issued only to checked-in participants." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organizerName = (event as any).profiles?.full_name || "Campus Connect";
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    let generated = 0;
    let emailed = 0;

    for (const attendee of attendees) {
      const participantName = (attendee as any).profiles?.full_name || "Participant";

      // Check if certificate already exists
      const { data: existing } = await supabase
        .from("certificates")
        .select("id, emailed_at")
        .eq("event_id", eventId)
        .eq("user_id", attendee.user_id)
        .maybeSingle();

      let certNumber: string;

      if (existing) {
        // Already exists, get the cert number for re-send
        const { data: cert } = await supabase
          .from("certificates")
          .select("certificate_number")
          .eq("id", existing.id)
          .single();
        certNumber = cert?.certificate_number || `CC-${eventId.slice(0, 4)}-${attendee.user_id.slice(0, 4)}`.toUpperCase();
      } else {
        // Generate unique certificate number
        certNumber = `CC-${Date.now().toString(36).toUpperCase()}-${attendee.user_id.slice(0, 6).toUpperCase()}`;

        const { error: certErr } = await supabase
          .from("certificates")
          .insert({
            event_id: eventId,
            user_id: attendee.user_id,
            certificate_number: certNumber,
          });

        if (certErr) {
          console.error("Cert insert error for user:", attendee.user_id, certErr);
          continue;
        }
        generated++;
      }

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(attendee.user_id);
      if (!userData?.user?.email) continue;

      // Generate certificate HTML for email
      const certHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, sans-serif; background: #f5f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1e293b, #3b82f6); padding: 40px 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🎓 Certificate of Participation</h1>
            </div>
            <div style="padding: 48px 32px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 2px;">This is to certify that</p>
              <h2 style="color: #1e293b; font-size: 36px; margin: 8px 0 24px; font-weight: 700; border-bottom: 3px solid #3b82f6; display: inline-block; padding-bottom: 8px;">${participantName}</h2>
              <p style="color: #374151; font-size: 16px; margin: 16px 0;">has successfully participated in</p>
              <h3 style="color: #1e293b; font-size: 24px; margin: 8px 0 24px; font-weight: 700;">${event.title}</h3>
              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block;">
                <table style="border-collapse: collapse;">
                  <tr><td style="padding: 4px 16px; color: #64748b; text-align: left;">📅 Date</td><td style="padding: 4px 16px; color: #1e293b; font-weight: 600;">${formattedDate}</td></tr>
                  <tr><td style="padding: 4px 16px; color: #64748b; text-align: left;">📍 Venue</td><td style="padding: 4px 16px; color: #1e293b; font-weight: 600;">${event.venue}</td></tr>
                  <tr><td style="padding: 4px 16px; color: #64748b; text-align: left;">👤 Organizer</td><td style="padding: 4px 16px; color: #1e293b; font-weight: 600;">${organizerName}</td></tr>
                  <tr><td style="padding: 4px 16px; color: #64748b; text-align: left;">🔢 Cert. No.</td><td style="padding: 4px 16px; color: #1e293b; font-weight: 600;">${certNumber}</td></tr>
                  <tr><td style="padding: 4px 16px; color: #64748b; text-align: left;">📆 Issued</td><td style="padding: 4px 16px; color: #1e293b; font-weight: 600;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
                </table>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">CampusConnect — Smart Campus Event Management Platform</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "CampusConnect <onboarding@resend.dev>",
          to: [userData.user.email],
          subject: `🎓 Your Certificate: ${event.title}`,
          html: certHtml,
        });

        await supabase
          .from("certificates")
          .update({ emailed_at: new Date().toISOString() })
          .eq("event_id", eventId)
          .eq("user_id", attendee.user_id);

        emailed++;
      } catch (emailErr) {
        console.error("Certificate email failed for:", attendee.user_id, emailErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalAttendees: attendees.length,
      certificatesGenerated: generated,
      emailsSent: emailed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Certificate generation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
