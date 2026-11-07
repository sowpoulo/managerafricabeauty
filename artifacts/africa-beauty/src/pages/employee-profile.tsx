import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateSafe } from "@/lib/date-utils";
import { useRoute, Link } from "wouter";
import { 
  User, FileText, CalendarDays, TrendingUp, Target, 
  Mail, CheckCircle2, AlertCircle, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdUploader } from "@/components/id-uploader";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("africa_beauty_token");

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatMAD(n: number) {
  return new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " MAD";
}

function formatDate(d: string) {
  return formatDateSafe(d);
}

export default function EmployeeProfilePage() {
  const [, params] = useRoute("/employees/:id");
  const employeeId = params?.id;
  const [activeTab, setActiveTab] = useState("infos");
  const [perfFrom, setPerfFrom] = useState("");
  const [perfTo, setPerfTo] = useState("");

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["employee-profile", employeeId, perfFrom, perfTo],
    queryFn: () => {
      let url = `/employees/${employeeId}/profile`;
      const params = new URLSearchParams();
      if (perfFrom) params.append("from", perfFrom);
      if (perfTo) params.append("to", perfTo);
      if (params.toString()) url += `?${params.toString()}`;
      return apiFetch(url);
    },
    enabled: !!employeeId,
  });

  if (isLoading) return <div className="p-10 text-center">Chargement du dossier...</div>;
  if (!profile) return <div className="p-10 text-center text-red-500">Employé introuvable.</div>;

  const { employee, contract, documents, performance, absences } = profile;

  const tabs = [
    { id: "infos", label: "Informations", icon: User },
    { id: "documents", label: "Documents RH", icon: FileText },
    { id: "absences", label: "Présence & Absences", icon: CalendarDays },
    { id: "performance", label: "Performances", icon: TrendingUp },
    { id: "suivi", label: "Suivi professionnel", icon: Target },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <Link href="/employees">
        <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Button>
      </Link>

      <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl flex-shrink-0">
          {employee.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
          <p className="text-muted-foreground font-medium mt-1">
            {contract ? contract.job_title : "Poste non défini"} · Salon actuel
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {employee.email}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${employee.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {employee.active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {employee.active ? "Employée active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm min-h-[300px]">
        
        {activeTab === "infos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Informations personnelles</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nom complet</span><span className="font-medium">{employee.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{employee.email}</span></div>
                {contract && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date de naissance</span><span className="font-medium">{formatDate(contract.birth_date)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Nationalité</span><span className="font-medium">{contract.nationality || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pièce d'identité</span><span className="font-medium">{contract.id_type || "-"} {contract.id_number ? `(${contract.id_number})` : ""}</span></div>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Informations professionnelles</h3>
              <div className="space-y-3 text-sm">
                {contract ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type de contrat</span><span className="font-medium">{contract.contract_type}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date d'embauche</span><span className="font-medium">{formatDate(contract.start_date)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Salaire de base</span><span className="font-medium">{formatMAD(contract.base_salary)}</span></div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">Aucun contrat actif enregistré.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-8">
            {/* Section : Pièce d'identité */}
            <div>
              <h3 className="font-semibold border-b pb-2 mb-4">Pièce d'identité (Recto / Verso)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <IdUploader
                  employeeId={employee.id}
                  side="front"
                  label="Recto (Face avant)"
                  currentUrl={employee.id_front_url}
                  onUploaded={() => refetch()}
                />
                <IdUploader
                  employeeId={employee.id}
                  side="back"
                  label="Verso (Face arrière)"
                  currentUrl={employee.id_back_url}
                  onUploaded={() => refetch()}
                />
              </div>
            </div>

            {/* Section : Historique documents générés */}
            <div>
              <h3 className="font-semibold border-b pb-2 mb-4">Historique des documents générés</h3>
              {!documents?.length ? (
                <p className="text-muted-foreground italic text-sm">Aucun document n'a encore été généré pour cette employée.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg text-sm hover:bg-muted/20">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium">{doc.title}</span>
                      </div>
                      <span className="text-muted-foreground">{formatDate(doc.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "absences" && (
          <div>
            <h3 className="font-semibold border-b pb-2 mb-4">Historique des absences et congés</h3>
            {!absences?.length ? (
              <p className="text-muted-foreground italic text-sm">Aucune absence enregistrée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Début</th>
                    <th className="text-left p-2">Fin</th>
                    <th className="text-left p-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {absences.map((a: any) => (
                    <tr key={a.id}>
                      <td className="p-2 font-medium">{a.type}</td>
                      <td className="p-2">{formatDate(a.date_start)}</td>
                      <td className="p-2">{formatDate(a.date_end)}</td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'APPROVED' ? 'bg-green-100 text-green-700' : a.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
              <h3 className="font-semibold">Performances</h3>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Du</label>
                  <input
                    type="date"
                    value={perfFrom}
                    onChange={(e) => setPerfFrom(e.target.value)}
                    className="border border-border rounded-lg px-2 py-1 text-sm bg-background"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Au</label>
                  <input
                    type="date"
                    value={perfTo}
                    onChange={(e) => setPerfTo(e.target.value)}
                    className="border border-border rounded-lg px-2 py-1 text-sm bg-background"
                  />
                </div>
                {(perfFrom || perfTo) && (
                  <button
                    onClick={() => { setPerfFrom(""); setPerfTo(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground mt-4"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatMAD(performance.revenue30d)}</p>
              </div>
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm text-muted-foreground">Prestations réalisées</p>
                <p className="text-2xl font-bold text-foreground mt-1">{performance.appointments30d}</p>
              </div>
              <div className="p-4 bg-muted/20 rounded-lg border">
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatMAD(performance.appointments30d > 0 ? performance.revenue30d / performance.appointments30d : 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "suivi" && (
          <div>
            <h3 className="font-semibold border-b pb-2 mb-4">Suivi professionnel</h3>
            <div className="text-sm text-muted-foreground space-y-3">
              <p>Cette section centralisera :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>La fiche de poste signée (générable depuis le menu Documents).</li>
                <li>Les formations suivies.</li>
                <li>Les entretiens individuels.</li>
                <li>Les objectifs fixés par la direction.</li>
                <li>Les observations professionnelles.</li>
              </ul>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mt-4 text-orange-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <p>Cette partie nécessite des fonctionnalités supplémentaires (ajout de formations, entretiens, objectifs) que nous pourrons développer plus tard si vous le souhaitez.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
