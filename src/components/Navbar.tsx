import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, useMarkAllRead } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GraduationCap, LogOut, LayoutDashboard, Home, Calendar, Bell } from "lucide-react";
import { format } from "date-fns";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const { data: notifications, unreadCount } = useNotifications();
  const markAllRead = useMarkAllRead();

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
          <span className="text-lg font-bold text-foreground">Campus<span className="text-campus-coral">Connect</span></span>
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

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-campus-coral text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAllRead.mutate()}>
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 10).map((n: any) => (
                    <div key={n.id} className={`p-3 border-b border-border/50 text-sm ${!n.read ? "bg-primary/5" : ""}`}>
                      <p className="font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {format(new Date(n.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
                )}
              </div>
            </PopoverContent>
          </Popover>

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
