import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";

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

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  tvaDeductible: boolean;
  tvaAmount: number;
}

const CATEGORIES = [
  "Achats consommables",
  "Loyer",
  "Eau / Électricité",
  "Internet / Téléphone",
  "Entretien / Réparation",
  "Marketing / Publicité",
  "Transport",
  "Assurances",
  "Frais bancaires",
  "Autre",
];

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

export default function ExpensesPage() {
  const qc = useQueryClient();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    tvaDeductible: false,
    tvaAmount: "",
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", selectedMonth],
    queryFn: () => apiFetch(`/accounting/expenses?month=${selectedMonth}`),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch("/accounting/expenses", {
        method: "POST",
        body: JSON.stringify({
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount) || 0,
          date: form.date,
          tvaDeductible: form.tvaDeductible,
          tvaAmount: parseFloat(form.tvaAmount) || 0,
        }),
      }),
    onSuccess: () => {
      setShowDialog(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/accounting/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  function resetForm() {
    setForm({
      category: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      tvaDeductible: false,
      tvaAmount: "",
    });
    setEditId(null);
  }

  const totalExpenses = expenses?.reduce((sum: number, e: Expense) => sum + e.amount, 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dépenses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Saisie des charges du salon</p>
        </div>
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
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total des dépenses</p>
            <p className="text-xl font-bold text-foreground">{formatMAD(totalExpenses)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{expenses?.length || 0} dépenses</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !expenses?.length ? (
          <div className="p-10 text-center text-muted-foreground">Aucune dépense pour ce mois</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">TVA déductible</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e: Expense) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{e.category}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{e.description || "-"}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">{formatMAD(e.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {e.tvaDeductible ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Oui</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">Non</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (!confirm("Supprimer cette dépense ?")) return;
                          deleteMut.mutate(e.id);
                        }}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </button>
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
            <DialogTitle>{editId ? "Modifier" : "Ajouter"} une dépense</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Montant (MAD)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={form.tvaDeductible} onCheckedChange={(v) => setForm((f) => ({ ...f, tvaDeductible: v }))} />
                <Label className="text-sm font-normal">TVA déductible</Label>
              </div>
              {form.tvaDeductible && (
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Montant TVA"
                    value={form.tvaAmount}
                    onChange={(e) => setForm((f) => ({ ...f, tvaAmount: e.target.value }))}
                    className="w-32"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
