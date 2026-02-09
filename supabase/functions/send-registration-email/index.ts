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

    // Fetch event details with organizer info
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, description, venue, event_date, organizer_id, category, profiles!events_organizer_id_fkey(full_name)")
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
    const { data: participantProfile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (profileError || !participantProfile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch organizer's email from auth.users
    const { data: organizerAuth, error: organizerAuthError } = await supabase.auth.admin.getUserById(event.organizer_id);
    
    if (organizerAuthError) {
      console.error("Organizer auth fetch error:", organizerAuthError);
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
    const organizerEmail = organizerAuth?.user?.email;
    const participantName = participantProfile.full_name || "A participant";
    const categoryLabel = event.category ? event.category.charAt(0).toUpperCase() + event.category.slice(1) : "Event";

    // Email template for participant
    const participantEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #ea6852 100%); padding: 40px 32px; text-align: center;">
            <div style="background: rgba(255,255,255,0.15); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 16px;">
              <span style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${categoryLabel}</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 You're Registered!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
              Hi <strong>${participantName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
              Great news! Your registration for the following event has been confirmed:
            </p>
            
            <!-- Event Card -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 20px; font-weight: 700;">${event.title}</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #64748b; font-size: 14px;">📅 Date</span>
                  </td>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${formattedDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #64748b; font-size: 14px;">⏰ Time</span>
                  </td>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${formattedTime}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #64748b; font-size: 14px;">📍 Venue</span>
                  </td>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${event.venue}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #64748b; font-size: 14px;">👤 Organizer</span>
                  </td>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${organizerName}</span>
                  </td>
                </tr>
              </table>
            </div>
            
            ${event.description ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px;">
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                <strong>About:</strong> ${event.description.substring(0, 250)}${event.description.length > 250 ? "..." : ""}
              </p>
            </div>
            ` : ""}
            
            <p style="color: #374151; font-size: 16px; margin: 0; line-height: 1.6;">
              We look forward to seeing you there! 🎓
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              CampusEvents — Your campus event hub
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send confirmation email to participant
    console.log(`Sending confirmation email to participant: ${user.email}`);
    const participantEmailResponse = await resend.emails.send({
      from: "CampusEvents <onboarding@resend.dev>",
      to: [user.email!],
      subject: `✅ Registration Confirmed: ${event.title}`,
      html: participantEmailHtml,
    });

    console.log("Participant email sent:", participantEmailResponse);

    // Send notification email to organizer (if we have their email)
    let organizerEmailResponse = null;
    if (organizerEmail && organizerEmail !== user.email) {
      const organizerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #10b981 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🆕 New Registration!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                Hi <strong>${organizerName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                Great news! Someone just registered for your event.
              </p>
              
              <!-- Participant Info Card -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
                <h3 style="color: #065f46; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">New Participant</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top;">
                      <span style="color: #047857; font-size: 14px;">👤 Name</span>
                    </td>
                    <td style="padding: 8px 0; vertical-align: top;">
                      <span style="color: #065f46; font-size: 14px; font-weight: 600;">${participantName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top;">
                      <span style="color: #047857; font-size: 14px;">📧 Email</span>
                    </td>
                    <td style="padding: 8px 0; vertical-align: top;">
                      <span style="color: #065f46; font-size: 14px; font-weight: 600;">${user.email}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Event Info Card -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
                <h3 style="color: #475569; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">Event Details</h3>
                <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px; font-weight: 700;">${event.title}</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top;">
                      <span style="color: #64748b; font-size: 13px;">📅 ${formattedDate} at ${formattedTime}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top;">
                      <span style="color: #64748b; font-size: 13px;">📍 ${event.venue}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.6;">
                Log in to your dashboard to view all registrations.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                CampusEvents — Your campus event hub
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      console.log(`Sending notification email to organizer: ${organizerEmail}`);
      organizerEmailResponse = await resend.emails.send({
        from: "CampusEvents <onboarding@resend.dev>",
        to: [organizerEmail],
        subject: `🆕 New Registration: ${participantName} registered for ${event.title}`,
        html: organizerEmailHtml,
      });

      console.log("Organizer email sent:", organizerEmailResponse);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      participantEmailId: participantEmailResponse.data?.id,
      organizerEmailId: organizerEmailResponse?.data?.id 
    }), {
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
