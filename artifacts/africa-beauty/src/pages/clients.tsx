import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Phone, Mail, Calendar } from "lucide-react";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("africa_beauty_token");

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  notes: string;
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", email: "", birthDate: "", notes: "" });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => apiFetch(`/clients?search=${search}`),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiFetch("/clients", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { setShowDialog(false); qc.invalidateQueries({ queryKey: ["clients"] }); resetForm(); },
  });

  const editMut = useMutation({
    mutationFn: (data: any) => apiFetch(`/clients/${editId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { setShowDialog(false); qc.invalidateQueries({ queryKey: ["clients"] }); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/clients/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  function resetForm() {
    setForm({ name: "", phone: "", email: "", birthDate: "", notes: "" });
    setEditId(null);
  }

  function openEdit(client: Client) {
    setEditId(client.id);
    setForm({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      birthDate: client.birth_date ? client.birth_date.split("T")[0] : "",
      notes: client.notes || "",
    });
    setShowDialog(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) editMut.mutate(form);
    else createMut.mutate(form);
  }

  function handleDelete(client: Client) {
    if (confirm(`Supprimer la fiche de ${client.name} ?`)) deleteMut.mutate(client.id);
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fichier Client</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gérez votre base de données clients</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvelle cliente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Rechercher par nom ou téléphone..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-9"
        />
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !clients?.length ? (
          <div className="p-10 text-center text-muted-foreground">Aucune cliente trouvée.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Anniversaire</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c: Client) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-foreground">{c.name}</div>
                    {c.notes && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{c.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.birth_date ? (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.birth_date).toLocaleDateString("fr-FR")}</span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Modifier la fiche" : "Nouvelle cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom complet *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="06..." />
              </div>
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes / Préférences</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Allergique au produit X, préfère la coiffeuse Y..." rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || editMut.isPending}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
