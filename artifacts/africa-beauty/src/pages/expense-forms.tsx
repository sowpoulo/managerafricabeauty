import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Printer, Check, X, FileText, Download } from "lucide-react";
import { generateExpenseFormPDF } from "@/lib/expense-form-template";

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

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: "bg-gray-100 text-gray-700",
  EN_ATTENTE: "bg-orange-100 text-orange-700",
  VALIDE: "bg-green-100 text-green-700",
  REFUSE: "bg-red-100 text-red-700",
  PAYE: "bg-blue-100 text-blue-700",
};

export default function ExpenseFormsPage() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [viewForm, setViewForm] = useState<any>(null);
  
  const [form, setForm] = useState({
    requesterName: "", beneficiary: "", reason: "", paymentMethod: "ESPECES", observations: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }]
  });

  const { data: forms, isLoading } = useQuery({ queryKey: ["expense-forms"], queryFn: () => apiFetch("/expense-forms") });

  const createMut = useMutation({
    mutationFn: (data: any) => apiFetch("/expense-forms", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { setShowDialog(false); qc.invalidateQueries({ queryKey: ["expense-forms"] }); resetForm(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => 
      apiFetch(`/expense-forms/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense-forms"] }),
  });

  const resetForm = () => setForm({ requesterName: "", beneficiary: "", reason: "", paymentMethod: "ESPECES", observations: "", items: [{ description: "", quantity: 1, unitPrice: 0 }] });
  const addItem = () => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unitPrice: 0 }] });
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...form.items];
    newItems[i] = { ...newItems[i], [field]: val };
    setForm({ ...form, items: newItems });
  };
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const total = form.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bons de Dépenses</h1>
          <p className="text-muted-foreground text-sm">Gestion et validation des frais du salon.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateExpenseFormPDF()} className="gap-2">
            <Printer className="w-4 h-4" /> Bon Vierge
          </Button>
          <Button onClick={() => setShowDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau Bon
          </Button>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? <div className="p-10 text-center">Chargement...</div> : !forms?.length ? <div className="p-10 text-center text-muted-foreground">Aucun bon de dépense.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-4 py-3 text-left">N° / Date</th>
                <th className="px-4 py-3 text-left">Demandeur</th>
                <th className="px-4 py-3 text-left">Bénéficiaire</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {forms.map((f: any) => (
                <tr key={f.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{f.form_number}<br/><span className="text-xs text-muted-foreground">{new Date(f.date).toLocaleDateString("fr-FR")}</span></td>
                  <td className="px-4 py-3">{f.requester_name}</td>
                  <td className="px-4 py-3">{f.beneficiary}</td>
                  <td className="px-4 py-3 text-right font-semibold">{f.total_amount.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => setViewForm(f)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => generateExpenseFormPDF(f)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"><Download className="w-4 h-4" /></button>
                    {f.status === "EN_ATTENTE" && (
                      <>
                        <button onClick={() => statusMut.mutate({ id: f.id, status: "VALIDE" })} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => statusMut.mutate({ id: f.id, status: "REFUSE" })} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </>
                    )}
                    {f.status === "VALIDE" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => statusMut.mutate({ id: f.id, status: "PAYE" })}>Marquer Payé</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulaire de création */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau Bon de Dépense</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate({ ...form, items: form.items, totalAmount: total }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Demandeur</Label><Input required value={form.requesterName} onChange={e => setForm({...form, requesterName: e.target.value})} /></div>
              <div><Label>Bénéficiaire</Label><Input required value={form.beneficiary} onChange={e => setForm({...form, beneficiary: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Motif</Label><Input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} /></div>
              <div><Label>Mode de paiement</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm({...form, paymentMethod: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESPECES">Espèces</SelectItem>
                    <SelectItem value="VIREMENT">Virement</SelectItem>
                    <SelectItem value="CHEQUE">Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-3 bg-muted/10 space-y-2">
              <div className="flex justify-between items-center mb-2"><Label className="font-bold">Détail des dépenses</Label><Button type="button" size="sm" onClick={addItem}>+ Ligne</Button></div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input placeholder="Description" className="flex-1" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  <Input type="number" placeholder="Qté" className="w-16" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                  <Input type="number" placeholder="P.U." className="w-24" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                  <div className="w-20 text-right font-semibold text-sm">{(item.quantity * item.unitPrice).toFixed(2)}</div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}><X className="w-4 h-4 text-red-500" /></Button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center font-bold text-lg"><span>TOTAL :</span><span>{total.toFixed(2)} DH</span></div>
            <div><Label>Observations</Label><Input value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending}>Enregistrer (Brouillon)</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de consultation */}
      <Dialog open={!!viewForm} onOpenChange={() => setViewForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Détail du Bon {viewForm?.form_number}</DialogTitle></DialogHeader>
          {viewForm && (
            <div className="space-y-2 text-sm">
              <p><strong>Date :</strong> {new Date(viewForm.date).toLocaleDateString("fr-FR")}</p>
              <p><strong>Demandeur :</strong> {viewForm.requester_name}</p>
              <p><strong>Bénéficiaire :</strong> {viewForm.beneficiary}</p>
              <p><strong>Total :</strong> {viewForm.total_amount.toFixed(2)} DH</p>
              <p><strong>Statut :</strong> {viewForm.status}</p>
              <Button className="w-full mt-4" onClick={() => generateExpenseFormPDF(viewForm)}>Télécharger le PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
