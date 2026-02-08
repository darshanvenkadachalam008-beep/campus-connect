import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  status: string;
  organizer_name?: string;
  registration_count?: number;
}

const statusColors: Record<string, string> = {
  upcoming: "bg-primary/10 text-primary border-primary/20",
  ongoing: "bg-campus-coral/10 text-campus-coral border-campus-coral/20",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function EventCard({
  id, title, description, venue, event_date, status, organizer_name, registration_count,
}: EventCardProps) {
  return (
    <Link to={`/events/${id}`}>
      <Card className="group h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
            <Badge variant="outline" className={`shrink-0 text-xs ${statusColors[status] || ""}`}>
              {status}
            </Badge>
          </div>
          {organizer_name && (
            <p className="text-xs text-muted-foreground">by {organizer_name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(event_date), "MMM d, yyyy · h:mm a")}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {venue}
            </span>
            {registration_count !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {registration_count} registered
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
