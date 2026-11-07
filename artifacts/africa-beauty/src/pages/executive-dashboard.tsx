import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, Search, Building2, ArrowUpRight, TrendingUp, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("africa_beauty_token");

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface EmployeeStat {
  id: number;
  name: string;
  email: string;
  active: boolean;
  salonName: string;
  jobTitle: string;
  revenueMonth: number;
  appointmentsMonth: number;
}

export default function ExecutiveDashboardPage() {
  const [search, setSearch] = useState("");
  
  const { data: employees, isLoading } = useQuery({
    queryKey: ["executive-employees"],
    queryFn: () => apiFetch("/executive/employees-overview"),
  });

  const filteredEmployees = employees?.filter((e: EmployeeStat) => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.salonName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Vue Direction — Équipe</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Surveillez les performances de toutes vos employées (tous salons confondus).
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher une employée..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 bg-card"
          />
        </div>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
          <p className="text-xs md:text-sm text-muted-foreground font-medium">Total Équipe</p>
          <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{employees?.length || 0}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
          <p className="text-xs md:text-sm text-muted-foreground font-medium">Employées Actives</p>
          <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">{employees?.filter((e: any) => e.active).length || 0}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
          <p className="text-xs md:text-sm text-muted-foreground font-medium">CA Mensuel Équipe</p>
          <p className="text-xl md:text-2xl font-bold text-primary mt-1">
            {formatEuro(employees?.reduce((sum: number, e: any) => sum + e.revenueMonth, 0) || 0)}
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
          <p className="text-xs md:text-sm text-muted-foreground font-medium">Total Prestations</p>
          <p className="text-xl md:text-2xl font-bold text-foreground mt-1">
            {employees?.reduce((sum: number, e: any) => sum + e.appointmentsMonth, 0) || 0}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground">Chargement des données...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground bg-card rounded-xl border border-border">Aucune employée trouvée.</div>
      ) : (
        <>
          {/* VUE MOBILE (Cartes) */}
          <div className="md:hidden space-y-3">
            {filteredEmployees.map((emp: EmployeeStat) => (
              <div key={emp.id} className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${emp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {emp.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-muted-foreground">
                    <Building2 className="w-3 h-3" /> {emp.salonName}
                  </span>
                  <span className="bg-muted px-2 py-1 rounded text-muted-foreground">
                    {emp.jobTitle}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">CA (Mois)</p>
                    <p className="font-bold text-primary">{formatEuro(emp.revenueMonth)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">RDV</p>
                    <p className="font-bold text-foreground">{emp.appointmentsMonth}</p>
                  </div>
                  <Link href={`/employees/${emp.id}`} className="p-2 bg-primary/10 rounded-lg text-primary">
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* VUE ORDINATEUR (Tableau) */}
          <div className="hidden md:block bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Employée</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Salon</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Poste</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">CA (Mois)</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">RDV (Mois)</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp: EmployeeStat) => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="font-medium text-sm text-foreground">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        <Building2 className="w-3 h-3" /> {emp.salonName}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{emp.jobTitle}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${emp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="font-semibold text-sm text-foreground">{formatEuro(emp.revenueMonth)}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="text-sm text-muted-foreground">{emp.appointmentsMonth}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/employees/${emp.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                        Voir dossier <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
