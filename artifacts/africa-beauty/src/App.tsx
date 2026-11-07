import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import EmployeeProfilePage from "@/pages/employee-profile";
import DashboardPage from "@/pages/dashboard";
import AppointmentsPage from "@/pages/appointments";
import EmployeesPage from "@/pages/employees";
import ServicesPage from "@/pages/services";
import SettingsPage from "@/pages/settings";
import MySchedulePage from "@/pages/my-schedule";
import MyStatsPage from "@/pages/my-stats";
import NotFound from "@/pages/not-found";
import RecognitionPage from "@/pages/recognition";
import PayrollPage from "@/pages/payroll";
import AbsencesPage from "@/pages/absences";
import CreditsPage from "@/pages/credits";
import StockPage from "@/pages/stock";
import StockSalesPage from "@/pages/stock-sales";
import ContractsPage from "@/pages/contracts";
import DocumentsPage from "@/pages/documents";
import ExpenseFormsPage from "@/pages/expense-forms";
import ClientsPage from "@/pages/clients";
import ExecutiveDashboardPage from "@/pages/executive-dashboard";
import ExpensesPage from "@/pages/expenses";
import AccountingDashboardPage from "@/pages/accounting-dashboard";
import BankImportPage from "@/pages/bank-import";
import BankReconcilePage from "@/pages/bank-reconcile";
import LoyaltyPage from "@/pages/loyalty";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children, managerOnly = false }: { children: React.ReactNode; managerOnly?: boolean }) {
  const { user, isLoading } = useAuth();

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
          user.role === "DIRECTION"
            ? <Redirect to="/executive" />
            : user.role === "MANAGER"
            ? <Redirect to="/dashboard" />
            : <Redirect to="/my-schedule" />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
      <Route path="/executive">
        <ProtectedRoute>
          <ExecutiveDashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute managerOnly>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute managerOnly>
          <ClientsPage />
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
      <Route path="/recognition">
        <ProtectedRoute>
          <RecognitionPage />
        </ProtectedRoute>
      </Route>
      <Route path="/payroll">
        <ProtectedRoute managerOnly>
          <PayrollPage />
        </ProtectedRoute>
      </Route>
      <Route path="/absences">
        <ProtectedRoute>
          <AbsencesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/credits">
        <ProtectedRoute>
          <CreditsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/stock">
        <ProtectedRoute managerOnly>
          <StockPage />
        </ProtectedRoute>
      </Route>
      <Route path="/stock-sales">
        <ProtectedRoute managerOnly>
          <StockSalesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/contracts">
      <Route path="/documents">
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        <ProtectedRoute managerOnly>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
          <DocumentsPage />
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        </ProtectedRoute>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      </Route>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        <ProtectedRoute managerOnly>
      <Route path="/documents">
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        <ProtectedRoute managerOnly>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
          <DocumentsPage />
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        </ProtectedRoute>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      </Route>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
          <ContractsPage />
      <Route path="/documents">
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        <ProtectedRoute managerOnly>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
          <DocumentsPage />
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        </ProtectedRoute>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      </Route>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        </ProtectedRoute>
      <Route path="/documents">
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        <ProtectedRoute managerOnly>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
          <DocumentsPage />
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        </ProtectedRoute>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      </Route>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      </Route>
      <Route path="/documents">
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        <ProtectedRoute managerOnly>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
          <DocumentsPage />
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
        </ProtectedRoute>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      </Route>
      <Route path="/expense-forms">
        <ProtectedRoute managerOnly>
          <ExpenseFormsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/expenses">
        <ProtectedRoute managerOnly>
          <ExpensesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/accounting">
        <ProtectedRoute managerOnly>
          <AccountingDashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/bank-import">
        <ProtectedRoute managerOnly>
          <BankImportPage />
        </ProtectedRoute>
      </Route>
      <Route path="/bank-reconcile">
        <ProtectedRoute managerOnly>
          <BankReconcilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/loyalty">
        <ProtectedRoute managerOnly>
          <LoyaltyPage />
        </ProtectedRoute>
      </Route>
            <Route path="/employees/:id">
        <ProtectedRoute managerOnly>
          <EmployeeProfilePage />
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
