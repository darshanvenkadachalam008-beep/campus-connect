import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEvents, useCreateEvent, useEventRegistrants } from "@/hooks/useEvents";
import { useAIGenerateDescription, useAIDetectConflicts } from "@/hooks/useAI";
import { useAllEvents } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, MapPin, Users, Eye, Sparkles, BarChart3, AlertTriangle, Wand2 } from "lucide-react";
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
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : registrants && registrants.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {registrants.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
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
  const { data: allEvents } = useAllEvents();
  const createEvent = useCreateEvent();
  const generateDesc = useAIGenerateDescription();
  const detectConflicts = useAIDetectConflicts();
  const [open, setOpen] = useState(false);
  const [viewEventId, setViewEventId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState("workshop");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [regDeadline, setRegDeadline] = useState("");

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== "organizer") return <Navigate to="/dashboard/participant" replace />;

  const handleAIGenerate = async () => {
    if (!title) { toast.error("Enter a title first"); return; }
    const result = await generateDesc.mutateAsync({ title, category, venue: venue || "TBD" });
    setDescription(result);
    toast.success("AI description generated!");
  };

  const handleConflictCheck = async () => {
    if (!eventDate || !venue) { toast.error("Set date and venue first"); return; }
    const result = await detectConflicts.mutateAsync({
      newEvent: { title, category, venue, event_date: eventDate },
      existingEvents: allEvents || [],
    });
    setConflicts(result);
    if (result.hasConflict) {
      toast.warning("Potential conflicts detected!");
    } else {
      toast.success("No conflicts found!");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = eventSchema.safeParse({ title, description, venue, event_date: eventDate, category });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    await createEvent.mutateAsync({
      title: parsed.data.title,
      description: parsed.data.description,
      venue: parsed.data.venue,
      event_date: parsed.data.event_date,
      category: parsed.data.category,
      max_capacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      registration_deadline: regDeadline || undefined,
    });
    setOpen(false);
    setTitle(""); setDescription(""); setVenue(""); setEventDate(""); setCategory("workshop"); setMaxCapacity(""); setRegDeadline(""); setConflicts(null);
  };

  const statusColors: Record<string, string> = {
    upcoming: "bg-primary/10 text-primary border-primary/20",
    ongoing: "bg-campus-coral/10 text-campus-coral border-campus-coral/20",
    completed: "bg-muted text-muted-foreground border-border",
    draft: "bg-muted text-muted-foreground border-border",
    registration_closed: "bg-campus-gold/10 text-campus-gold border-campus-gold/20",
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
          <div className="flex gap-2">
            <Link to="/dashboard/organizer/analytics">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Analytics
              </Button>
            </Link>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConflicts(null); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Create New Event
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input id="title" placeholder="Tech Talk: AI in Education" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <span className="flex items-center gap-2"><span>{cat.icon}</span><span>{cat.label}</span></span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date & Time</Label>
                      <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input placeholder="Auditorium A, Main Campus" value={venue} onChange={(e) => setVenue(e.target.value)} required className="h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Capacity <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input type="number" min="1" placeholder="e.g. 100" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Reg. Deadline <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input type="datetime-local" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Description</Label>
                      <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs text-primary" onClick={handleAIGenerate} disabled={generateDesc.isPending}>
                        {generateDesc.isPending ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        AI Generate
                      </Button>
                    </div>
                    <Textarea placeholder="Describe the event..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required className="resize-none" />
                  </div>

                  {/* Conflict Check */}
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleConflictCheck} disabled={detectConflicts.isPending}>
                    {detectConflicts.isPending ? <div className="w-3 h-3 border-2 border-border/30 border-t-foreground rounded-full animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                    Check for Conflicts
                  </Button>

                  {conflicts && (
                    <div className={`p-3 rounded-lg text-sm ${conflicts.hasConflict ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-campus-success/10 text-campus-success border border-campus-success/20"}`}>
                      {conflicts.hasConflict ? (
                        <>
                          <p className="font-medium mb-1">⚠️ Conflicts Detected:</p>
                          {conflicts.conflicts?.map((c: any, i: number) => (
                            <p key={i} className="text-xs">• {c.eventTitle}: {c.reason}</p>
                          ))}
                          {conflicts.suggestion && <p className="text-xs mt-2 font-medium">💡 {conflicts.suggestion}</p>}
                        </>
                      ) : (
                        <p>✅ No conflicts found! {conflicts.suggestion}</p>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-11" disabled={createEvent.isPending}>
                    {createEvent.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : "Create Event"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-56 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const catStyle = categoryConfig[event.category || "other"] || categoryConfig.other;
              return (
                <Card key={event.id} className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${catStyle.gradient.replace('/10', '/50')}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{catStyle.icon}</span>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${statusColors[event.status] || ""}`}>
                          {event.status?.replace("_", " ")}
                        </Badge>
                      </div>
                      {event.max_capacity && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {event.registration_count || 0}/{event.max_capacity}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mt-2 group-hover:text-primary transition-colors">{event.title}</CardTitle>
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
                        <Button variant="outline" size="sm" className="w-full gap-2">
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
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Event</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
