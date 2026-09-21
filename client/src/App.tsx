import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import ResetPassword from "./pages/ResetPassword";
import MfaLogin from "./pages/MfaLogin";
import MfaSetup from "./pages/MfaSetup";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

// ── Auth guard: redirect unauthenticated users to /login ─────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.localAuth.me.useQuery();

  useEffect(() => {
    if (isLoading) return;
    const publicPaths = ["/login", "/login/mfa", "/reset-password"];
    if (!user && !publicPaths.some(p => location.startsWith(p))) {
      setLocation("/login");
    }
    if (user && user.mustChangePassword && location !== "/change-password") {
      setLocation("/change-password");
    }
    if (user && !user.mustChangePassword && ["admin", "owner"].includes(user.role) && !user.mfaEnabled && location !== "/security/setup") {
      setLocation("/security/setup");
    }
    if (user && !user.mustChangePassword && location === "/login") {
      setLocation("/");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.97 0.008 85)" }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, oklch(0.75 0.14 75), oklch(0.65 0.12 75))" }}
          >
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "oklch(0.18 0.06 155)" }}>TA</span>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "oklch(0.50 0.04 155)" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AuthGuard>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/login"} component={Login} />
        <Route path={"/login/mfa"} component={MfaLogin} />
        <Route path={"/security/setup"} component={MfaSetup} />
        <Route path={"/change-password"} component={ChangePassword} />
        <Route path={"/reset-password"} component={ResetPassword} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <DashboardProvider>
            <Router />
          </DashboardProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
