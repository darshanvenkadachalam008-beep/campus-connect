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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, MapPin, Users, Eye, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "workshop", label: "Workshop", icon: "🛠️" },
  { value: "seminar", label: "Seminar", icon: "🎓" },
  { value: "fest", label: "Fest", icon: "🎉" },
  { value: "meetup", label: "Meetup", icon: "👥" },
  { value: "other", label: "Other", icon: "📌" },
];

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().trim().min(1, "Description required").max(2000),
  venue: z.string().trim().min(1, "Venue required").max(200),
  event_date: z.string().min(1, "Date required"),
  category: z.string().min(1, "Category required"),
});

function RegistrantsDialog({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const { data: registrants, isLoading } = useEventRegistrants(eventId);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Registrants — {eventTitle}
        </DialogTitle>
      </DialogHeader>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : registrants && registrants.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {registrants.map((r, index) => (
            <div 
              key={r.id} 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">{r.name}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md">
                {format(new Date(r.registered_at), "MMM d, h:mm a")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No registrations yet.</p>
        </div>
      )}
    </DialogContent>
  );
}

const categoryConfig: Record<string, { icon: string; gradient: string }> = {
  workshop: { icon: "🛠️", gradient: "from-blue-500/10 to-cyan-500/10" },
  seminar: { icon: "🎓", gradient: "from-purple-500/10 to-pink-500/10" },
  fest: { icon: "🎉", gradient: "from-orange-500/10 to-yellow-500/10" },
  meetup: { icon: "👥", gradient: "from-green-500/10 to-emerald-500/10" },
  other: { icon: "📌", gradient: "from-gray-500/10 to-slate-500/10" },
};

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
  const [category, setCategory] = useState("workshop");

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== "organizer") return <Navigate to="/dashboard/participant" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = eventSchema.safeParse({ title, description, venue, event_date: eventDate, category });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    await createEvent.mutateAsync({
      title: parsed.data.title!,
      description: parsed.data.description!,
      venue: parsed.data.venue!,
      event_date: parsed.data.event_date!,
      category: parsed.data.category!,
    });
    setOpen(false);
    setTitle("");
    setDescription("");
    setVenue("");
    setEventDate("");
    setCategory("workshop");
  };

  const statusColors: Record<string, string> = {
    upcoming: "bg-primary/10 text-primary border-primary/20",
    ongoing: "bg-campus-coral/10 text-campus-coral border-campus-coral/20",
    completed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-campus-coral" />
              Organizer Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Create and manage your campus events</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Plus className="h-4 w-4" /> Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Create New Event
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Tech Talk: AI in Education" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date & Time</Label>
                    <Input 
                      id="date" 
                      type="datetime-local" 
                      value={eventDate} 
                      onChange={(e) => setEventDate(e.target.value)} 
                      required 
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input 
                    id="venue" 
                    placeholder="Auditorium A, Main Campus" 
                    value={venue} 
                    onChange={(e) => setVenue(e.target.value)} 
                    required 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea 
                    id="desc" 
                    placeholder="Describe the event..." 
                    rows={4} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    required 
                    className="resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={createEvent.isPending}>
                  {createEvent.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const catStyle = categoryConfig[event.category || "other"] || categoryConfig.other;
              return (
                <Card 
                  key={event.id} 
                  className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50"
                >
                  {/* Category gradient accent */}
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${catStyle.gradient.replace('/10', '/50')}`} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{catStyle.icon}</span>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${statusColors[event.status] || ""}`}>
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mt-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                        </div>
                        {format(new Date(event.event_date), "MMM d, yyyy · h:mm a")}
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-campus-coral/10 flex items-center justify-center">
                          <MapPin className="h-3.5 w-3.5 text-campus-coral" />
                        </div>
                        {event.venue}
                      </span>
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                          <Users className="h-3.5 w-3.5 text-accent-foreground" />
                        </div>
                        {event.registration_count || 0} registered
                      </span>
                    </div>
                    <Dialog open={viewEventId === event.id} onOpenChange={(v) => setViewEventId(v ? event.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2 group-hover:border-primary/50 transition-colors">
                          <Eye className="h-3.5 w-3.5" /> View Registrants
                        </Button>
                      </DialogTrigger>
                      <RegistrantsDialog eventId={event.id} eventTitle={event.title} />
                    </Dialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No events yet</h2>
            <p className="text-muted-foreground mb-6">Create your first event to get started.</p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
