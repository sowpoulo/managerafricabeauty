import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEuro } from "@/lib/format";
import { TrendingUp, Calendar, Award, Search } from "lucide-react";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("africa_beauty_token");
}

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function StatCard({ label, revenue, appointments, icon: Icon }: {
  label: string; revenue: number; appointments: number; icon: React.ElementType;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{formatEuro(revenue)}</p>
      <p className="text-sm text-muted-foreground mt-1">{appointments} rendez-vous</p>
    </div>
  );
}

function getMonthOptions() {
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    };
  });
}

export default function MyStatsPage() {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMode, setFilterMode] = useState<"month" | "custom">("month");

  // Stats globales (aujourd'hui/semaine/mois courant)
  const { data: stats, isLoading } = useQuery({
    queryKey: ["my-stats"],
    queryFn: () => apiFetch("/dashboard/my-stats"),
  });

  // Stats période personnalisée
  const { data: customStats, isLoading: customLoading, refetch } = useQuery({
    queryKey: ["my-stats-custom", selectedMonth, dateFrom, dateTo, filterMode],
    queryFn: () => {
      if (filterMode === "month") {
        return apiFetch(`/dashboard/my-stats-period?month=${selectedMonth}`);
      } else {
        if (!dateFrom || !dateTo) return null;
        return apiFetch(`/dashboard/my-stats-period?from=${dateFrom}&to=${dateTo}`);
      }
    },
    enabled: filterMode === "month" || (!!dateFrom && !!dateTo),
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes statistiques</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Mon chiffre d'affaires personnel</p>
      </div>

      {/* KPI du jour/semaine/mois courant */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-36 animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Aujourd'hui" revenue={stats.revenueToday} appointments={stats.appointmentsToday} icon={Calendar} />
          <StatCard label="Cette semaine" revenue={stats.revenueWeek} appointments={stats.appointmentsWeek} icon={TrendingUp} />
          <StatCard label="Ce mois" revenue={stats.revenueMonth} appointments={stats.appointmentsMonth} icon={Award} />
        </div>
      ) : null}

      {/* Filtre période personnalisée */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          Rechercher par période
        </h2>

        {/* Toggle mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode("month")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterMode === "month" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Par mois
          </button>
          <button
            onClick={() => setFilterMode("custom")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterMode === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Dates personnalisées
          </button>
        </div>

        {filterMode === "month" ? (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date début</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date fin</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
              />
            </div>
          </div>
        )}

        {/* Résultats */}
        {customLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Chargement...</div>
        ) : customStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{formatEuro(customStats.revenue || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Chiffre d'affaires</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{customStats.appointments || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Rendez-vous</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {customStats.appointments > 0 ? formatEuro((customStats.revenue || 0) / customStats.appointments) : formatEuro(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Panier moyen</p>
            </div>
          </div>
        ) : filterMode === "custom" && (!dateFrom || !dateTo) ? (
          <p className="text-sm text-muted-foreground text-center py-2">Sélectionnez une date de début et de fin</p>
        ) : null}
      </div>
    </div>
  );
}
