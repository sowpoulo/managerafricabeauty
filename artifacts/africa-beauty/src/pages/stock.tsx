import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Package, AlertTriangle, TrendingUp, History, Pencil, ArrowUp, ArrowDown, RotateCcw , FileSpreadsheet, Download} from "lucide-react";
import { formatEuro } from "@/lib/format";
import * as XLSX from "xlsx";

const API_BASE = "/api";
function getToken() { return localStorage.getItem("africa_beauty_token"); }
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

interface Product {
  id: number; name: string; description: string;
  priceBuy: number; priceSell: number;
  stockCurrent: number; stockAlert: number;
  unit: string; active: boolean;
  categoryId: number; categoryName: string;
}

interface Category { id: number; name: string; }

const MOVEMENT_TYPES = [
  { value: "IN", label: "Entrée (achat)", icon: ArrowUp, color: "text-green-600" },
  { value: "OUT", label: "Sortie (vente/utilisation)", icon: ArrowDown, color: "text-red-600" },
  { value: "ADJUST", label: "Ajustement inventaire", icon: RotateCcw, color: "text-blue-600" },
];

const REASONS: Record<string, string[]> = {
  IN: ["ACHAT", "RETOUR", "DON"],
  OUT: ["VENTE", "UTILISATION", "PERTE", "CASSE"],
  ADJUST: ["INVENTAIRE"],
};

function MovementDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("ACHAT");
  const [priceUnit, setPriceUnit] = useState(String(product.priceBuy));
  const [note, setNote] = useState("");

  const { data: history } = useQuery({
    queryKey: ["stock-movements", product.id],
    queryFn: () => apiFetch(`/stock/movements/${product.id}`),
  });

  const mut = useMutation({
    mutationFn: () => apiFetch("/stock/movements", {
      method: "POST",
      body: JSON.stringify({ productId: product.id, type, quantity: parseInt(quantity), reason, priceUnit: parseFloat(priceUnit), note }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-dashboard"] });
      qc.invalidateQueries({ queryKey: ["stock-movements", product.id] });
      setQuantity(""); setNote("");
    },
  });


  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product.name} — Mouvement de stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stock actuel</span>
            <span className={`text-lg font-bold ${product.stockCurrent <= product.stockAlert ? "text-red-600" : "text-foreground"}`}>
              {product.stockCurrent} {product.unit}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Type de mouvement</Label>
            <div className="grid grid-cols-3 gap-2">
              {MOVEMENT_TYPES.map(t => (
                <button key={t.value} onClick={() => { setType(t.value); setReason(REASONS[t.value][0]); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${type === t.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                  <t.icon className={`w-4 h-4 ${t.color}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motif</Label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {REASONS[type].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {type === "IN" && (
            <div className="space-y-1.5">
              <Label>Prix unitaire d'achat (MAD)</Label>
              <Input type="number" value={priceUnit} onChange={e => setPriceUnit(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Note (optionnel)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Fournisseur ABC..." />
          </div>

          <Button className="w-full" disabled={!quantity || mut.isPending} onClick={() => mut.mutate()}>
            Enregistrer le mouvement
          </Button>

          {history && history.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Historique récent
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {history.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${m.type === "IN" ? "text-green-600" : m.type === "OUT" ? "text-red-600" : "text-blue-600"}`}>
                      {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "="}{m.quantity} {product.unit}
                    </span>
                    <span className="text-muted-foreground">{m.reason}</span>
                    <span className="text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("fr-FR")}</span>
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

export default function StockPage() {
  const qc = useQueryClient();
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", priceBuy: "", priceSell: "", stockCurrent: "", stockAlert: "5", unit: "unité", categoryId: "" });

  const { data: dashboard } = useQuery({ queryKey: ["stock-dashboard"], queryFn: () => apiFetch("/stock/dashboard") });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch("/stock/categories") });
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", selectedCategory, showLowStock],
    queryFn: () => {
      let url = "/stock/products?";
      if (selectedCategory !== "all") url += `categoryId=${selectedCategory}&`;
      if (showLowStock) url += "lowStock=true";
      return apiFetch(url);
    },
  });

  const createMut = useMutation({
    mutationFn: () => apiFetch("/stock/products", { method: "POST", body: JSON.stringify({ ...form, priceBuy: parseFloat(form.priceBuy), priceSell: parseFloat(form.priceSell), stockCurrent: parseInt(form.stockCurrent), stockAlert: parseInt(form.stockAlert), categoryId: form.categoryId || null }) }),
    onSuccess: () => { setShowProductDialog(false); setForm({ name: "", description: "", priceBuy: "", priceSell: "", stockCurrent: "", stockAlert: "5", unit: "unité", categoryId: "" }); qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["stock-dashboard"] }); },
  });

  const editMut = useMutation({
    mutationFn: () => apiFetch(`/stock/products/${editProduct!.id}`, { method: "PATCH", body: JSON.stringify({ ...form, priceBuy: parseFloat(form.priceBuy), priceSell: parseFloat(form.priceSell), stockAlert: parseInt(form.stockAlert) }) }),
    onSuccess: () => { setEditProduct(null); qc.invalidateQueries({ queryKey: ["products"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/stock/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description || "", priceBuy: String(p.priceBuy), priceSell: String(p.priceSell), stockCurrent: String(p.stockCurrent), stockAlert: String(p.stockAlert), unit: p.unit, categoryId: String(p.categoryId) });
  }


  const exportToExcel = () => {
    if (!products || products.length === 0) {
      alert("Aucun produit à exporter.");
      return;
    }

    // Préparation des données
    const data = [
      ["Nom", "Catégorie", "Prix Achat (MAD)", "Transport (MAD)", "Marge Bénéfice (%)", "Prix de Vente (MAD)", "Stock Actuel", "Alerte Stock", "Unité"]
    ];

    products.forEach((p: any) => {
      data.push([
        p.name,
        p.categoryName || "-",
        p.priceBuy || 0,
        50, // Coût transport par défaut (modifiable dans Excel)
        60, // Marge par défaut (modifiable dans Excel)
        null, // La formule sera ajoutée ici
        p.stockCurrent || 0,
        p.stockAlert || 0,
        p.unit || "pièce"
      ]);
    });

    // Créer la feuille Excel
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajouter la formule de calcul dans la colonne "Prix de Vente" (Colonne F)
    for (let i = 1; i < data.length; i++) {
      const row = i + 1;
      // Formule : (Prix Achat + Transport) * (1 + Marge/100)
      ws[`F${row}`] = { 
        t: 'n', 
        f: `(C${row}+D${row})*(1+E${row}/100)` 
      };
    }

    // Créer le classeur et télécharger
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `export_stock_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion du Stock</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Suivi des produits et mouvements</p>
        </div>
        <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Exporter Excel
              </Button>
              <Button onClick={() => setShowProductDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau produit
        </Button>
            </div>
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total produits</span>
            </div>
            <p className="text-2xl font-bold">{dashboard.totalProducts}</p>
          </div>
          <div className={`bg-card border rounded-xl p-4 shadow-sm ${dashboard.lowStockCount > 0 ? "border-red-300" : "border-card-border"}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 ${dashboard.lowStockCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              <span className="text-sm text-muted-foreground">Stock faible</span>
            </div>
            <p className={`text-2xl font-bold ${dashboard.lowStockCount > 0 ? "text-red-500" : ""}`}>{dashboard.lowStockCount}</p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Valeur stock</span>
            </div>
            <p className="text-2xl font-bold">{formatEuro(dashboard.stockValue)}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground">
          <option value="all">Toutes catégories</option>
          {categories?.map((c: Category) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <button onClick={() => setShowLowStock(!showLowStock)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${showLowStock ? "bg-red-50 border-red-300 text-red-700" : "border-border bg-card text-foreground"}`}>
          ⚠️ Stock faible uniquement
        </button>
      </div>

      {/* Tableau produits */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : !products?.length ? (
          <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Package className="w-8 h-8 opacity-40" />
            Aucun produit trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Produit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Catégorie</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Prix achat</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Prix vente</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p: Product) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.categoryName || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${p.stockCurrent <= p.stockAlert ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {p.stockCurrent} {p.unit}
                      </span>
                      {p.stockCurrent <= p.stockAlert && (
                        <p className="text-xs text-red-500 mt-0.5">⚠️ Seuil: {p.stockAlert}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">{formatEuro(p.priceBuy)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{formatEuro(p.priceSell)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => setMovementProduct(p)} className="p-1.5 rounded hover:bg-primary/10 transition-colors" title="Mouvement stock">
                          <Package className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => { if (confirm("Désactiver ce produit ?")) deleteMut.mutate(p.id); }} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                          <span className="text-destructive/70 text-xs font-bold">✕</span>
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

      {/* Dialog Nouveau/Edit Produit */}
      {(showProductDialog || editProduct) && (
        <Dialog open onOpenChange={() => { setShowProductDialog(false); setEditProduct(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editProduct ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); editProduct ? editMut.mutate() : createMut.mutate(); }} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nom du produit *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">Sans catégorie</option>
                  {categories?.map((c: Category) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prix d'achat (MAD)</Label>
                  <Input type="number" step="0.01" value={form.priceBuy} onChange={e => setForm({ ...form, priceBuy: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix de vente (MAD)</Label>
                  <Input type="number" step="0.01" value={form.priceSell} onChange={e => setForm({ ...form, priceSell: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {!editProduct && (
                  <div className="space-y-1.5">
                    <Label>Stock initial</Label>
                    <Input type="number" value={form.stockCurrent} onChange={e => setForm({ ...form, stockCurrent: e.target.value })} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Seuil alerte</Label>
                  <Input type="number" value={form.stockAlert} onChange={e => setForm({ ...form, stockAlert: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unité</Label>
                  <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowProductDialog(false); setEditProduct(null); }}>Annuler</Button>
                <Button type="submit" disabled={createMut.isPending || editMut.isPending}>
                  {editProduct ? "Modifier" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {movementProduct && <MovementDialog product={movementProduct} onClose={() => setMovementProduct(null)} />}
    </div>
  );
}
