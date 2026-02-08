import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAllEvents } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

export default function Events() {
  const { user, loading } = useAuth();
  const { data: events, isLoading } = useAllEvents();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = search.toLowerCase();
    return events.filter(
      (e) => e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    );
  }, [events, search]);

  const byStatus = (status: string) => filtered.filter((e) => e.status === status);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">All Events</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search events..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({byStatus("upcoming").length})</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing ({byStatus("ongoing").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({byStatus("completed").length})</TabsTrigger>
          </TabsList>

          {["all", "upcoming", "ongoing", "completed"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading events...</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {(tab === "all" ? filtered : byStatus(tab)).map((event) => (
                    <EventCard key={event.id} {...event} />
                  ))}
                </div>
              )}
              {!isLoading && (tab === "all" ? filtered : byStatus(tab)).length === 0 && (
                <p className="text-center py-12 text-muted-foreground">No events found.</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
