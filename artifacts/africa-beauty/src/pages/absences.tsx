import { useState } from "react";
import { formatDateSafe } from "@/lib/date-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X, CalendarOff, ChevronLeft, ChevronRight, CalendarDays, List, Clock } from "lucide-react";
import { useQuery as useQueryRQ } from "@tanstack/react-query";

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

type AbsenceType = "CONGE" | "MALADIE" | "ABSENCE";
type AbsenceStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Absence {
  id: number;
  employeeId: number;
  employeeName: string;
  type: AbsenceType;
  dateStart: string;
  dateEnd: string;
  daysCount: number;
  status: AbsenceStatus;
  reason: string | null;
  createdAt: string;
}

interface Employee {
  id: number;
  name: string;
}

const TYPE_LABELS: Record<AbsenceType, string> = {
  CONGE: "Congé",
  MALADIE: "Maladie",
  ABSENCE: "Absence",
};

const STATUS_LABELS: Record<AbsenceStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
};

const STATUS_COLORS: Record<AbsenceStatus, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface LeaveBalance {
  id: number;
  employeeId: number;
  employeeName: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

function MyLeaveBalanceWidget() {
  const { data: balance } = useQueryRQ({
    queryKey: ["my-leave-balance"],
    queryFn: () => apiFetch("/leave-balances/my-balance"),
  });

  if (!balance) return null;

  const percentUsed = balance.totalDays > 0 ? (balance.usedDays / balance.totalDays) * 100 : 0;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium text-foreground">Mon solde de congés {balance.year}</p>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-foreground">{balance.remainingDays}</span>
        <span className="text-sm text-muted-foreground">jours restants sur {balance.totalDays}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percentUsed > 80 ? "bg-red-500" : percentUsed > 50 ? "bg-orange-500" : "bg-green-500"}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">{balance.usedDays} jours utilisés</p>
    </div>
  );
}

