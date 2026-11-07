import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useListUsers,
  useListServices,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { formatEuro, formatDateTime } from "@/lib/format";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

type Status = "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const STATUS_LABELS: Record<Status, string> = {
  CONFIRMED: "Confirmé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const STATUS_COLORS: Record<Status, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface AppointmentForm {
  clientName: string;
  date: string;
  price: string;
  status: Status;
  serviceId: string;
  employeeId: string;
  rating: string;
  comment: string;
}

const DEFAULT_FORM: AppointmentForm = {
  clientName: "",
  date: "",
  price: "",
  status: "CONFIRMED",
  serviceId: "",
  employeeId: "",
  rating: "",
  comment: "",
};

export default function AppointmentsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AppointmentForm>(DEFAULT_FORM);
  const qc = useQueryClient();

  const params = {
    ...(filterStatus !== "all" ? { status: filterStatus as Status } : {}),
    ...(filterEmployee !== "all" ? { employeeId: parseInt(filterEmployee) } : {}),
  };

  const { data: appointments, isLoading } = useListAppointments(params);
  const { data: employees } = useListUsers({ role: "EMPLOYEE", active: true });
  const { data: services } = useListServices({ active: true });

  const createMut = useCreateAppointment();
  const updateMut = useUpdateAppointment();
  const deleteMut = useDeleteAppointment();

  const openCreate = () => {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setShowDialog(true);
  };

  const openEdit = (appt: NonNullable<typeof appointments>[0]) => {
    setEditId(appt.id);
    setForm({
      clientName: appt.clientName,
      date: new Date(appt.date).toISOString().slice(0, 16),
      price: String(appt.price),
      status: appt.status as Status,
      serviceId: String(appt.serviceId),
      employeeId: String(appt.employeeId),
      rating: appt.rating ? String(appt.rating) : "",
      comment: appt.comment || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clientName: form.clientName,
      date: new Date(form.date).toISOString(),
      price: parseFloat(form.price),
      status: form.status,
      serviceId: parseInt(form.serviceId),
      employeeId: parseInt(form.employeeId),
      rating: form.rating ? parseInt(form.rating) : null,
      comment: form.comment || null,
    };

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
      setShowDialog(false);
    };

    if (editId) {
      updateMut.mutate({ id: editId, data: payload }, { onSuccess: invalidate });
    } else {
      createMut.mutate({ data: payload }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce rendez-vous ?")) return;
    deleteMut.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }) });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rendez-vous</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestion des rendez-vous</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau RDV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as Status[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Employée" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les employées</SelectItem>
            {employees?.map(e => (
              <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !appointments?.length ? (
          <div className="p-10 text-center text-muted-foreground">Aucun rendez-vous</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prestation</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employée</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prix</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-sm text-foreground">{appt.clientName}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDateTime(String(appt.date))}</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{appt.service?.name}</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{appt.employee?.name}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{formatEuro(appt.price)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[appt.status as Status]}`}>
                      {STATUS_LABELS[appt.status as Status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(appt)} className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(appt.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom du client</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Prix (MAD)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date et heure</Label>
              <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prestation</Label>
                <Select value={form.serviceId} onValueChange={v => setForm(f => ({ ...f, serviceId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {services?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Employée</Label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as Status[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editId ? "Modifier" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
