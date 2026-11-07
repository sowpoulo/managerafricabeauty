import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useGetDashboardStats,
  useGetRevenueChart,
  useGetEmployeeRanking,
} from "@workspace/api-client-react";
import { formatEuro } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Scissors, ShoppingBag, ArrowUpRight, DollarSign, CalendarCheck } from "lucide-react";

type Period = "day" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = { day: "Aujourd'hui", week: "Cette semaine", month: "Ce mois" };

function StatCard({ label, value, icon: Icon, sub, color = "primary" }: { label: string; value: string; icon: React.ElementType; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color] || colorMap.primary}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function getMonthOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    };
  });
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [rankingPeriod, setRankingPeriod] = useState<Period>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthOptions = getMonthOptions();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["dashboard-stats", selectedMonth],
    queryFn: async () => {
      const token = localStorage.getItem("africa_beauty_token");
      const res = await fetch(`/api/dashboard/stats?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
  const { data: chartData, isLoading: chartLoading } = useGetRevenueChart(
    { period, month: selectedMonth } as any,
    { query: { enabled: true, queryKey: ["dashboard-chart", period, selectedMonth] } }
  );
  const { data: ranking } = useGetEmployeeRanking(
    { period: rankingPeriod, month: selectedMonth } as any,
    { query: { enabled: true, queryKey: ["dashboard-ranking", rankingPeriod, selectedMonth] } }
  );

  // Calcul du CA Global (Services + Produits)
  const totalRevenueMonth = (stats?.revenueMonth || 0) + ((stats as any)?.revenueProducts || 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de la performance de votre salon</p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground font-medium shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
        >
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Bannière CA Global */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <DollarSign className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-gray-400 font-medium mb-1">Chiffre d'Affaires Global ({monthOptions.find(m => m.value === selectedMonth)?.label})</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{formatEuro(totalRevenueMonth)}</h2>
          <div className="flex gap-6 mt-4 text-sm text-gray-300">
            <span className="flex items-center gap-1.5"><Scissors className="w-4 h-4 text-green-400" /> Services : {formatEuro(stats?.revenueMonth || 0)}</span>
            <span className="flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-blue-400" /> Produits : {formatEuro((stats as any)?.revenueProducts || 0)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-28 animate-pulse" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="CA Aujourd'hui" value={formatEuro(stats.revenueToday)} icon={TrendingUp} sub={`${stats.appointmentsToday} RDV`} color="green" />
          <StatCard label="CA Cette semaine" value={formatEuro(stats.revenueWeek)} icon={CalendarCheck} sub={`${stats.appointmentsWeek} RDV`} color="blue" />
          <StatCard label="Employées actives" value={String(stats.activeEmployees)} icon={Users} sub={`${stats.completionRate}% taux de complétion`} color="orange" />
          <StatCard label="Prestations ce mois" value={String(stats.appointmentsMonth)} icon={Scissors} sub="Rendez-vous terminés" color="purple" />
        </div>
      ) : null}

      {/* Revenue Chart & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart (Prend 2 colonnes sur 3) */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-semibold text-lg text-foreground">Évolution du Chiffre d'Affaires</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Basé sur les prestations terminées</p>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(["day", "week", "month"] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(value: number) => [formatEuro(value), "CA"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: "12px" }} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <BarChart className="w-8 h-8 opacity-20" />
              Aucune donnée pour cette période
            </div>
          )}
        </div>

        {/* Classement Employées (Prend 1 colonne sur 3) */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <div className="mb-6">
            <h2 className="font-semibold text-lg text-foreground">Top Employées</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Par chiffre d'affaires</p>
          </div>
          
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button key={p} onClick={() => setRankingPeriod(p)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${rankingPeriod === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {!ranking || ranking.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Aucune donnée disponible</div>
          ) : (
            <div className="space-y-5">
              {ranking.slice(0, 5).map((emp: any, idx: number) => (
                <div key={emp.employeeId} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0 ? "bg-amber-100 text-amber-700 border border-amber-300" : 
                    idx === 1 ? "bg-slate-200 text-slate-700 border border-slate-300" : 
                    idx === 2 ? "bg-orange-100 text-orange-700 border border-orange-300" : 
                    "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{emp.name}</span>
                      <span className="text-sm font-bold text-foreground ml-2 flex-shrink-0">{formatEuro(emp.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${emp.progressPercent}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
