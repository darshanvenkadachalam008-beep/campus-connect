import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAllEvents } from "@/hooks/useEvents";
import Navbar from "@/components/Navbar";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All", icon: "📋" },
  { value: "workshop", label: "Workshop", icon: "🛠️" },
  { value: "seminar", label: "Seminar", icon: "🎓" },
  { value: "fest", label: "Fest", icon: "🎉" },
  { value: "meetup", label: "Meetup", icon: "👥" },
  { value: "other", label: "Other", icon: "📌" },
];

export default function Events() {
  const { user, loading } = useAuth();
  const { data: events, isLoading } = useAllEvents();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = search.toLowerCase();
    return events.filter((e) => {
      const matchesSearch = 
        e.title.toLowerCase().includes(q) || 
        e.venue.toLowerCase().includes(q) || 
        e.description.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [events, search, categoryFilter]);

  const byStatus = (status: string) => filtered.filter((e) => e.status === status);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Events</h1>
              <p className="text-muted-foreground mt-1">Discover and join campus events</p>
            </div>
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search events..." 
                className="pl-10 h-11 bg-card/50 border-border/50 focus:bg-card focus:border-primary/50 transition-all" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground mr-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={categoryFilter === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat.value)}
                className={`gap-1.5 transition-all duration-200 ${
                  categoryFilter === cat.value 
                    ? "shadow-md" 
                    : "hover:bg-accent/50"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {cat.value !== "all" && events && (
                  <span className={`ml-1 text-xs ${
                    categoryFilter === cat.value 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  }`}>
                    ({events.filter(e => e.category === cat.value).length})
                  </span>
                )}
              </Button>
            ))}
            {categoryFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="mb-6 bg-muted/50">
            <TabsTrigger value="all" className="data-[state=active]:shadow-sm">
              All ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:shadow-sm">
              Upcoming ({byStatus("upcoming").length})
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="data-[state=active]:shadow-sm">
              Ongoing ({byStatus("ongoing").length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:shadow-sm">
              Completed ({byStatus("completed").length})
            </TabsTrigger>
          </TabsList>

          {["all", "upcoming", "ongoing", "completed"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(tab === "all" ? filtered : byStatus(tab)).map((event) => (
                    <EventCard key={event.id} {...event} />
                  ))}
                </div>
              )}
              {!isLoading && (tab === "all" ? filtered : byStatus(tab)).length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No events found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
