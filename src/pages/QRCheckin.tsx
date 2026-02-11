import { useState, useEffect } from "react";
import { useSearchParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckin } from "@/hooks/useAttendance";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, QrCode, ArrowLeft } from "lucide-react";

export default function QRCheckin() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const checkin = useCheckin();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const eventId = searchParams.get("eventId");
  const qrToken = searchParams.get("token");

  useEffect(() => {
    if (user && eventId && qrToken && status === "idle") {
      setStatus("processing");
      checkin.mutateAsync({ eventId, qrToken })
        .then((data) => {
          setStatus("success");
          setMessage(`Successfully checked in to "${data.eventTitle}"!`);
        })
        .catch((err) => {
          setStatus("error");
          setMessage(err.message || "Check-in failed");
        });
    }
  }, [user, eventId, qrToken]);

  if (loading) return null;
  if (!user) return <Navigate to={`/auth?redirect=/checkin?eventId=${eventId}&token=${qrToken}`} replace />;

  if (!eventId || !qrToken) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-md py-12">
          <Card className="text-center p-8">
            <QrCode className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid QR Code</h2>
            <p className="text-muted-foreground text-sm">This QR code is invalid or expired. Please scan a valid event QR code.</p>
            <Link to="/events">
              <Button className="mt-4 gap-2"><ArrowLeft className="h-4 w-4" /> Browse Events</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-md py-12">
        <Card className="overflow-hidden">
          <div className={`h-2 ${status === "success" ? "bg-campus-success" : status === "error" ? "bg-destructive" : "bg-primary"}`} />
          <CardContent className="p-8 text-center">
            {status === "processing" && (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Checking you in...</h2>
                <p className="text-muted-foreground text-sm">Verifying your registration and QR code</p>
              </>
            )}
            {status === "success" && (
              <>
                <div className="w-20 h-20 mx-auto bg-campus-success/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-campus-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">You're In! 🎉</h2>
                <p className="text-muted-foreground">{message}</p>
                <Link to="/dashboard/participant">
                  <Button className="mt-6 gap-2"><ArrowLeft className="h-4 w-4" /> Go to Dashboard</Button>
                </Link>
              </>
            )}
            {status === "error" && (
              <>
                <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Check-in Failed</h2>
                <p className="text-muted-foreground">{message}</p>
                <Link to="/events">
                  <Button variant="outline" className="mt-6 gap-2"><ArrowLeft className="h-4 w-4" /> Browse Events</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
