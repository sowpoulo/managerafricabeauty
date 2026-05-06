import { useGetMyStats } from "@workspace/api-client-react";
import { formatEuro } from "@/lib/format";
import { TrendingUp, Calendar, Award } from "lucide-react";

function StatCard({ label, revenue, appointments, icon: Icon }: {
  label: string;
  revenue: number;
  appointments: number;
  icon: React.ElementType;
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

export default function MyStatsPage() {
  const { data: stats, isLoading } = useGetMyStats();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes statistiques</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Mon chiffre d'affaires personnel</p>
      </div>

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

      {stats && (
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Resume mensuel</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">CA mensuel</p>
              <p className="text-2xl font-bold text-primary">{formatEuro(stats.revenueMonth)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">RDV ce mois</p>
              <p className="text-2xl font-bold text-foreground">{stats.appointmentsMonth}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Panier moyen</p>
              <p className="text-xl font-semibold text-foreground">
                {stats.appointmentsMonth > 0 ? formatEuro(stats.revenueMonth / stats.appointmentsMonth) : formatEuro(0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">RDV semaine</p>
              <p className="text-xl font-semibold text-foreground">{stats.appointmentsWeek}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
