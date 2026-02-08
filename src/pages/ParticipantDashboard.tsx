import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRegistrations } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";

export default function ParticipantDashboard() {
  const { user, profile, loading } = useAuth();
  const { data: registrations, isLoading } = useMyRegistrations();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role === "organizer") return <Navigate to="/dashboard/organizer" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground">Events you've registered for</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
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
              <Button className="gap-2">
                Browse Events <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
