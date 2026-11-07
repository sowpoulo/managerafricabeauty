import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle, Plus, Hand } from "lucide-react";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("africa_beauty_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
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

interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  rib: string;
  iban: string;
  is_default: boolean;
}

export default function BankImportPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ imported: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // État pour la saisie manuelle
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "CREDIT",
    category: "",
  });
  const [manualResult, setManualResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => apiFetch("/bank/account"),
  });

  // Mutation pour l'import PDF
  const importMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Aucun fichier sélectionné");
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/bank/import/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'import");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setUploadResult({ imported: data.imported, total: data.total });
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
      qc.invalidateQueries({ queryKey: ["bank-unreconciled"] });
      setFile(null);
      const input = document.getElementById("file-upload") as HTMLInputElement;
      if (input) input.value = "";
    },
    onError: (err: any) => {
      setError(err.message || "Erreur lors de l'import");
    },
  });

  // Mutation pour la saisie manuelle
  const manualMut = useMutation({
    mutationFn: async () => {
      const { date, description, amount, type, category } = manualForm;
      if (!date || !description || !amount || !type) {
        throw new Error("Tous les champs sont requis");
      }
      return apiFetch("/accounting/bank/import", {
        method: "POST",
        body: JSON.stringify({
          date,
          description,
          amount: parseFloat(amount) || 0,
          type,
          category: category || null,
        }),
      });
    },
    onSuccess: () => {
      setManualResult({ success: true, message: "Transaction ajoutée avec succès" });
      setManualForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        type: "CREDIT",
        category: "",
      });
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
      qc.invalidateQueries({ queryKey: ["bank-unreconciled"] });
    },
    onError: (err: any) => {
      setManualResult({ success: false, message: err.message || "Erreur lors de l'ajout" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setUploadResult(null);
      setError(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import relevé bancaire</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Importez un relevé bancaire (PDF) ou saisissez une transaction manuellement
        </p>
      </div>

      {/* Section Import PDF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importer un PDF
          </CardTitle>
          <CardDescription>
            Téléchargez votre relevé bancaire au format PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            <Button
              onClick={() => importMut.mutate()}
              disabled={!file || importMut.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              {importMut.isPending ? "Import en cours..." : "Importer"}
            </Button>
          </div>

          {file && (
            <p className="text-sm text-muted-foreground">
              Fichier sélectionné : <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </p>
          )}

          {uploadResult && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Import réussi : {uploadResult.imported} transactions importées sur {uploadResult.total}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Saisie manuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Saisie manuelle
          </CardTitle>
          <CardDescription>
            Ajouter une transaction bancaire directement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={manualForm.type}
                onValueChange={(v) => setManualForm({ ...manualForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">Encaissement (CREDIT)</SelectItem>
                  <SelectItem value="DEBIT">Débit (DEBIT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description / Libellé</Label>
              <Input
                placeholder="Ex: Virement client, Paiement fournisseur..."
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Montant (MAD)</Label>
              <Input
                type="number"
                placeholder="1500.00"
                value={manualForm.amount}
                onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie (optionnel)</Label>
              <Input
                placeholder="Ex: VENTE, SALAIRE, ACHAT..."
                value={manualForm.category}
                onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => manualMut.mutate()}
              disabled={manualMut.isPending}
              className="gap-2"
            >
              {manualMut.isPending ? "Ajout en cours..." : "Ajouter la transaction"}
            </Button>
          </div>

          {manualResult && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              manualResult.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}>
              {manualResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <p className={`text-sm font-medium ${
                manualResult.success ? "text-green-800" : "text-red-800"
              }`}>
                {manualResult.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des comptes bancaires */}
      {accounts && accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Comptes bancaires configurés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accounts.map((acc: BankAccount) => (
                <div key={acc.id} className="flex items-center justify-between p-2 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">{acc.bank_name}</p>
                    <p className="text-sm text-muted-foreground">{acc.account_name}</p>
                    {acc.rib && <p className="text-xs text-muted-foreground">RIB: {acc.rib}</p>}
                  </div>
                  {acc.is_default && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      Par défaut
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
