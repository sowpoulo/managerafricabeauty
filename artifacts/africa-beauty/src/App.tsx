import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import AppointmentsPage from "@/pages/appointments";
import EmployeesPage from "@/pages/employees";
import ServicesPage from "@/pages/services";
import SettingsPage from "@/pages/settings";
import MySchedulePage from "@/pages/my-schedule";
import MyStatsPage from "@/pages/my-stats";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children, managerOnly = false }: { children: React.ReactNode; managerOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (managerOnly && user.role !== "MANAGER") return <Redirect to="/my-schedule" />;

  return <Layout>{children}</Layout>;
}

function RouterContent() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        {user ? (
          user.role === "MANAGER"
            ? <Redirect to="/dashboard" />
            : <Redirect to="/my-schedule" />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute managerOnly>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/appointments">
        <ProtectedRoute managerOnly>
          <AppointmentsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/employees">
        <ProtectedRoute managerOnly>
          <EmployeesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/services">
        <ProtectedRoute managerOnly>
          <ServicesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute managerOnly>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/my-schedule">
        <ProtectedRoute>
          <MySchedulePage />
        </ProtectedRoute>
      </Route>
      <Route path="/my-stats">
        <ProtectedRoute>
          <MyStatsPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <RouterContent />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
