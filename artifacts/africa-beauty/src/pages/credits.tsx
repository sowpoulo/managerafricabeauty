import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Wallet2, History, X, Pencil, Trash2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function formatMAD(n: number) {
  return new Intl.NumberFormat("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " MAD";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Credit {
  id: number;
  employeeId: number;
  employeeName: string;
  amount: number;
  reason: string | null;
  dateGiven: string;
  remainingAmount: number;
  status: "ACTIVE" | "PAID";
  createdAt: string;
}

interface Employee {
  id: number;
  name: string;
}

interface Repayment {
  id: number;
  amount: number;
  datePaid: string;
  notes: string | null;
}

function RepayDialog({ credit, onClose }: { credit: Credit; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: repayments } = useQuery({
    queryKey: ["repayments", credit.id],
    queryFn: () => apiFetch(`/credits/${credit.id}/repayments`),
  });

  const repayMut = useMutation({
    mutationFn: () =>
      apiFetch(`/credits/${credit.id}/repay`, {
        method: "POST",
        body: JSON.stringify({ amount: parseFloat(amount), notes }),
      }),
    onSuccess: () => {
      setAmount("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["repayments", credit.id] });
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remboursement — {credit.employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Restant à rembourser</span>
            <span className="text-lg font-bold text-foreground">{formatMAD(credit.remainingAmount)}</span>
          </div>

          {credit.status !== "PAID" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (parseFloat(amount) > 0) repayMut.mutate();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label>Montant remboursé (MAD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={credit.remainingAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Note (optionnel)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <Button type="submit" disabled={repayMut.isPending} className="w-full">
                Enregistrer le remboursement
              </Button>
            </form>
          )}

          {repayments && repayments.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Historique
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {repayments.map((r: Repayment) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(r.datePaid)}</span>
                    <span className="font-medium text-foreground">{formatMAD(r.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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

async function exportCreditsPDF(month: string, monthLabel: string) {
  const token = localStorage.getItem("africa_beauty_token");
  const res = await fetch(`/api/credits/export?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("AfricaBeauty - Suivi des Crédits", 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Mois : ${monthLabel}`, 14, 26);
  doc.text(`Exporté le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 32);

  autoTable(doc, {
    startY: 38,
    head: [["Employée", "Crédit total", "Remboursé ce mois", "Restant", "Statut"]],
    body: data.map((r: any) => [
      r.employeeName,
      `${r.amount.toFixed(2)} MAD`,
      `${r.repaidThisMonth.toFixed(2)} MAD`,
      `${r.remainingAmount.toFixed(2)} MAD`,
      r.status === "PAID" ? "Remboursé" : "En cours",
    ]),
    theme: "grid",
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const totalRemaining = data.reduce((s: number, r: any) => s + r.remainingAmount, 0);
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.text(`Total à recouvrer : ${totalRemaining.toFixed(2)} MAD`, 14, finalY);

  doc.save(`credits-${monthLabel.replace(/\s/g, "-")}.pdf`);
}

export default function CreditsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isManager = role === "MANAGER";
  const [showDialog, setShowDialog] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [dateGiven, setDateGiven] = useState(new Date().toISOString().slice(0, 10));
  const [repayCredit, setRepayCredit] = useState<Credit | null>(null);
  const [editCredit, setEditCredit] = useState<Credit | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const { data: credits, isLoading } = useQuery({
    queryKey: ["credits"],
    queryFn: () => apiFetch("/credits"),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: () => apiFetch("/users?role=EMPLOYEE&active=true"),
    enabled: isManager,
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch("/credits", {
        method: "POST",
        body: JSON.stringify({ employeeId: parseInt(employeeId), amount: parseFloat(amount), reason, dateGiven }),
      }),
    onSuccess: () => {
      setShowDialog(false);
      setEmployeeId("");
      setAmount("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["credits"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/credits/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credits"] }),
  });

  const editMut = useMutation({
    mutationFn: () =>
      apiFetch(`/credits/${editCredit!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ amount: parseFloat(editAmount), reason: editReason }),
      }),
    onSuccess: () => {
      setEditCredit(null);
      qc.invalidateQueries({ queryKey: ["credits"] });
    },
  });

  const totalOutstanding = credits?.reduce((sum: number, c: Credit) => sum + c.remainingAmount, 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isManager ? "Crédits employées" : "Mes crédits"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isManager ? "Suivi des avances et remboursements" : "Vos avances et soldes restants"}
          </p>
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
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
                onClick={() => {
                  const label = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;
                  exportCreditsPDF(selectedMonth, label);
                }}
              >
                <FileDown className="w-4 h-4" />
                Exporter PDF
              </Button>
            </div>
            <Button onClick={() => setShowDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau crédit
            </Button>
          </div>
        )}
      </div>

      {isManager && (
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total à recouvrer</p>
              <p className="text-xl font-bold text-foreground">{formatMAD(totalOutstanding)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{credits?.filter((c: Credit) => c.status === "ACTIVE").length || 0} crédit(s) actif(s)</p>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !credits?.length ? (
          <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Wallet2 className="w-8 h-8 opacity-40" />
            Aucun crédit enregistré
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {isManager && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employée</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motif</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {credits.map((c: Credit) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    {isManager && <td className="px-4 py-3 font-medium text-sm text-foreground">{c.employeeName}</td>}
                    <td className="px-4 py-3 text-sm text-foreground">{formatMAD(c.amount)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(c.dateGiven)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate">{c.reason || "-"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{formatMAD(c.remainingAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.status === "PAID" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {c.status === "PAID" ? "Remboursé" : "En cours"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isManager && (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setRepayCredit(c)}>
                            Gérer
                          </Button>
                          <button
                            onClick={() => { setEditCredit(c); setEditAmount(String(c.amount)); setEditReason(c.reason || ""); }}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => { if (confirm("Supprimer ce crédit ?")) deleteMut.mutate(c.id); }}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau crédit</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Employée</Label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                <option value="">Choisir une employée...</option>
                {employees?.map((e: Employee) => (
                  <option key={e.id} value={String(e.id)}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Montant (MAD)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={dateGiven} onChange={(e) => setDateGiven(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motif (optionnel)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || !employeeId}>Créer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {repayCredit && <RepayDialog credit={repayCredit} onClose={() => setRepayCredit(null)} />}

      {editCredit && (
        <Dialog open onOpenChange={() => setEditCredit(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier le crédit — {editCredit.employeeName}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); editMut.mutate(); }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-1.5">
                <Label>Montant (MAD)</Label>
                <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Motif</Label>
                <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setEditCredit(null)}>Annuler</Button>
                <Button type="submit" disabled={editMut.isPending}>Modifier</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
