import { useState } from "react";
import {
  useGetDashboardStats,
  useGetRevenueChart,
  useGetEmployeeRanking,
} from "@workspace/api-client-react";
import { formatEuro } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Calendar, Users, CheckCircle } from "lucide-react";

type Period = "day" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [rankingPeriod, setRankingPeriod] = useState<Period>("month");

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: chartData, isLoading: chartLoading } = useGetRevenueChart(
    { period },
    { query: { enabled: true } }
  );
  const { data: ranking } = useGetEmployeeRanking(
    { period: rankingPeriod },
    { query: { enabled: true } }
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Vue d'ensemble de votre salon</p>
      </div>

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="CA Aujourd'hui"
            value={formatEuro(stats.revenueToday)}
            icon={TrendingUp}
            sub={`${stats.appointmentsToday} RDV`}
          />
          <StatCard
            label="CA Cette semaine"
            value={formatEuro(stats.revenueWeek)}
            icon={TrendingUp}
            sub={`${stats.appointmentsWeek} RDV`}
          />
          <StatCard
            label="CA Ce mois"
            value={formatEuro(stats.revenueMonth)}
            icon={TrendingUp}
            sub={`${stats.appointmentsMonth} RDV`}
          />
          <StatCard
            label="Employées actives"
            value={String(stats.activeEmployees)}
            icon={Users}
            sub={`${stats.completionRate}% taux complétion`}
          />
        </div>
      ) : null}

      {/* Revenue Chart */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-foreground">Chiffre d'affaires</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Jours avec CA uniquement</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {chartLoading ? (
          <div className="h-56 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                formatter={(value: number) => [formatEuro(value), "CA"]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            Aucune donnée pour cette période
          </div>
        )}
      </div>

      {/* Employee Ranking */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-foreground">Classement des employées</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Par chiffre d'affaires</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["day", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setRankingPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  rankingPeriod === p
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {!ranking || ranking.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <div className="space-y-4">
            {ranking.map((emp, idx) => (
              <div key={emp.employeeId} className="flex items-center gap-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  idx === 0 ? "bg-accent text-accent-foreground" :
                  idx === 1 ? "bg-muted-foreground/20 text-muted-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground truncate">{emp.name}</span>
                    <span className="text-sm font-bold text-foreground ml-2 flex-shrink-0">{formatEuro(emp.revenue)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${emp.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{emp.appointments} RDV</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
