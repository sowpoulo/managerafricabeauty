import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateSafe } from "@/lib/date-utils";
import { Plus, FileText, Pencil, XCircle, CheckCircle, Download, Trash2 } from "lucide-react";
import { generateContractPDF as generateFullContractPDF } from "@/lib/contract-template";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("africa_beauty_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Contract {
  id: number;
  employeeId: number;
  employeeName: string;
  contractType: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  trialPeriodMonths: number;
  baseSalary: number;
  workingHours: number;
  status: string;
  birthDate?: string;
  nationality?: string;
  passportNumber?: string;
  idType?: string;
  idNumber?: string;
  gender?: string;
}

interface Employee {
  id: number;
  name: string;
}

const CONTRACT_TYPES = ["CDI", "CDD", "STAGE", "FREELANCE"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Actif", color: "bg-green-100 text-green-700", icon: CheckCircle },
  EXPIRED: { label: "Expiré", color: "bg-red-100 text-red-700", icon: XCircle },
  TERMINATED: { label: "Résilié", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

function formatDate(d: string) {
  return formatDateSafe(d);
}

function formatMAD(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " MAD";
}

async function generateContractPDF(contract: Contract) {
  await generateFullContractPDF({
    employeeName: contract.employeeName,
    contractType: contract.contractType,
    jobTitle: contract.jobTitle,
    startDate: contract.startDate,
    endDate: contract.endDate,
    baseSalary: contract.baseSalary,
    workingHours: contract.workingHours,
    trialPeriodMonths: contract.trialPeriodMonths,
    employeeGender: contract.gender,
    employeeBirthDate: contract.birthDate,
    employeeNationality: contract.nationality,
    employeePassport: contract.passportNumber,
    employeeIdType: contract.idType,
    employeeIdNumber: contract.idNumber,
  });
}

export default function ContractsPage() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [terminateId, setTerminateId] = useState<number | null>(null);
  const [terminateReason, setTerminateReason] = useState("");

  const [form, setForm] = useState({
    employeeId: "",
    contractType: "CDI",
    jobTitle: "",
    startDate: "",
    endDate: "",
    trialPeriodMonths: 3,
    baseSalary: 0,
    workingHours: 44,
    birthDate: "",
    nationality: "",
    passportNumber: "",
    idType: "",
    idNumber: "",
    gender: "",
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => apiFetch("/contracts"),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-contracts"],
    queryFn: () => apiFetch("/users?role=EMPLOYEE&active=true"),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiFetch("/contracts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { setShowDialog(false); qc.invalidateQueries({ queryKey: ["contracts"] }); },
  });

  const editMut = useMutation({
    mutationFn: (data: any) => apiFetch(`/contracts/${editId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { setShowDialog(false); qc.invalidateQueries({ queryKey: ["contracts"] }); },
  });

  const terminateMut = useMutation({
    mutationFn: () => apiFetch(`/contracts/${terminateId}/terminate`, { method: "PATCH", body: JSON.stringify({ reason: terminateReason }) }),
    onSuccess: () => { setTerminateId(null); qc.invalidateQueries({ queryKey: ["contracts"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/contracts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });

  const openCreate = () => {
    setEditId(null);
    setForm({
      employeeId: "", contractType: "CDI", jobTitle: "", startDate: "", endDate: "",
      trialPeriodMonths: 3, baseSalary: 0, workingHours: 44,
      birthDate: "", nationality: "", passportNumber: "",
    idType: "",
    idNumber: "", gender: "",
    });
    setShowDialog(true);
  };

  const openEdit = (c: Contract) => {
    setEditId(c.id);
    setForm({
      employeeId: String(c.employeeId),
      contractType: c.contractType,
      jobTitle: c.jobTitle,
      startDate: c.startDate ? c.startDate.split("T")[0] : "",
      endDate: c.endDate ? c.endDate.split("T")[0] : "",
      trialPeriodMonths: c.trialPeriodMonths,
      baseSalary: c.baseSalary,
      workingHours: c.workingHours,
      birthDate: c.birthDate ? c.birthDate.split("T")[0] : "",
      nationality: c.nationality || "",
      passportNumber: c.passportNumber || "",
      idType: c.idType || "",
      idNumber: c.idNumber || "",
      gender: c.gender || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      employeeId: parseInt(form.employeeId),
      baseSalary: parseFloat(String(form.baseSalary)),
      trialPeriodMonths: parseInt(String(form.trialPeriodMonths)),
      workingHours: parseInt(String(form.workingHours)),
      endDate: form.endDate || null,
      birthDate: form.birthDate || null,
      nationality: form.nationality || null,
      passportNumber: form.passportNumber || null,
      gender: form.gender || null,
    };

    if (editId) {
      editMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Supprimer définitivement ce contrat ?")) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contrats</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestion des contrats de travail</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau contrat
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !contracts?.length ? (
          <div className="p-10 text-center text-muted-foreground">Aucun contrat enregistré</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Employé(e)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Poste</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Période</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Salaire</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.map((c: Contract) => {
                  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.ACTIVE;
                  const Icon = status.icon;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-sm text-foreground">{c.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.jobTitle}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-foreground">{c.contractType}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(c.startDate)} {c.endDate ? `→ ${formatDate(c.endDate)}` : "(Indéterminée)"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-foreground">{formatMAD(c.baseSalary)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                          <Icon className="w-3 h-3" /> {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => void generateContractPDF(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors" title="Télécharger PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors" title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {c.status === "ACTIVE" && (
                            <button onClick={() => setTerminateId(c.id)} className="p-1.5 rounded hover:bg-orange-50 text-orange-600 transition-colors" title="Résilier">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulaire Ajout / Modification */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le contrat" : "Nouveau contrat"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {!editId && (
              <div className="space-y-1.5">
                <Label>Employé(e)</Label>
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {employees?.map((e: Employee) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type de contrat</Label>
                <Select value={form.contractType} onValueChange={v => setForm({ ...form, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Poste occupé</Label>
                <Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date de début</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin (si CDD)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Salaire brut (MAD)</Label>
                <Input type="number" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Heures / semaine</Label>
                <Input type="number" value={form.workingHours} onChange={e => setForm({ ...form, workingHours: parseInt(e.target.value) || 44 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Essai (mois)</Label>
                <Input type="number" value={form.trialPeriodMonths} onChange={e => setForm({ ...form, trialPeriodMonths: parseInt(e.target.value) || 3 })} />
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm font-semibold text-foreground mb-3">Informations personnelles (pour les attestations)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date de naissance</Label>
                  <Input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nationalité</Label>
                  <Input placeholder="Ex: sénégalaise" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1.5">
              <Label>Type de pièce d'identité</Label>
              <select
                value={form.idType || ""}
                onChange={e => setForm({ ...form, idType: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Non spécifié</option>
                <option value="Passeport">Passeport</option>
                <option value="CIN">Carte Nationale (CIN)</option>
                <option value="Carte de séjour">Carte de séjour</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Numéro de la pièce</Label>
              <Input placeholder="Ex: A03057973" value={form.idNumber || ""} onChange={e => setForm({ ...form, idNumber: e.target.value })} />
            </div>
          </div>
                <div className="space-y-1.5">
                  <Label>Sexe (Civilité)</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin (Monsieur)</SelectItem>
                      <SelectItem value="F">Féminin (Madame)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || editMut.isPending}>
                {editId ? "Enregistrer les modifications" : "Créer le contrat"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Résiliation */}
      <Dialog open={!!terminateId} onOpenChange={(open) => { if (!open) setTerminateId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Résilier le contrat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Motif de résiliation</Label>
              <Input value={terminateReason} onChange={e => setTerminateReason(e.target.value)} placeholder="Ex: Démission, fin de CDD..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setTerminateId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => terminateMut.mutate()} disabled={terminateMut.isPending}>
                Confirmer la résiliation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
