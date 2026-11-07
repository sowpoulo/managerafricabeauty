import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, ShoppingBag, TrendingUp, Package, Pencil, Trash2 } from "lucide-react";

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

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

interface Product {
  id: number;
  name: string;
  priceSell: number;
  stockCurrent: number;
  unit: string;
}

export default function StockSalesPage() {
  const qc = useQueryClient();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const [showDialog, setShowDialog] = useState(false);
  const [editSaleId, setEditSaleId] = useState<number | null>(null);
  
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [priceUnit, setPriceUnit] = useState("");
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["stock-sales", selectedMonth],
    queryFn: () => apiFetch(`/stock/sales?month=${selectedMonth}`),
  });

  const { data: stats } = useQuery({
    queryKey: ["stock-sales-stats", selectedMonth],
    queryFn: () => apiFetch(`/stock/sales/stats?month=${selectedMonth}`),
  });

  const { data: products } = useQuery({
    queryKey: ["stock-products-list"],
    queryFn: () => apiFetch("/stock/products"),
    enabled: showDialog,
  });

  const saleMut = useMutation({
    mutationFn: () =>
      apiFetch(editSaleId ? `/stock/sales/${editSaleId}` : "/stock/sales", {
        method: editSaleId ? "PATCH" : "POST",
        body: JSON.stringify({
          productId: parseInt(productId),
          quantity: parseInt(quantity),
          priceUnit: parseFloat(priceUnit),
          clientName: clientName || null,
          paymentMethod,
          note: note || null,
        }),
      }),
    onSuccess: () => {
      closeDialog();
      qc.invalidateQueries({ queryKey: ["stock-sales"] });
      qc.invalidateQueries({ queryKey: ["stock-sales-stats"] });
      qc.invalidateQueries({ queryKey: ["stock-products-list"] });
      qc.invalidateQueries({ queryKey: ["stock-products"] });
    },
    onError: (err: any) => setErrorMsg(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/stock/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-sales"] });
      qc.invalidateQueries({ queryKey: ["stock-sales-stats"] });
      qc.invalidateQueries({ queryKey: ["stock-products-list"] });
      qc.invalidateQueries({ queryKey: ["stock-products"] });
    },
  });

  function closeDialog() {
    setShowDialog(false);
    setEditSaleId(null);
    setProductId("");
    setQuantity("1");
    setPriceUnit("");
    setClientName("");
    setPaymentMethod("CASH");
    setNote("");
    setErrorMsg("");
  }

  function openEdit(sale: any) {
    setEditSaleId(sale.id);
    // On doit retrouver l'ID du produit depuis son nom
    const prod = products?.find((p: Product) => p.name === sale.productName);
    setProductId(prod ? String(prod.id) : "");
    setQuantity(String(sale.quantity));
    setPriceUnit(String(sale.priceUnit));
    setClientName(sale.clientName || "");
    setPaymentMethod(sale.paymentMethod || "CASH");
    setNote(sale.note || "");
    setErrorMsg("");
    setShowDialog(true);
  }

  function handleDelete(sale: any) {
    if (!confirm(`Supprimer la vente de "${sale.productName}" (${sale.quantity} x ${formatMAD(sale.priceUnit)}) ?\n\nLe stock sera automatiquement remis à jour.`)) return;
    deleteMut.mutate(sale.id);
  }

  const selectedProduct = products?.find((p: Product) => p.id === parseInt(productId));

  const handleProductChange = (id: string) => {
    setProductId(id);
    const product = products?.find((p: Product) => p.id === parseInt(id));
    if (product) setPriceUnit(String(product.priceSell));
  };

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(priceUnit) || 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ventes produits</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Enregistrez les ventes — le stock est mis à jour automatiquement</p>
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
          <Button onClick={() => { setEditSaleId(null); setShowDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle vente
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-xl font-bold text-foreground">{formatMAD(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventes</p>
                <p className="text-xl font-bold text-foreground">{stats.totalSales}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Articles vendus</p>
                <p className="text-xl font-bold text-foreground">{stats.totalQuantity}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !sales || sales.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <ShoppingBag className="w-8 h-8 opacity-40" />
            Aucune vente ce mois-ci
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase min-w-[200px]">Produit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Qté</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">P.U.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Client</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{s.productName}</td>
                    <td className="px-4 py-3 text-sm text-center text-foreground">{s.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground whitespace-nowrap">{formatMAD(s.priceUnit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-foreground whitespace-nowrap">{formatMAD(s.total)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.clientName || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogue nouvelle vente / modification */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSaleId ? "Modifier la vente" : "Nouvelle vente"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saleMut.mutate(); }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label>Produit *</Label>
              <Select value={productId} onValueChange={handleProductChange}>
                <SelectTrigger><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {products?.map((p: Product) => (
                    <SelectItem key={p.id} value={String(p.id)} disabled={p.stockCurrent <= 0 && !editSaleId}>
                      {p.name} — {p.stockCurrent} {p.unit} {p.stockCurrent <= 0 ? "(Rupture)" : "en stock"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Stock disponible : <strong>{selectedProduct.stockCurrent} {selectedProduct.unit}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantité *</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prix unitaire (MAD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total à encaisser</span>
              <span className="text-lg font-bold text-primary">{formatMAD(totalAmount)}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Nom du client (optionnel)</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: Mme Fatima" />
            </div>

            <div className="space-y-1.5">
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="CARD">Carte bancaire</SelectItem>
                  <SelectItem value="TRANSFER">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Note (optionnel)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Annuler</Button>
              <Button
                type="submit"
                disabled={saleMut.isPending || !productId || !quantity || !priceUnit}
              >
                {saleMut.isPending ? "Enregistrement..." : (editSaleId ? "Enregistrer" : "Valider la vente")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
