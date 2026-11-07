import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: "MANAGER" | "EMPLOYEE";
  active: boolean;
}

const DEFAULT_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
  active: true,
};

export default function EmployeesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(DEFAULT_FORM);
  const [ribDialog, setRibDialog] = useState<{ id: number; name: string; bankName: string; bankRib: string } | null>(null);
  const [ribSaving, setRibSaving] = useState(false);
  const qc = useQueryClient();
  async function saveRib() {
    if (!ribDialog) return;
    setRibSaving(true);
    try {
      const token = localStorage.getItem("africa_beauty_token");
      const res = await fetch(`/api/users/${ribDialog.id}/bank-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bankName: ribDialog.bankName, bankRib: ribDialog.bankRib }),
      });
      if (!res.ok) throw new Error("Erreur");
      setRibDialog(null);
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (e) {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setRibSaving(false);
    }
  }

  const { data: users, isLoading } = useListUsers();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const openCreate = () => {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setShowDialog(true);
  };

  const openEdit = (user: NonNullable<typeof users>[0]) => {
    setEditId(user.id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role as "MANAGER" | "EMPLOYEE", active: user.active });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setShowDialog(false);
    };
    if (editId) {
      const data: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (form.password) data.password = form.password;
      updateMut.mutate({ id: editId, data: data as any }, { onSuccess: invalidate });
    } else {
      createMut.mutate({ data: { name: form.name, email: form.email, password: form.password, role: form.role } }, { onSuccess: invalidate });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cette employée ?")) return;
    deleteMut.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() }) });
  };

  const toggleActive = (user: NonNullable<typeof users>[0]) => {
    updateMut.mutate(
      { id: user.id, data: { active: !user.active } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() }) }
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employées</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestion de l'équipe</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !users?.length ? (
          <div className="p-10 text-center text-muted-foreground">Aucune employée</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actif</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <Link href={`/employees/${user.id}`} className="font-medium text-sm text-foreground hover:text-primary hover:underline">{user.name}</Link>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.role === "MANAGER" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {user.role === "MANAGER" ? "Manager" : "Employée"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Switch checked={user.active} onCheckedChange={() => toggleActive(user)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </button>
                      <button
                        onClick={() => setRibDialog({ id: user.id, name: user.name, bankName: (user as any).bankName || "", bankRib: (user as any).bankRib || "" })}
                        className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                        title="Infos bancaires"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      </button>
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
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier l'employée" : "Ajouter une employée"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{editId ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editId} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as "MANAGER" | "EMPLOYEE" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employée</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editId ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {ribDialog && (
        <Dialog open onOpenChange={() => setRibDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Infos bancaires — {ribDialog.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nom de la banque</Label>
                <Input
                  value={ribDialog.bankName}
                  onChange={(e) => setRibDialog({ ...ribDialog, bankName: e.target.value })}
                  placeholder="Ex: CIH Bank, Attijariwafa..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>RIB / IBAN</Label>
                <Input
                  value={ribDialog.bankRib}
                  onChange={(e) => setRibDialog({ ...ribDialog, bankRib: e.target.value })}
                  placeholder="Ex: 230780123456789012345678"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setRibDialog(null)}>Annuler</Button>
                <Button onClick={saveRib} disabled={ribSaving}>
                  {ribSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
