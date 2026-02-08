import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RegistrationEmailRequest {
  eventId: string;
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header for user verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { eventId, userId }: RegistrationEmailRequest = await req.json();
    console.log(`Processing registration email for event ${eventId}, user ${userId}`);

    // Verify the requesting user matches
    if (user.id !== userId) {
      console.error("User mismatch");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, description, venue, event_date, profiles!events_organizer_id_fkey(full_name)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event fetch error:", eventError);
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch participant profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = eventDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const organizerName = (event as any).profiles?.full_name || "Campus Events";

    console.log(`Sending email to ${user.email} for event "${event.title}"`);

    const emailResponse = await resend.emails.send({
      from: "CampusEvents <onboarding@resend.dev>",
      to: [user.email!],
      subject: `Registration Confirmed: ${event.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 You're Registered!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                Hi <strong>${profile.full_name || "there"}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                Great news! Your registration for the following event has been confirmed:
              </p>
              
              <!-- Event Card -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <h2 style="color: #1e3a5f; font-size: 20px; margin: 0 0 16px;">${event.title}</h2>
                
                <div style="margin: 0 0 12px;">
                  <span style="color: #6b7280; font-size: 14px;">📅 Date:</span>
                  <span style="color: #374151; font-size: 14px; font-weight: 500;"> ${formattedDate}</span>
                </div>
                
                <div style="margin: 0 0 12px;">
                  <span style="color: #6b7280; font-size: 14px;">⏰ Time:</span>
                  <span style="color: #374151; font-size: 14px; font-weight: 500;"> ${formattedTime}</span>
                </div>
                
                <div style="margin: 0 0 12px;">
                  <span style="color: #6b7280; font-size: 14px;">📍 Venue:</span>
                  <span style="color: #374151; font-size: 14px; font-weight: 500;"> ${event.venue}</span>
                </div>
                
                <div style="margin: 0;">
                  <span style="color: #6b7280; font-size: 14px;">👤 Organized by:</span>
                  <span style="color: #374151; font-size: 14px; font-weight: 500;"> ${organizerName}</span>
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
                ${event.description ? `<strong>About:</strong> ${event.description.substring(0, 200)}${event.description.length > 200 ? "..." : ""}` : ""}
              </p>
              
              <p style="color: #374151; font-size: 14px; margin: 0;">
                We look forward to seeing you there! 🎓
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                CampusEvents — Your campus event hub
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending registration email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
