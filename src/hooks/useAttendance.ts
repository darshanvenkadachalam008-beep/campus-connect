import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useGenerateQR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.functions.invoke("qr-checkin", {
        body: { action: "generate_qr", eventId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.qrToken as string;
    },
    onSuccess: () => {
      toast.success("QR code generated!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCheckin() {
  return useMutation({
    mutationFn: async ({ eventId, qrToken }: { eventId: string; qrToken: string }) => {
      const { data, error } = await supabase.functions.invoke("qr-checkin", {
        body: { action: "checkin", eventId, qrToken },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Checked in to ${data.eventTitle}!`);
    },
    onError: (err: Error) => {
      if (err.message.includes("Already checked in")) {
        toast.info("You're already checked in!");
      } else {
        toast.error(err.message);
      }
    },
  });
}

export function useEventAttendance(eventId: string) {
  return useQuery({
    queryKey: ["attendance", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, profiles(full_name)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data.map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        name: a.profiles?.full_name || "Unknown",
        checkedInAt: a.checked_in_at,
      }));
    },
  });
}

export function useEventCertificates(eventId: string) {
  return useQuery({
    queryKey: ["certificates", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, profiles(full_name)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerateCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-certificates", {
        body: { eventId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, eventId) => {
      toast.success(`${data.certificatesGenerated} certificates generated, ${data.emailsSent} emails sent!`);
      qc.invalidateQueries({ queryKey: ["certificates", eventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMyAttendance(eventId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-attendance", eventId, user?.id],
    enabled: !!user && !!eventId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useMyCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, events(title, event_date, venue)")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
