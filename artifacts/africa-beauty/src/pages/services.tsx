import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import { formatEuro } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";

interface ServiceForm {
  name: string;
  price: string;
  duration: string;
  active: boolean;
}

const DEFAULT_FORM: ServiceForm = { name: "", price: "", duration: "60", active: true };

export default function ServicesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM);
  const qc = useQueryClient();

  const { data: services, isLoading } = useListServices();
  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const deleteMut = useDeleteService();

  const openCreate = () => { setEditId(null); setForm(DEFAULT_FORM); setShowDialog(true); };
  const openEdit = (s: NonNullable<typeof services>[0]) => {
    setEditId(s.id);
    setForm({ name: s.name, price: String(s.price), duration: String(s.duration), active: s.active });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invalidate = () => { qc.invalidateQueries({ queryKey: getListServicesQueryKey() }); setShowDialog(false); };
    const payload = { name: form.name, price: parseFloat(form.price), duration: parseInt(form.duration) };
    if (editId) {
      updateMut.mutate({ id: editId, data: { ...payload, active: form.active } }, { onSuccess: invalidate });
    } else {
      createMut.mutate({ data: payload }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cette prestation ?")) return;
    deleteMut.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListServicesQueryKey() }) });
  };

  const toggleActive = (s: NonNullable<typeof services>[0]) => {
    updateMut.mutate({ id: s.id, data: { active: !s.active } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListServicesQueryKey() }) });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prestations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestion des services proposés</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-28 animate-pulse" />
          ))
        ) : !services?.length ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Aucune prestation</div>
        ) : (
          services.map(service => (
            <div key={service.id} className={`bg-card border border-card-border rounded-xl p-5 shadow-sm transition-all ${!service.active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{service.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-lg font-bold text-primary">{formatEuro(service.price)}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {service.duration} min
                    </span>
                  </div>
                </div>
                <Switch checked={service.active} onCheckedChange={() => toggleActive(service)} />
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <button onClick={() => openEdit(service)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier
                </button>
                <button onClick={() => handleDelete(service.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-destructive/70 hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier la prestation" : "Nouvelle prestation"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom de la prestation</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Coupe femme, Tresses, Défrisage..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prix (€)</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Durée (minutes)</Label>
                <Input type="number" min="5" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
              </div>
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
