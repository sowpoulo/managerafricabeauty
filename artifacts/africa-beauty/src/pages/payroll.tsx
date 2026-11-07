import { useState } from "react";
import { formatDateSafe } from "@/lib/date-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Wallet, Check, Save, FileDown, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface PayrollRow {
  id: number;
  employeeId: number;
  employeeName: string;
  month: string;
  netSalary: number;
  absenceDays: number;
  dailyRate: number;
  deductions: number;
  advance: number;
  toPay: number;
  status: string;
  notes: string | null;
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
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  });
}

function PayrollRowEditor({ row }: { row: PayrollRow }) {
  const qc = useQueryClient();
  const [netSalary, setNetSalary] = useState(String(row.netSalary || ""));
  const [absenceDays, setAbsenceDays] = useState(String(row.absenceDays || ""));
  const [advance, setAdvance] = useState(String(row.advance || ""));
  const [dirty, setDirty] = useState(false);

  const updateMut = useMutation({
    mutationFn: () =>
      apiFetch(`/payroll/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          netSalary: parseFloat(netSalary) || 0,
          absenceDays: parseFloat(absenceDays) || 0,
          advance: parseFloat(advance) || 0,
        }),
      }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["payroll"] });
    },
  });

  const payMut = useMutation({
    mutationFn: () => apiFetch(`/payroll/${row.id}/pay`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5 font-medium text-sm text-foreground whitespace-nowrap">{row.employeeName}</td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          value={netSalary}
          onChange={(e) => { setNetSalary(e.target.value); setDirty(true); }}
          className="w-24 text-sm border border-border rounded-lg px-2 py-1 bg-background"
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          step="0.5"
          value={absenceDays}
          onChange={(e) => { setAbsenceDays(e.target.value); setDirty(true); }}
          className="w-16 text-sm border border-border rounded-lg px-2 py-1 bg-background"
        />
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{formatMAD(row.deductions)}</td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          value={advance}
          onChange={(e) => { setAdvance(e.target.value); setDirty(true); }}
          className="w-20 text-sm border border-border rounded-lg px-2 py-1 bg-background"
        />
      </td>
      <td className="px-4 py-2.5 font-semibold text-sm text-foreground whitespace-nowrap">{formatMAD(row.toPay)}</td>
      <td className="px-4 py-2.5">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${row.status === "PAID" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
          {row.status === "PAID" ? "Payé" : "En attente"}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {dirty && (
            <button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending}
              className="p-1.5 rounded hover:bg-primary/10 text-primary"
              title="Sauvegarder"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          )}
          {row.status !== "PAID" && (
            <button
              onClick={() => payMut.mutate()}
              disabled={payMut.isPending}
              className="p-1.5 rounded hover:bg-green-100 text-green-600"
              title="Marquer comme payé"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

async function exportVirementPDF(month: string, monthLabel: string) {
  const token = localStorage.getItem("africa_beauty_token");
  const res = await fetch(`/api/payroll/virement?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;

  // Format montant sans slash
  const fmtMAD = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ") + " MAD";

  // ===== EN-TÊTE =====
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ESTHETIQUE AND BEAUTY AFRICA", W / 2, 11, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Siège social : 63 Boulevard El Hank, Casablanca  |  RC : 491871", W / 2, 18, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ORDRE DE VIREMENT DES SALAIRES", W / 2, 29, { align: "center" });

  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Mois : ${monthLabel}  |  Date : ${today}`, W / 2, 35, { align: "center" });

  // ===== INFOS BANCAIRES =====
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 42, W - 28, 14, "F");
  doc.rect(14, 42, W - 28, 14, "S");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS BANCAIRES", 18, 48);
  doc.setFont("helvetica", "normal");
  doc.text("Banque : Attijariwafa Bank", 18, 54);
  doc.text("Compte à débiter : 007780000116800000083851", 105, 54);

  // ===== TABLEAU =====
  autoTable(doc, {
    startY: 60,
    head: [["N°", "Bénéficiaire", "Banque", "RIB", "Net à virer (MAD)"]],
    body: data.map((r: any, i: number) => [
      String(i + 1).padStart(2, "0"),
      r.name.toUpperCase(),
      r.bankName.toUpperCase(),
      r.bankRib,
      r.toPay.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 48 },
      2: { cellWidth: 32 },
      3: { cellWidth: 58 },
      4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
  });

  const tableEnd = (doc as any).lastAutoTable.finalY + 6;
  // Calcul sécurisé en centimes pour éviter les erreurs d'arrondis flottants
  const totalCents = data.reduce((s: number, r: any) => s + Math.round(r.toPay * 100), 0);
  const total = totalCents / 100;
  const totalFmt = total.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ===== RÉCAPITULATIF =====
  doc.setFillColor(245, 245, 245);
  doc.rect(14, tableEnd, W - 28, 14, "F");
  doc.rect(14, tableEnd, W - 28, 14, "S");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("RÉCAPITULATIF", 18, tableEnd + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre de bénéficiaires : ${data.length}`, 18, tableEnd + 11);
  doc.setFont("helvetica", "bold");
  doc.text(`Montant total net à virer : ${totalFmt} MAD`, 105, tableEnd + 11);

  const legalY = tableEnd + 20;

  // ===== TEXTE LÉGAL =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "Nous vous prions de bien vouloir procéder au virement des salaires ci-dessus au titre du mois de",
    W / 2, legalY, { align: "center" }
  );
  doc.text(
    `${monthLabel}, en débitant le compte indiqué ci-dessus.`,
    W / 2, legalY + 5, { align: "center" }
  );

  // ===== VALIDATION =====
  const valY = legalY + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("VALIDATION", W / 2, valY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fait à Casablanca, le ${today}`, W / 2, valY + 7, { align: "center" });
  doc.text("Bon pour virement", W / 2, valY + 13, { align: "center" });

  // Cadre signature
  const sigBoxX = 65;
  const sigBoxY = valY + 18;
  const sigBoxW = 80;
  const sigBoxH = 28;
  doc.rect(sigBoxX, sigBoxY, sigBoxW, sigBoxH);

  // Ligne signature
  doc.setLineDashPattern([1, 1], 0);
  doc.line(sigBoxX + 8, sigBoxY + 18, sigBoxX + sigBoxW - 8, sigBoxY + 18);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Signature + Cachet", W / 2, sigBoxY + 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Madame Fatimata Dieck THIAM", W / 2, sigBoxY + 27, { align: "center" });
  doc.text("Gérante", W / 2, sigBoxY + 31, { align: "center" });

  doc.save(`ordre-virement-${monthLabel.replace(/\s/g, "-")}.pdf`);
}


function exportPayrollPDF(rows: PayrollRow[], monthLabel: string) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("AfricaBeauty - Fiche de Paie", 14, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Mois : ${monthLabel}`, 14, 26);
  doc.text(`Date d'export : ${new Date().toLocaleDateString("fr-FR")}`, 14, 32);

  const tableData = rows.map((r) => [
    r.employeeName,
    formatMAD(r.netSalary),
    String(r.absenceDays),
    formatMAD(r.deductions),
    formatMAD(r.advance),
    formatMAD(r.toPay),
    r.status === "PAID" ? "Payé" : "En attente",
  ]);

  const handleAccounting = async () => {
    if (!confirm("Voulez-vous comptabiliser la masse salariale de ce mois dans les dépenses ?")) return;
    setIsAccounting(true);
    try {
      const token = localStorage.getItem("africa_beauty_token");
      const res = await fetch(`/api/payroll/${selectedMonth}/account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message + "\nCoût total : " + data.details.totalCost + " MAD");
      } else {
        alert("⚠️ " + data.error);
      }
    } catch (e) {
      alert("Erreur lors de la comptabilisation");
    } finally {
      setIsAccounting(false);
    }
  };

  const totalToPay = rows.reduce((sum, r) => sum + r.toPay, 0);
  tableData.push(["TOTAL", "", "", "", "", formatMAD(totalToPay), ""]);

  autoTable(doc, {
    startY: 38,
    head: [["Nom", "Salaire net", "Jours absence", "Retenue", "Avance", "À payer", "Statut"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [254, 243, 199];
      }
    },
  });

  doc.save(`paie-${monthLabel.replace(/\s/g, "-")}.pdf`);
}

export default function PayrollPage() {
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [isAccounting, setIsAccounting] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["payroll", selectedMonth],
    queryFn: () => apiFetch(`/payroll?month=${selectedMonth}`),
  });

  const handleAccounting = async () => {
    if (!confirm("Voulez-vous comptabiliser la masse salariale de ce mois dans les dépenses ?")) return;
    setIsAccounting(true);
    try {
      const token = localStorage.getItem("africa_beauty_token");
      const res = await fetch(`/api/payroll/${selectedMonth}/account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message + "\nCoût total : " + data.details.totalCost + " MAD");
      } else {
        alert("⚠️ " + data.error);
      }
    } catch (e) {
      alert("Erreur lors de la comptabilisation");
    } finally {
      setIsAccounting(false);
    }
  };

  const totalToPay = rows?.reduce((sum: number, r: PayrollRow) => sum + r.toPay, 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion de la paie</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Calcul automatique selon absences et avances</p>
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            disabled={!rows || rows.length === 0 || isAccounting}
            onClick={handleAccounting}
          >
            <FileText className="w-4 h-4" />
            {isAccounting ? "Comptabilisation..." : "Comptabiliser la Paie"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!rows || rows.length === 0}
            onClick={() => {
              const label = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;
              exportPayrollPDF(rows, label);
            }}
          >
            <FileDown className="w-4 h-4" />
            Exporter PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            disabled={!rows || rows.length === 0 || isAccounting}
            onClick={handleAccounting}
          >
            <FileText className="w-4 h-4" />
            {isAccounting ? "Comptabilisation..." : "Comptabiliser la Paie"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!rows || rows.length === 0}
            onClick={() => {
              const label = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;
              exportVirementPDF(selectedMonth, label);
            }}
          >
            <FileText className="w-4 h-4" />
            Ordre de virement
          </Button>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total à payer ce mois</p>
            <p className="text-xl font-bold text-foreground">{formatMAD(totalToPay)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{rows?.length || 0} employées</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salaire net</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jours absence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retenue</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">À payer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows?.map((row: PayrollRow) => (
                  <PayrollRowEditor key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
