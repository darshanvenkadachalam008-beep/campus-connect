import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  status: string;
  category: string;
  organizer_id: string;
  created_at: string;
  max_capacity?: number | null;
  registration_deadline?: string | null;
  organizer_name?: string;
  registration_count?: number;
}

export function useAllEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("events")
        .select("*, profiles!events_organizer_id_fkey(full_name)")
        .order("event_date", { ascending: true });
      if (error) throw error;

      // Get registration counts
      const { data: counts } = await supabase
        .from("registrations")
        .select("event_id");

      const countMap: Record<string, number> = {};
      counts?.forEach((r: { event_id: string }) => {
        countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
      });

      return events.map((e: any) => ({
        ...e,
        organizer_name: e.profiles?.full_name || "Unknown",
        registration_count: countMap[e.id] || 0,
      })) as Event[];
    },
  });
}

export function useMyEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user!.id)
        .order("event_date", { ascending: true });
      if (error) throw error;

      const eventIds = data.map((e: any) => e.id);
      const { data: counts } = await supabase
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds);

      const countMap: Record<string, number> = {};
      counts?.forEach((r: { event_id: string }) => {
        countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
      });

      return data.map((e: any) => ({
        ...e,
        registration_count: countMap[e.id] || 0,
      })) as Event[];
    },
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, profiles!events_organizer_id_fkey(full_name)")
        .eq("id", eventId)
        .single();
      if (error) throw error;

      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      return {
        ...data,
        organizer_name: (data as any).profiles?.full_name || "Unknown",
        registration_count: count || 0,
      } as Event;
    },
  });
}

export function useRegistrationStatus(eventId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["registration", eventId, user?.id],
    enabled: !!user && !!eventId,
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useRegisterForEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("registrations")
        .insert({ event_id: eventId, user_id: user!.id });
      if (error) {
        if (error.code === "23505") throw new Error("Already registered");
        throw error;
      }
      return eventId;
    },
    onSuccess: async (eventId) => {
      toast.success("Registered successfully!");
      qc.invalidateQueries({ queryKey: ["registration", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
      
      // Send confirmation email in background
      try {
        const { error } = await supabase.functions.invoke("send-registration-email", {
          body: { eventId, userId: user!.id },
        });
        if (error) {
          console.error("Email notification failed:", error);
        } else {
          toast.success("Confirmation email sent!");
        }
      } catch (emailErr) {
        console.error("Email notification error:", emailErr);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnregister() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      toast.success("Unregistered successfully");
      qc.invalidateQueries({ queryKey: ["registration", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["my-registrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (event: { title: string; description: string; venue: string; event_date: string; category: string; max_capacity?: number; registration_deadline?: string }) => {
      const insertData: any = { ...event, organizer_id: user!.id };
      if (!event.max_capacity) delete insertData.max_capacity;
      if (!event.registration_deadline) delete insertData.registration_deadline;
      const { error } = await supabase
        .from("events")
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event created!");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMyRegistrations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(*,  profiles!events_organizer_id_fkey(full_name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((r: any) => ({
        ...r.events,
        organizer_name: r.events?.profiles?.full_name || "Unknown",
        registered_at: r.registered_at,
      }));
    },
  });
}

export function useEventRegistrants(eventId: string) {
  return useQuery({
    queryKey: ["event-registrants", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, profiles(full_name)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data.map((r: any) => ({
        id: r.id,
        name: r.profiles?.full_name || "Unknown",
        registered_at: r.registered_at,
      }));
    },
  });
}
