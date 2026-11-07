import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, CalendarDays, Users, Scissors, Settings, LogOut,
  Calendar, BarChart, Menu, X, Heart, Wallet, CalendarOff, CreditCard,
  Building2, Bell, Receipt, Banknote, Link2, ShoppingBag, ShoppingCart,
  FileSignature, FileCheck, FileSpreadsheet, Contact
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  // On force l'affichage selon le rôle stocké dans l'utilisateur
  const isManager = user?.role === "MANAGER";

  const managerLinks = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/appointments", label: "Rendez-vous", icon: CalendarDays },
    { href: "/clients", label: "Clientes", icon: Contact },
    { href: "/employees", label: "Employés", icon: Users },
    { href: "/services", label: "Prestations", icon: Scissors },
    { href: "/payments", label: "Paiements", icon: Wallet },
    { href: "/payroll", label: "Paie", icon: Wallet },
    { href: "/absences", label: "Congés", icon: CalendarOff },
    { href: "/stock", label: "Stock", icon: ShoppingBag },
    { href: "/stock-sales", label: "Ventes produits", icon: ShoppingCart },
    { href: "/contracts", label: "Contrats", icon: FileSignature },
    { href: "/documents", label: "Documents", icon: FileCheck },
    { href: "/expenses", label: "Dépenses", icon: Receipt },
    { href: "/accounting", label: "Comptabilité", icon: Building2 },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ];

  const employeeLinks = [
    { href: "/my-schedule", label: "Mon planning", icon: Calendar },
    { href: "/my-stats", label: "Mes statistiques", icon: BarChart },
    { href: "/recognition", label: "Reconnaissance", icon: Heart },
    { href: "/absences", label: "Congés", icon: CalendarOff },
  ];

  const links = isManager ? managerLinks : employeeLinks;

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-serif font-bold text-sidebar-primary-foreground tracking-tight">
          AfricaBeauty
        </h1>
        {user && (
          <div className="mt-4 text-sm text-sidebar-foreground/70">
            {user.name} <span className="opacity-50">({isManager ? "Manager" : "Employé"})</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = window.location.pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
              }`}
            >
              <Icon className="h-4 w-4" />
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
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50 transform transition-transform duration-300 md:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <button
          className="absolute top-4 right-4 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <h1 className="text-lg font-serif font-bold text-sidebar-primary-foreground">
            AfricaBeauty
          </h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
