import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, LayoutDashboard, Home, Calendar } from "lucide-react";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  const dashboardPath = profile?.role === "organizer" ? "/dashboard/organizer" : "/dashboard/participant";

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-campus-coral" />
          <span className="text-lg font-bold text-foreground">CampusEvents</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/" className={linkClass("/")}>
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link to="/events" className={linkClass("/events")}>
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </Link>
          <Link to={dashboardPath} className={linkClass(dashboardPath)}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="ml-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline capitalize">
              {profile?.full_name} ({profile?.role})
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
