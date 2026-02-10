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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const now = new Date();

    // 1. Auto-close registrations (deadline passed or capacity full)
    const { data: openEvents } = await supabase
      .from("events")
      .select("id, title, registration_deadline, max_capacity, status")
      .in("status", ["upcoming", "published"]);

    for (const event of openEvents || []) {
      let shouldClose = false;

      if (event.registration_deadline && new Date(event.registration_deadline) <= now) {
        shouldClose = true;
      }

      if (event.max_capacity) {
        const { count } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);
        if (count && count >= event.max_capacity) {
          shouldClose = true;
        }
      }

      if (shouldClose && event.status !== "registration_closed") {
        await supabase.from("events").update({ status: "registration_closed" }).eq("id", event.id);
        console.log(`Registration closed for event: ${event.title}`);
      }
    }

    // 2. Mark events as "ongoing" when event_date is within 2 hours
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const { data: startingSoon } = await supabase
      .from("events")
      .select("id, title, event_date")
      .in("status", ["upcoming", "registration_closed"])
      .lte("event_date", twoHoursFromNow.toISOString())
      .gte("event_date", new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString());

    for (const event of startingSoon || []) {
      const eventDate = new Date(event.event_date);
      if (eventDate <= twoHoursFromNow && eventDate >= new Date(now.getTime() - 4 * 60 * 60 * 1000)) {
        await supabase.from("events").update({ status: "ongoing" }).eq("id", event.id);
        console.log(`Event now ongoing: ${event.title}`);
      }
    }

    // 3. Mark events as "completed" (4+ hours after event_date)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const { data: endedEvents } = await supabase
      .from("events")
      .select("id, title, event_date")
      .eq("status", "ongoing")
      .lte("event_date", fourHoursAgo.toISOString());

    for (const event of endedEvents || []) {
      await supabase.from("events").update({ status: "completed" }).eq("id", event.id);
      console.log(`Event completed: ${event.title}`);

      // Send post-event thank-you emails
      const { data: registrants } = await supabase
        .from("registrations")
        .select("user_id, profiles(full_name)")
        .eq("event_id", event.id);

      for (const reg of registrants || []) {
        const { data: userData } = await supabase.auth.admin.getUserById(reg.user_id);
        if (userData?.user?.email) {
          try {
            await resend.emails.send({
              from: "CampusEvents <onboarding@resend.dev>",
              to: [userData.user.email],
              subject: `Thank you for attending: ${event.title}`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                  <div style="background: linear-gradient(135deg, #1e293b, #10b981); padding: 40px 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎓 Thank You!</h1>
                  </div>
                  <div style="padding: 32px;">
                    <p style="color: #374151; font-size: 16px;">Hi ${(reg as any).profiles?.full_name || 'there'},</p>
                    <p style="color: #374151; font-size: 16px;">Thank you for attending <strong>${event.title}</strong>! We hope you had a great experience.</p>
                    <p style="color: #374151; font-size: 16px;">We'd love to hear your feedback to make future events even better.</p>
                  </div>
                  <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">CampusEvents — Your campus event hub</p>
                  </div>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error("Thank-you email failed:", emailErr);
          }
        }
      }
    }

    // 4. Send reminder emails (24h and 1h before)
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const { data: reminderEvents } = await supabase
      .from("events")
      .select("id, title, venue, event_date")
      .in("status", ["upcoming", "registration_closed"])
      .gte("event_date", now.toISOString())
      .lte("event_date", oneDayFromNow.toISOString());

    for (const event of reminderEvents || []) {
      const eventDate = new Date(event.event_date);
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (60 * 60 * 1000);

      // Only send reminders at ~24h and ~1h marks
      const isRoughly24h = hoursUntil >= 23 && hoursUntil <= 25;
      const isRoughly1h = hoursUntil >= 0.5 && hoursUntil <= 1.5;

      if (!isRoughly24h && !isRoughly1h) continue;

      const reminderType = isRoughly24h ? "24h" : "1h";
      const { data: registrants } = await supabase
        .from("registrations")
        .select("user_id, profiles(full_name)")
        .eq("event_id", event.id);

      for (const reg of registrants || []) {
        const { data: userData } = await supabase.auth.admin.getUserById(reg.user_id);
        if (userData?.user?.email) {
          try {
            await resend.emails.send({
              from: "CampusEvents <onboarding@resend.dev>",
              to: [userData.user.email],
              subject: `⏰ Reminder: ${event.title} is ${reminderType === '24h' ? 'tomorrow' : 'starting soon'}!`,
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #1e293b, #ea6852); padding: 40px 32px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Event Reminder</h1>
                  </div>
                  <div style="padding: 32px;">
                    <p style="color: #374151; font-size: 16px;">Hi ${(reg as any).profiles?.full_name || 'there'},</p>
                    <p style="color: #374151; font-size: 16px;"><strong>${event.title}</strong> is ${reminderType === '24h' ? 'happening tomorrow' : 'starting in about an hour'}!</p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 16px 0;">
                      <p style="margin: 4px 0; color: #1e293b;">📍 <strong>${event.venue}</strong></p>
                      <p style="margin: 4px 0; color: #1e293b;">📅 <strong>${eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></p>
                      <p style="margin: 4px 0; color: #1e293b;">⏰ <strong>${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</strong></p>
                    </div>
                    <p style="color: #374151; font-size: 16px;">See you there! 🎓</p>
                  </div>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error("Reminder email failed:", emailErr);
          }
        }
      }
    }

    // 5. Auto-promote from waitlist
    const { data: eventsWithWaitlist } = await supabase
      .from("waitlist")
      .select("event_id")
      .is("promoted_at", null);

    const uniqueEventIds = [...new Set((eventsWithWaitlist || []).map(w => w.event_id))];

    for (const eventId of uniqueEventIds) {
      const { data: event } = await supabase
        .from("events")
        .select("id, title, max_capacity")
        .eq("id", eventId)
        .single();

      if (!event?.max_capacity) continue;

      const { count: regCount } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      const spotsAvailable = event.max_capacity - (regCount || 0);
      if (spotsAvailable <= 0) continue;

      const { data: waitlisters } = await supabase
        .from("waitlist")
        .select("id, user_id")
        .eq("event_id", eventId)
        .is("promoted_at", null)
        .order("created_at", { ascending: true })
        .limit(spotsAvailable);

      for (const waiter of waitlisters || []) {
        await supabase.from("registrations").insert({ event_id: eventId, user_id: waiter.user_id });
        await supabase.from("waitlist").update({ promoted_at: now.toISOString() }).eq("id", waiter.id);
        await supabase.from("notifications").insert({
          user_id: waiter.user_id,
          title: "You're in!",
          message: `A spot opened up for "${event.title}" and you've been automatically registered!`,
          type: "success",
          event_id: eventId,
        });
        console.log(`Promoted user ${waiter.user_id} from waitlist for event: ${event.title}`);
      }
    }

    return new Response(JSON.stringify({ success: true, timestamp: now.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Lifecycle error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
