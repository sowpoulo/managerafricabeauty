import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Scissors, 
  Settings, 
  LogOut,
  Calendar,
  BarChart
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { role, user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const managerLinks = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/appointments", label: "Rendez-vous", icon: CalendarDays },
    { href: "/employees", label: "Employés", icon: Users },
    { href: "/services", label: "Prestations", icon: Scissors },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ];

  const employeeLinks = [
    { href: "/my-schedule", label: "Mon planning", icon: Calendar },
    { href: "/my-stats", label: "Mes statistiques", icon: BarChart },
  ];

  const links = role === "MANAGER" ? managerLinks : employeeLinks;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-serif font-bold text-sidebar-primary-foreground tracking-tight">
            AfricaBeauty
          </h1>
          {user && (
            <div className="mt-4 text-sm text-sidebar-foreground/70">
              {user.name} <span className="opacity-50">({role === "MANAGER" ? "Manager" : "Employé"})</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
