import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerAnalytics } from "@/hooks/useAnalytics";
import { useAIPredictTurnout } from "@/hooks/useAI";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, Users, Eye, Calendar, ArrowLeft,
  Sparkles, Target, Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#6b7280"];

export default function OrganizerAnalytics() {
  const { user, profile, loading } = useAuth();
  const { data: analytics, isLoading } = useOrganizerAnalytics();
  const predictTurnout = useAIPredictTurnout();
  const [prediction, setPrediction] = useState<any>(null);
  const [predictingEventId, setPredictingEventId] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== "organizer") return <Navigate to="/dashboard/participant" replace />;

  const handlePredict = async (event: any) => {
    setPredictingEventId(event.id);
    try {
      const daysUntil = Math.max(0, Math.ceil((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const result = await predictTurnout.mutateAsync({
        eventTitle: event.title,
        category: event.category,
        registrationCount: event.registrations,
        maxCapacity: event.capacity,
        daysUntilEvent: daysUntil,
      });
      setPrediction({ eventId: event.id, ...result });
    } catch {
      toast.error("Failed to predict turnout");
    }
    setPredictingEventId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard/organizer">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">AI-powered insights for your events</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Events", value: analytics.stats.totalEvents, icon: Calendar, color: "text-primary" },
                { label: "Registrations", value: analytics.stats.totalRegistrations, icon: Users, color: "text-campus-coral" },
                { label: "Event Views", value: analytics.stats.totalViews, icon: Eye, color: "text-campus-teal" },
                { label: "Conversion", value: `${analytics.stats.conversionRate}%`, icon: Target, color: "text-campus-gold" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <TrendingUp className="h-4 w-4 text-campus-success" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Registration Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Registration Trend (30 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.dailyData && analytics.dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={analytics.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="registrations" stroke="hsl(220, 70%, 45%)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data yet</div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-campus-coral" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.categoryData && analytics.categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={analytics.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                          {analytics.categoryData.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Per-Event Table with AI Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-campus-teal" />
                  Event Performance & AI Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Event</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Registrations</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Views</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">Conversion</th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">AI Prediction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.eventStats?.map((event: any) => (
                        <tr key={event.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2">
                            <p className="font-medium text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{event.category}</p>
                          </td>
                          <td className="text-center py-3 px-2">
                            <Badge variant="outline" className="text-[10px] uppercase">{event.status}</Badge>
                          </td>
                          <td className="text-center py-3 px-2 font-medium">
                            {event.registrations}{event.capacity ? `/${event.capacity}` : ""}
                          </td>
                          <td className="text-center py-3 px-2">{event.views}</td>
                          <td className="text-center py-3 px-2">
                            <span className={`font-medium ${event.conversion > 50 ? "text-campus-success" : event.conversion > 20 ? "text-campus-gold" : "text-destructive"}`}>
                              {event.conversion}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-2">
                            {prediction?.eventId === event.id ? (
                              <div className="text-xs">
                                <span className="font-bold text-primary">{prediction.predictedTurnout}%</span>
                                <Badge variant="outline" className="ml-1 text-[9px]">{prediction.confidence}</Badge>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs gap-1"
                                onClick={() => handlePredict(event)}
                                disabled={predictingEventId === event.id}
                              >
                                {predictingEventId === event.id ? (
                                  <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                Predict
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
