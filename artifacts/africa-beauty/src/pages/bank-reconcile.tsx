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
import { Check, X, RefreshCw, Link, Hand } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function BankReconcilePage() {
  const qc = useQueryClient();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [tab, setTab] = useState<"suggestions" | "unreconciled" | "reconciled">("suggestions");

  // État pour le dialogue de rapprochement manuel
  const [manualDialog, setManualDialog] = useState<{
    open: boolean;
    transactionId: number | null;
    transactionDate: string;
    transactionAmount: number;
    transactionDescription: string;
  }>({
    open: false,
    transactionId: null,
    transactionDate: "",
    transactionAmount: 0,
    transactionDescription: "",
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [filterClient, setFilterClient] = useState("");

  // Données
  const { data: suggestions, isLoading: sLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ["bank-suggestions", selectedMonth],
    queryFn: () => apiFetch(`/bank/reconcile/suggestions?month=${selectedMonth}`),
  });

  const { data: unreconciled, refetch: refetchUnreconciled } = useQuery({
    queryKey: ["bank-unreconciled", selectedMonth],
    queryFn: () => apiFetch(`/bank/unreconciled?month=${selectedMonth}`),
    enabled: tab === "unreconciled",
  });

  const { data: reconciled, refetch: refetchReconciled } = useQuery({
    queryKey: ["bank-reconciled", selectedMonth],
    queryFn: () => apiFetch(`/bank/reconciled?month=${selectedMonth}`),
    enabled: tab === "reconciled",
  });

  // RDV du mois pour le rapprochement manuel
  const { data: appointments } = useQuery({
    queryKey: ["appointments-month", selectedMonth],
    queryFn: () => {
      const start = `${selectedMonth}-01`;
      const end = `${selectedMonth}-${new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 0).getDate()}`;
      return apiFetch(`/appointments?start=${start}&end=${end}`);
    },
    enabled: manualDialog.open,
  });

  // Mutations
  const reconcileMut = useMutation({
    mutationFn: ({ transactionId, appointmentId }: { transactionId: number; appointmentId: number }) =>
      apiFetch(`/bank/reconcile/${transactionId}`, {
        method: "POST",
        body: JSON.stringify({ appointmentId }),
      }),
    onSuccess: () => {
      refetchSuggestions();
      refetchUnreconciled();
      refetchReconciled();
      qc.invalidateQueries({ queryKey: ["bank-suggestions"] });
      qc.invalidateQueries({ queryKey: ["bank-unreconciled"] });
      setManualDialog({ open: false, transactionId: null, transactionDate: "", transactionAmount: 0, transactionDescription: "" });
      setSelectedAppointmentId("");
    },
  });

  const ignoreMut = useMutation({
    mutationFn: (transactionId: number) =>
      apiFetch(`/bank/reconcile/ignore/${transactionId}`, { method: "POST" }),
    onSuccess: () => {
      refetchSuggestions();
      refetchUnreconciled();
    },
  });

  // Ouvrir le dialogue de rapprochement manuel
  const openManualReconcile = (txn: any) => {
    setManualDialog({
      open: true,
      transactionId: txn.id,
      transactionDate: txn.date,
      transactionAmount: txn.amount,
      transactionDescription: txn.description,
    });
    setSelectedAppointmentId("");
  };

  // Filtrer les RDV par client
  const filteredAppointments = appointments?.filter((apt: any) =>
    apt.clientName.toLowerCase().includes(filterClient.toLowerCase())
  ) || [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapprochement bancaire</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Associez les encaissements bancaires aux rendez-vous</p>
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
      </div>

      <div className="flex gap-2 border-b border-border pb-2 flex-wrap">
        <Button
          variant={tab === "suggestions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("suggestions")}
          className="gap-2"
        >
          <Link className="w-4 h-4" />
          Suggestions ({suggestions?.length || 0})
        </Button>
        <Button
          variant={tab === "unreconciled" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("unreconciled")}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Non rapprochés ({unreconciled?.length || 0})
        </Button>
        <Button
          variant={tab === "reconciled" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("reconciled")}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Rapprochés ({reconciled?.length || 0})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchSuggestions();
            refetchUnreconciled();
            refetchReconciled();
          }}
          className="ml-auto gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </Button>
      </div>

      {/* Onglet Suggestions (automatiques) */}
      {tab === "suggestions" && (
        <div className="space-y-4">
          {sLoading ? (
            <div className="text-center py-10 text-muted-foreground">Chargement...</div>
          ) : !suggestions || suggestions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Aucune proposition de rapprochement pour ce mois
            </div>
          ) : (
            suggestions.map((s: any) => (
              <Card key={s.transaction.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{formatDate(s.transaction.date)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground truncate">{s.transaction.description}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-semibold text-green-600">
                          {formatMAD(s.transaction.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Score : {s.score}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-right">
                        <p className="font-medium text-foreground">{s.appointment.clientName}</p>
                        <p className="text-muted-foreground text-xs">{formatMAD(s.appointment.price)}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => reconcileMut.mutate({
                          transactionId: s.transaction.id,
                          appointmentId: s.appointment.id,
                        })}
                        disabled={reconcileMut.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Rapprocher
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ignoreMut.mutate(s.transaction.id)}
                        disabled={ignoreMut.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Onglet Non rapprochés (avec rapprochement manuel) */}
      {tab === "unreconciled" && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {!unreconciled || unreconciled.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Aucune transaction non rapprochée</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Description</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Montant</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {unreconciled.map((t: any) => (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-2 text-sm text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="px-4 py-2 text-sm text-foreground">{t.description}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-right text-green-600">{formatMAD(t.amount)}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => openManualReconcile(t)}
                      >
                        <Hand className="w-3 h-3" />
                        Rapprocher manuellement
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Onglet Rapprochés */}
      {tab === "reconciled" && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {!reconciled || reconciled.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Aucune transaction rapprochée</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Description</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Montant</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Associé à</th>
                </tr>
              </thead>
              <tbody>
                {reconciled.map((t: any) => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="px-4 py-2 text-sm text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="px-4 py-2 text-sm text-foreground">{t.description}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-right">{formatMAD(t.amount)}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">
                      {t.appointment ? t.appointment.clientName : "RDV supprimé"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Dialogue de rapprochement manuel */}
      <Dialog
        open={manualDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setManualDialog({ open: false, transactionId: null, transactionDate: "", transactionAmount: 0, transactionDescription: "" });
            setSelectedAppointmentId("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rapprochement manuel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Transaction bancaire</p>
              <p className="font-medium text-foreground">{manualDialog.transactionDescription}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{formatDate(manualDialog.transactionDate)}</span>
                <span className="text-sm font-semibold text-green-600">{formatMAD(manualDialog.transactionAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rechercher un rendez-vous</Label>
              <Input
                placeholder="Rechercher par nom de client..."
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Sélectionner un rendez-vous</Label>
              <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un rendez-vous..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {filteredAppointments.length === 0 ? (
                    <SelectItem value="no-result" disabled>Aucun rendez-vous trouvé</SelectItem>
                  ) : (
                    filteredAppointments.map((apt: any) => (
                      <SelectItem key={apt.id} value={String(apt.id)}>
                        {apt.clientName} - {formatMAD(apt.price)} - {formatDate(apt.date)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setManualDialog({ open: false, transactionId: null, transactionDate: "", transactionAmount: 0, transactionDescription: "" });
                  setSelectedAppointmentId("");
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (manualDialog.transactionId && selectedAppointmentId) {
                    reconcileMut.mutate({
                      transactionId: manualDialog.transactionId,
                      appointmentId: parseInt(selectedAppointmentId),
                    });
                  }
                }}
                disabled={!selectedAppointmentId || reconcileMut.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Rapprocher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
