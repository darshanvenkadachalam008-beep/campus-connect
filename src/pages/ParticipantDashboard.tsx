import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRegistrations, useAllEvents } from "@/hooks/useEvents";
import { useAIRecommendEvents } from "@/hooks/useAI";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, Sparkles, Star } from "lucide-react";
import { useState, useEffect } from "react";

export default function ParticipantDashboard() {
  const { user, profile, loading } = useAuth();
  const { data: registrations, isLoading } = useMyRegistrations();
  const { data: allEvents } = useAllEvents();
  const recommend = useAIRecommendEvents();
  const [recommendations, setRecommendations] = useState<any>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role === "organizer") return <Navigate to="/dashboard/organizer" replace />;

  const registeredIds = new Set((registrations || []).map((e: any) => e.id));
  const pastCategories = [...new Set((registrations || []).map((e: any) => e.category).filter(Boolean))];
  const availableEvents = (allEvents || []).filter(e => !registeredIds.has(e.id) && e.status === "upcoming");

  const handleGetRecommendations = async () => {
    const result = await recommend.mutateAsync({
      pastCategories,
      pastEvents: registrations || [],
      availableEvents,
    });
    setRecommendations(result);
  };

  const recommendedEvents = recommendations?.recommendedIds
    ? availableEvents.filter(e => recommendations.recommendedIds.includes(e.id))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-8 w-8 text-campus-coral" />
            My Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Your registered events and AI recommendations</p>
        </div>

        {/* AI Recommendations */}
        {availableEvents.length > 0 && (
          <Card className="p-6 mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-campus-coral/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">AI Recommended for You</h2>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleGetRecommendations} disabled={recommend.isPending}>
                {recommend.isPending ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {recommendations ? "Refresh" : "Get Recommendations"}
              </Button>
            </div>
            {recommendations?.reason && (
              <p className="text-sm text-muted-foreground mb-4 italic">💡 {recommendations.reason}</p>
            )}
            {recommendedEvents.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedEvents.map((event: any) => (
                  <EventCard key={event.id} {...event} />
                ))}
              </div>
            ) : recommendations ? (
              <p className="text-sm text-muted-foreground">No specific recommendations right now. Browse all events!</p>
            ) : null}
          </Card>
        )}

        {/* Registered Events */}
        <h2 className="text-xl font-semibold text-foreground mb-4">My Registrations</h2>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : registrations && registrations.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {registrations.map((event: any) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No registrations yet</h2>
            <p className="text-muted-foreground mb-4">Browse events and register for ones that interest you.</p>
            <Link to="/events">
              <Button className="gap-2">Browse Events <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
