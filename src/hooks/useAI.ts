import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAIGenerateDescription() {
  return useMutation({
    mutationFn: async (data: { title: string; category: string; venue: string }) => {
      const { data: result, error } = await supabase.functions.invoke("ai-assistant", {
        body: { action: "generate_description", data },
      });
      if (error) throw error;
      return result.result as string;
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAIPredictTurnout() {
  return useMutation({
    mutationFn: async (data: {
      eventTitle: string;
      category: string;
      registrationCount: number;
      maxCapacity?: number;
      daysUntilEvent: number;
      historicalAvg?: number;
    }) => {
      const { data: result, error } = await supabase.functions.invoke("ai-assistant", {
        body: { action: "predict_turnout", data },
      });
      if (error) throw error;
      try {
        return JSON.parse(result.result);
      } catch {
        return { predictedTurnout: 75, confidence: "medium", insight: result.result };
      }
    },
  });
}

export function useAIRecommendEvents() {
  return useMutation({
    mutationFn: async (data: { pastCategories: string[]; pastEvents: any[]; availableEvents: any[] }) => {
      const { data: result, error } = await supabase.functions.invoke("ai-assistant", {
        body: { action: "recommend_events", data },
      });
      if (error) throw error;
      try {
        return JSON.parse(result.result);
      } catch {
        return { recommendedIds: [], reason: result.result };
      }
    },
  });
}

export function useAIDetectConflicts() {
  return useMutation({
    mutationFn: async (data: { newEvent: any; existingEvents: any[] }) => {
      const { data: result, error } = await supabase.functions.invoke("ai-assistant", {
        body: { action: "detect_conflicts", data },
      });
      if (error) throw error;
      try {
        return JSON.parse(result.result);
      } catch {
        return { hasConflict: false, conflicts: [], suggestion: result.result };
      }
    },
  });
}
