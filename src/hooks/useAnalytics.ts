import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganizerAnalytics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organizer-analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all organizer's events
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user!.id)
        .order("event_date", { ascending: true });
      if (error) throw error;

      const eventIds = events.map((e: any) => e.id);
      if (eventIds.length === 0) return { events: [], registrations: [], views: [], stats: getEmptyStats() };

      // Get registrations for all events
      const { data: registrations } = await supabase
        .from("registrations")
        .select("event_id, registered_at, user_id")
        .in("event_id", eventIds);

      // Get view counts
      const { data: views } = await supabase
        .from("event_views")
        .select("event_id, viewed_at")
        .in("event_id", eventIds);

      // Compute analytics
      const totalRegistrations = registrations?.length || 0;
      const totalViews = views?.length || 0;
      const conversionRate = totalViews > 0 ? Math.round((totalRegistrations / totalViews) * 100) : 0;

      // Registrations per day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentRegs = (registrations || []).filter(
        (r: any) => new Date(r.registered_at) >= thirtyDaysAgo
      );

      const regsByDay: Record<string, number> = {};
      recentRegs.forEach((r: any) => {
        const day = new Date(r.registered_at).toISOString().split("T")[0];
        regsByDay[day] = (regsByDay[day] || 0) + 1;
      });

      const dailyData = [];
      for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        dailyData.push({ date: key, registrations: regsByDay[key] || 0 });
      }

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      (registrations || []).forEach((r: any) => {
        const event = events.find((e: any) => e.id === r.event_id);
        const cat = event?.category || "other";
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      });

      const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

      // Per-event stats
      const eventStats = events.map((e: any) => {
        const regCount = (registrations || []).filter((r: any) => r.event_id === e.id).length;
        const viewCount = (views || []).filter((v: any) => v.event_id === e.id).length;
        return {
          id: e.id,
          title: e.title,
          category: e.category,
          status: e.status,
          event_date: e.event_date,
          registrations: regCount,
          views: viewCount,
          conversion: viewCount > 0 ? Math.round((regCount / viewCount) * 100) : 0,
          capacity: e.max_capacity,
        };
      });

      return {
        events,
        registrations,
        views,
        stats: {
          totalEvents: events.length,
          totalRegistrations,
          totalViews,
          conversionRate,
          upcomingEvents: events.filter((e: any) => e.status === "upcoming").length,
          completedEvents: events.filter((e: any) => e.status === "completed").length,
        },
        dailyData,
        categoryData,
        eventStats,
      };
    },
  });
}

function getEmptyStats() {
  return {
    totalEvents: 0,
    totalRegistrations: 0,
    totalViews: 0,
    conversionRate: 0,
    upcomingEvents: 0,
    completedEvents: 0,
  };
}
