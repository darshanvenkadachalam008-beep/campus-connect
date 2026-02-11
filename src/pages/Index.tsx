import { useAuth } from "@/contexts/AuthContext";
import { useAllEvents } from "@/hooks/useEvents";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import Navbar from "@/components/Navbar";
import heroCampus from "@/assets/hero-campus.jpg";
import { ArrowRight, Calendar, Users, Sparkles } from "lucide-react";

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { data: events } = useAllEvents();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const now = new Date();
  const upcoming = events?.filter((e) => e.status === "upcoming" && new Date(e.event_date) > now).slice(0, 4) || [];
  const ongoing = events?.filter((e) => e.status === "ongoing").slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[420px] overflow-hidden">
        <img src={heroCampus} alt="Campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="relative container h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 max-w-2xl">
            Your AI-Powered Campus Event Hub
          </h1>
          <p className="text-lg text-primary-foreground/80 mb-6 max-w-lg">
            Discover, join, and manage campus events with intelligent recommendations, automated emails, and real-time analytics.
          </p>
          <div className="flex gap-3">
            <Link to="/events">
              <Button size="lg" className="bg-campus-coral hover:bg-campus-coral/90 text-primary-foreground gap-2">
                Browse Events <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {profile?.role === "organizer" && (
              <Link to="/dashboard/organizer">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Create Event
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { icon: Calendar, label: "Total Events", value: events?.length || 0 },
            { icon: Sparkles, label: "Upcoming", value: upcoming.length },
            { icon: Users, label: "Ongoing", value: ongoing.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card rounded-xl p-4 text-center">
              <Icon className="h-5 w-5 mx-auto mb-1 text-campus-coral" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <section className="container py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
            <Link to="/events" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcoming.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      )}

      {/* Ongoing Events */}
      {ongoing.length > 0 && (
        <section className="container pb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Happening Now</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ongoing.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      )}

      {events?.length === 0 && (
        <section className="container py-20 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No events yet</h2>
          <p className="text-muted-foreground">
            {profile?.role === "organizer" ? "Create your first event from the dashboard!" : "Check back soon for new events."}
          </p>
        </section>
      )}
    </div>
  );
}
