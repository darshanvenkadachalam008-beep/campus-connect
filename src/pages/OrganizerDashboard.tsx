import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEvents, useCreateEvent, useEventRegistrants } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, MapPin, Users, Eye } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().trim().min(1, "Description required").max(2000),
  venue: z.string().trim().min(1, "Venue required").max(200),
  event_date: z.string().min(1, "Date required"),
});

function RegistrantsDialog({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const { data: registrants, isLoading } = useEventRegistrants(eventId);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrants — {eventTitle}</DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : registrants && registrants.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {registrants.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium text-foreground">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(r.registered_at), "MMM d, h:mm a")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No registrations yet.</p>
      )}
    </DialogContent>
  );
}

export default function OrganizerDashboard() {
  const { user, profile, loading } = useAuth();
  const { data: events, isLoading } = useMyEvents();
  const createEvent = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [viewEventId, setViewEventId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== "organizer") return <Navigate to="/dashboard/participant" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = eventSchema.safeParse({ title, description, venue, event_date: eventDate });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    await createEvent.mutateAsync({
      title: parsed.data.title!,
      description: parsed.data.description!,
      venue: parsed.data.venue!,
      event_date: parsed.data.event_date!,
    });
    setOpen(false);
    setTitle("");
    setDescription("");
    setVenue("");
    setEventDate("");
  };

  const statusColors: Record<string, string> = {
    upcoming: "bg-primary/10 text-primary",
    ongoing: "bg-campus-coral/10 text-campus-coral",
    completed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Organizer Dashboard</h1>
            <p className="text-muted-foreground">Manage your campus events</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input id="title" placeholder="Tech Talk: AI in Education" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input id="venue" placeholder="Auditorium A, Main Campus" value={venue} onChange={(e) => setVenue(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Input id="date" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" placeholder="Describe the event..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={createEvent.isPending}>
                  {createEvent.isPending ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading your events...</p>
        ) : events && events.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                    <Badge variant="outline" className={statusColors[event.status] || ""}>
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(event.event_date), "MMM d, yyyy · h:mm a")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.venue}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {event.registration_count || 0} registered
                    </span>
                  </div>
                  <Dialog open={viewEventId === event.id} onOpenChange={(v) => setViewEventId(v ? event.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> View Registrants
                      </Button>
                    </DialogTrigger>
                    <RegistrantsDialog eventId={event.id} eventTitle={event.title} />
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No events yet</h2>
            <p className="text-muted-foreground mb-4">Create your first event to get started.</p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
