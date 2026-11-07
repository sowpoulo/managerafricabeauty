import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Wallet, Receipt, Users, Building2, RefreshCw } from "lucide-react";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("africa_beauty_token");
}

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatMAD(n: number) {
  return new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " MAD";
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

function KpiCard({ label, value, icon: Icon, color = "blue", subtitle }: { label: string; value: string; icon: React.ElementType; color?: "blue" | "green" | "red" | "amber"; subtitle?: string }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function AccountingDashboardPage() {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const { data, isLoading } = useQuery({
    queryKey: ["accounting-dashboard", selectedMonth],
    queryFn: () => apiFetch(`/accounting/dashboard?month=${selectedMonth}`),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord comptable</h1>
          <p className="text-muted-foreground text-sm mt-0.5">P&L, TVA et indicateurs financiers</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground"
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={async () => {
            const token = getToken();
            const res = await fetch(`/api/bank/reconcile/auto?month=${selectedMonth}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            alert(`${data.matched} transactions rapprochées sur ${data.total}`);
            window.location.reload();
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Rapprochement auto
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Ligne 1 : CA, Dépenses, Salaires, Résultat */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Chiffre d'affaires"
              value={formatMAD(data.revenue)}
              icon={TrendingUp}
              color="green"
              subtitle={`TVA collectée : ${formatMAD(data.tvaCollected)}`}
            />
            <KpiCard
              label="Dépenses"
              value={formatMAD(data.totalExpenses)}
              icon={Receipt}
              color="red"
              subtitle={`TVA déductible : ${formatMAD(data.tvaDeductible)}`}
            />
            <KpiCard
              label="Masse salariale"
              value={formatMAD(data.totalSalaries)}
              icon={Users}
              color="amber"
            />
            <KpiCard
              label="Résultat net"
              value={formatMAD(data.netProfit)}
              icon={Wallet}
              color={data.netProfit >= 0 ? "green" : "red"}
            />
          </div>

          {/* Ligne 2 : TVA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">TVA collectée (20%)</p>
              <p className="text-xl font-bold text-green-600 mt-1">{formatMAD(data.tvaCollected)}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">TVA déductible</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{formatMAD(data.tvaDeductible)}</p>
            </div>
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm border-t-4 border-primary">
              <p className="text-sm text-muted-foreground font-medium">TVA nette à payer</p>
              <p className={`text-xl font-bold mt-1 ${data.tvaNet >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatMAD(data.tvaNet)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-10 text-muted-foreground">Aucune donnée pour ce mois</div>
      )}
    </div>
  );
}