function TeamLeaveBalanceWidget() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();

  const { data: balances } = useQueryRQ({
    queryKey: ["leave-balances", year],
    queryFn: () => apiFetch(`/leave-balances?year=${year}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, totalDays }: { id: number; totalDays: number }) =>
      apiFetch(`/leave-balances/${id}`, { method: "PATCH", body: JSON.stringify({ totalDays }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-balances", year] }),
  });

  if (!balances || balances.length === 0) return null;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium text-foreground">Solde de congés — {year}</p>
      </div>
      <div className="space-y-3">
        {balances.map((b: LeaveBalance) => {
          const percentUsed = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0;
          return (
            <div key={b.id} className="flex items-center gap-3">
              <span className="text-sm text-foreground w-32 truncate flex-shrink-0">{b.employeeName}</span>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${percentUsed > 80 ? "bg-red-500" : percentUsed > 50 ? "bg-orange-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-24 text-right flex-shrink-0">
                {b.remainingDays}/{b.totalDays} jours
              </span>
              <input
                type="number"
                defaultValue={b.totalDays}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val !== b.totalDays && !isNaN(val)) {
                    updateMut.mutate({ id: b.id, totalDays: val });
                  }
                }}
                className="w-14 text-xs border border-border rounded px-1.5 py-1 bg-background flex-shrink-0"
                title="Modifier le quota annuel"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TYPE_DOT_COLORS: Record<AbsenceType, string> = {
  CONGE: "bg-blue-500",
  MALADIE: "bg-red-500",
  ABSENCE: "bg-orange-500",
};

function CalendarView({ absences }: { absences: Absence[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Lundi = 0

  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const approvedAbsences = absences.filter((a) => a.status === "APPROVED");

  function getAbsencesForDay(day: number) {
    const dayDate = new Date(year, month, day);
    return approvedAbsences.filter((a) => {
      const start = new Date(a.dateStart);
      const end = new Date(a.dateEnd);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate >= start && dayDate <= end;
    });
  }

  const monthLabel = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-foreground capitalize">{monthLabel}</p>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="aspect-square" />;
          const dayAbsences = getAbsencesForDay(day);
          return (
            <div
              key={idx}
              className={`aspect-square rounded-lg border p-1 flex flex-col ${
                isToday(day) ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className={`text-xs ${isToday(day) ? "font-bold text-primary" : "text-foreground"}`}>{day}</span>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                {dayAbsences.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    title={`${a.employeeName} - ${TYPE_LABELS[a.type]}`}
                    className={`text-[9px] leading-tight px-1 rounded truncate text-white ${TYPE_DOT_COLORS[a.type]}`}
                  >
                    {a.employeeName.split(" ")[0]}
                  </div>
                ))}
                {dayAbsences.length > 2 && (
                  <div className="text-[9px] text-muted-foreground px-1">+{dayAbsences.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        {(Object.keys(TYPE_LABELS) as AbsenceType[]).map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT_COLORS[t]}`} />
            <span className="text-xs text-muted-foreground">{TYPE_LABELS[t]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AbsencesPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isManager = role === "MANAGER";
  const [showDialog, setShowDialog] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [type, setType] = useState<AbsenceType>("CONGE");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [reason, setReason] = useState("");

  const { data: absences, isLoading } = useQuery({
    queryKey: ["absences"],
    queryFn: () => apiFetch("/absences"),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: () => apiFetch("/users?role=EMPLOYEE&active=true"),
    enabled: isManager,
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch("/absences", {
        method: "POST",
        body: JSON.stringify({
          type,
          dateStart,
          dateEnd,
          reason,
          ...(isManager && employeeId ? { employeeId: parseInt(employeeId) } : {}),
        }),
      }),
    onSuccess: () => {
      setShowDialog(false);
      setEmployeeId("");
      setDateStart("");
      setDateEnd("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["absences"] });
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" }) =>
      apiFetch(`/absences/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["absences"] }),
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isManager ? "Congés & Absences" : "Mes congés"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isManager ? "Gérez les demandes de votre équipe" : "Demandez un congé ou signalez une absence"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setView("calendar")}
              className={`p-1.5 rounded-md transition-all ${view === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              title="Vue calendrier"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-all ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle demande
          </Button>
        </div>
      </div>

      {isManager ? <TeamLeaveBalanceWidget /> : <MyLeaveBalanceWidget />}

      {view === "calendar" && isManager && !isLoading && absences && (
        <CalendarView absences={absences} />
      )}

      <div className={`bg-card border border-card-border rounded-xl overflow-hidden shadow-sm ${view === "calendar" && isManager ? "hidden" : ""}`}>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !absences?.length ? (
          <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CalendarOff className="w-8 h-8 opacity-40" />
            Aucune demande pour le moment
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {isManager && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employée</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Période</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jours</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motif</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  {isManager && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {absences.map((a: Absence) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    {isManager && <td className="px-4 py-3 font-medium text-sm text-foreground">{a.employeeName}</td>}
                    <td className="px-4 py-3 text-sm text-foreground">{TYPE_LABELS[a.type]}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(a.dateStart)} → {formatDate(a.dateEnd)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{a.daysCount}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{a.reason || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3">
                        {a.status === "PENDING" && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => statusMut.mutate({ id: a.id, status: "APPROVED" })}
                              className="p-1.5 rounded hover:bg-green-100 text-green-600"
                              title="Approuver"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => statusMut.mutate({ id: a.id, status: "REJECTED" })}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600"
                              title="Refuser"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
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
            <DialogTitle>Nouvelle demande</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="space-y-4 mt-2"
          >
            {isManager && (
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
            )}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AbsenceType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="CONGE">Congé</option>
                <option value="MALADIE">Maladie</option>
                <option value="ABSENCE">Absence</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date de début</Label>
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin</Label>
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motif (optionnel)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || (isManager && !employeeId)}>Envoyer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
