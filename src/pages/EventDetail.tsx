import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEventDetail, useRegistrationStatus, useRegisterForEvent, useUnregister } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Users, ArrowLeft, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEventDetail(id || "");
  const { data: isRegistered } = useRegistrationStatus(id || "");
  const register = useRegisterForEvent();
  const unregister = useUnregister();

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 text-center text-muted-foreground">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">Event not found</h2>
          <Link to="/events" className="text-primary hover:underline mt-2 inline-block">Back to events</Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    upcoming: "bg-primary/10 text-primary",
    ongoing: "bg-campus-coral/10 text-campus-coral",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <Link to="/events" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>

        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className={`mb-3 ${statusColors[event.status] || ""}`}>
                  {event.status}
                </Badge>
                <h1 className="text-3xl font-bold text-card-foreground">{event.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Organized by {event.organizer_name}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(event.event_date), "EEEE, MMMM d, yyyy · h:mm a")}
              </span>
              <span className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                <MapPin className="h-4 w-4 text-campus-coral" />
                {event.venue}
              </span>
              <span className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                <Users className="h-4 w-4 text-campus-teal" />
                {event.registration_count} registered
              </span>
            </div>

            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">About this event</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Registration section - only for participants */}
            {profile?.role === "participant" && event.status !== "completed" && (
              <div className="border-t pt-6">
                {isRegistered ? (
                  <div className="flex items-center justify-between bg-campus-success/10 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-campus-success">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">You're registered!</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unregister.mutate(event.id)}
                      disabled={unregister.isPending}
                    >
                      Cancel Registration
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full bg-campus-coral hover:bg-campus-coral/90 text-primary-foreground"
                    onClick={() => register.mutate(event.id)}
                    disabled={register.isPending}
                  >
                    {register.isPending ? "Registering..." : "Register for this Event"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
