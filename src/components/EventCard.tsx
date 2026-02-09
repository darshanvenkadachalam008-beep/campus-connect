import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  status: string;
  category?: string;
  organizer_name?: string;
  registration_count?: number;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  upcoming: { 
    bg: "bg-primary/10", 
    text: "text-primary", 
    border: "border-primary/20",
    dot: "bg-primary"
  },
  ongoing: { 
    bg: "bg-campus-coral/10", 
    text: "text-campus-coral", 
    border: "border-campus-coral/20",
    dot: "bg-campus-coral"
  },
  completed: { 
    bg: "bg-muted", 
    text: "text-muted-foreground", 
    border: "border-border",
    dot: "bg-muted-foreground"
  },
};

const categoryConfig: Record<string, { icon: string; gradient: string }> = {
  workshop: { icon: "🛠️", gradient: "from-blue-500/20 to-cyan-500/20" },
  seminar: { icon: "🎓", gradient: "from-purple-500/20 to-pink-500/20" },
  fest: { icon: "🎉", gradient: "from-orange-500/20 to-yellow-500/20" },
  meetup: { icon: "👥", gradient: "from-green-500/20 to-emerald-500/20" },
  other: { icon: "📌", gradient: "from-gray-500/20 to-slate-500/20" },
};

export default function EventCard({
  id, title, description, venue, event_date, status, category = "other", organizer_name, registration_count,
}: EventCardProps) {
  const statusStyle = statusConfig[status] || statusConfig.upcoming;
  const categoryStyle = categoryConfig[category] || categoryConfig.other;

  return (
    <Link to={`/events/${id}`} className="block group">
      <Card className="relative h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 bg-card/80 backdrop-blur-sm border-border/50">
        {/* Category gradient accent */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${categoryStyle.gradient}`} />
        
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-campus-coral/5" />
        </div>

        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {/* Category badge */}
              <span className="text-lg" title={category}>
                {categoryStyle.icon}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} mr-1.5 animate-pulse`} />
                {status}
              </Badge>
            </div>
          </div>
          
          <h3 className="font-bold text-lg text-card-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-snug">
            {title}
          </h3>
          
          {organizer_name && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              by {organizer_name}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4 relative">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground group/item hover:text-foreground transition-colors">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium">
                {format(new Date(event_date), "MMM d, yyyy · h:mm a")}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground group/item hover:text-foreground transition-colors">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-campus-coral/10 group-hover/item:bg-campus-coral/20 transition-colors">
                <MapPin className="h-3.5 w-3.5 text-campus-coral" />
              </div>
              <span className="font-medium truncate">{venue}</span>
            </div>
            
          {registration_count !== undefined && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground group/item hover:text-foreground transition-colors">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent group-hover/item:bg-accent/80 transition-colors">
                  <Users className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
                <span className="font-medium">
                  {registration_count} {registration_count === 1 ? "registration" : "registrations"}
                </span>
              </div>
            )}
          </div>

          {/* Category label */}
          <div className="pt-2 border-t border-border/50">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {category}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
