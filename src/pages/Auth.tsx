import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { GraduationCap, Users, Calendar, Sparkles, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(1, "Name is required").max(100),
  role: z.enum(["organizer", "participant"]),
});

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"organizer" | "participant">("participant");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setIsLoading(false);
    if (error) {
      if (error.message.includes("Invalid login")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ email: signupEmail, password: signupPassword, fullName, role });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName, parsed.data.role);
    setIsLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Try logging in.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Account created! You're now signed in.");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-campus-navy via-campus-navy/95 to-campus-coral/20" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-campus-coral/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      
      {/* Glass orbs for visual interest */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-campus-coral/20 rounded-full blur-2xl" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-campus-coral/30 rounded-xl blur-lg" />
                <div className="relative bg-gradient-to-br from-campus-coral to-campus-coral/80 p-3 rounded-xl shadow-lg">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Campus<span className="text-campus-coral">Events</span>
              </h1>
            </div>
            <p className="text-white/60 text-sm flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              Your smart campus event hub
            </p>
          </div>

          {/* Auth Card */}
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-2 bg-white/10 p-1">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-white data-[state=active]:text-campus-navy data-[state=active]:shadow-md text-white/70 transition-all duration-300"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-white data-[state=active]:text-campus-navy data-[state=active]:shadow-md text-white/70 transition-all duration-300"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-5 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-white/80 text-sm font-medium">Email</Label>
                      <div className="relative group">
                        <Input 
                          id="login-email" 
                          type="email" 
                          placeholder="you@campus.edu" 
                          value={loginEmail} 
                          onChange={(e) => setLoginEmail(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-campus-coral/50 transition-all duration-300 h-12"
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-campus-coral/20 to-primary/20 rounded-md blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-white/80 text-sm font-medium">Password</Label>
                      <div className="relative group">
                        <Input 
                          id="login-password" 
                          type="password" 
                          placeholder="••••••••" 
                          value={loginPassword} 
                          onChange={(e) => setLoginPassword(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-campus-coral/50 transition-all duration-300 h-12"
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-campus-coral/20 to-primary/20 rounded-md blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-campus-coral to-campus-coral/80 hover:from-campus-coral/90 hover:to-campus-coral/70 text-white font-semibold shadow-lg shadow-campus-coral/25 transition-all duration-300 hover:shadow-xl hover:shadow-campus-coral/30 hover:-translate-y-0.5 group" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Sign In
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-white/80 text-sm font-medium">Full Name</Label>
                      <div className="relative group">
                        <Input 
                          id="signup-name" 
                          placeholder="Jane Doe" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-campus-coral/50 transition-all duration-300 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-white/80 text-sm font-medium">Email</Label>
                      <div className="relative group">
                        <Input 
                          id="signup-email" 
                          type="email" 
                          placeholder="you@campus.edu" 
                          value={signupEmail} 
                          onChange={(e) => setSignupEmail(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-campus-coral/50 transition-all duration-300 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-white/80 text-sm font-medium">Password</Label>
                      <div className="relative group">
                        <Input 
                          id="signup-password" 
                          type="password" 
                          placeholder="Min 6 characters" 
                          value={signupPassword} 
                          onChange={(e) => setSignupPassword(e.target.value)} 
                          required 
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-campus-coral/50 transition-all duration-300 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-white/80 text-sm font-medium">I am a...</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRole("participant")}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden group ${
                            role === "participant" 
                              ? "border-campus-coral bg-campus-coral/20 shadow-lg shadow-campus-coral/20" 
                              : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                          }`}
                        >
                          {role === "participant" && (
                            <div className="absolute inset-0 bg-gradient-to-br from-campus-coral/10 to-transparent" />
                          )}
                          <Users className={`relative h-6 w-6 transition-colors ${role === "participant" ? "text-campus-coral" : "text-white/60"}`} />
                          <span className={`relative text-sm font-medium transition-colors ${role === "participant" ? "text-white" : "text-white/60"}`}>
                            Participant
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole("organizer")}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden group ${
                            role === "organizer" 
                              ? "border-campus-coral bg-campus-coral/20 shadow-lg shadow-campus-coral/20" 
                              : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                          }`}
                        >
                          {role === "organizer" && (
                            <div className="absolute inset-0 bg-gradient-to-br from-campus-coral/10 to-transparent" />
                          )}
                          <Calendar className={`relative h-6 w-6 transition-colors ${role === "organizer" ? "text-campus-coral" : "text-white/60"}`} />
                          <span className={`relative text-sm font-medium transition-colors ${role === "organizer" ? "text-white" : "text-white/60"}`}>
                            Organizer
                          </span>
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-campus-coral to-campus-coral/80 hover:from-campus-coral/90 hover:to-campus-coral/70 text-white font-semibold shadow-lg shadow-campus-coral/25 transition-all duration-300 hover:shadow-xl hover:shadow-campus-coral/30 hover:-translate-y-0.5 group mt-2" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Create Account
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
          
          {/* Footer text */}
          <p className="text-center text-white/40 text-xs mt-6">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
