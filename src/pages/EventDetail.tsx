import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEventDetail, useRegistrationStatus, useRegisterForEvent, useUnregister } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Users, ArrowLeft, CheckCircle, Download, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

function generateICS(event: any): string {
  const start = new Date(event.event_date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hour default duration
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CampusEvents//EN
BEGIN:VEVENT
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:${event.title}
LOCATION:${event.venue}
DESCRIPTION:${event.description?.substring(0, 200) || ''}
ORGANIZER;CN=${event.organizer_name || 'Organizer'}:MAILTO:noreply@campusevents.com
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

function downloadICS(event: any) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEventDetail(id || "");
  const { data: isRegistered } = useRegistrationStatus(id || "");
  const register = useRegisterForEvent();
  const unregister = useUnregister();

  // Track view
  useEffect(() => {
    if (id && user) {
      supabase.from("event_views").insert({ event_id: id, user_id: user.id }).then(() => {});
    }
  }, [id, user]);

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
    draft: "bg-muted text-muted-foreground",
    registration_closed: "bg-campus-gold/10 text-campus-gold",
  };

  const isCapacityFull = event.max_capacity && (event.registration_count || 0) >= event.max_capacity;
  const isRegClosed = event.status === "registration_closed" || event.status === "completed";
  const canRegister = profile?.role === "participant" && !isRegClosed && !isCapacityFull && event.status !== "completed";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <Link to="/events" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>

        <Card className="overflow-hidden">
          {/* Category accent */}
          <div className="h-2 bg-gradient-to-r from-primary to-campus-coral" />
          
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`${statusColors[event.status] || ""}`}>
                    {event.status?.replace("_", " ")}
                  </Badge>
                  {event.category && (
                    <Badge variant="outline" className="capitalize text-xs">{event.category}</Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-card-foreground">{event.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Organized by {event.organizer_name}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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
                {event.registration_count} {event.max_capacity ? `/ ${event.max_capacity}` : ""} registered
              </span>
              {event.registration_deadline && (
                <span className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                  <Clock className="h-4 w-4 text-campus-gold" />
                  Deadline: {format(new Date(event.registration_deadline), "MMM d, h:mm a")}
                </span>
              )}
            </div>

            {/* Capacity warning */}
            {isCapacityFull && !isRegistered && (
              <div className="flex items-center gap-2 bg-campus-gold/10 text-campus-gold p-3 rounded-lg border border-campus-gold/20">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">This event is at full capacity</span>
              </div>
            )}

            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">About this event</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Calendar download */}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadICS(event)}>
              <Download className="h-4 w-4" />
              Add to Calendar (.ics)
            </Button>

            {/* Registration section */}
            {profile?.role === "participant" && event.status !== "completed" && (
              <div className="border-t pt-6">
                {isRegistered ? (
                  <div className="flex items-center justify-between bg-campus-success/10 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-campus-success">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">You're registered!</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadICS(event)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> Calendar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => unregister.mutate(event.id)} disabled={unregister.isPending}>
                        Cancel Registration
                      </Button>
                    </div>
                  </div>
                ) : canRegister ? (
                  <Button
                    size="lg"
                    className="w-full bg-campus-coral hover:bg-campus-coral/90 text-primary-foreground"
                    onClick={() => register.mutate(event.id)}
                    disabled={register.isPending}
                  >
                    {register.isPending ? "Registering..." : "Register for this Event"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-muted p-4 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground font-medium">
                      {isCapacityFull ? "Event is at full capacity" : "Registration is closed"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
