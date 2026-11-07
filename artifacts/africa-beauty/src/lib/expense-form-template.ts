import jsPDF from "jspdf";
import { formatDateSafe } from "./date-utils";
import autoTable from "jspdf-autotable";
import { addWatermark } from "./pdf-watermark";

const COMPANY = {
  name: "ESTHETIQUE AND BEAUTY AFRICA",
  address: "63 BD EL HANK RDC, CASABLANCA",
  rc: "491871", ice: "002723052000007",
};

export async function generateExpenseFormPDF(form?: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;

  // En-tête
  doc.setFillColor(44, 44, 44);
  doc.rect(0, 0, W, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, W / 2, 15, { align: "center" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.address} | RC : ${COMPANY.rc} | ICE : ${COMPANY.ice}`, W / 2, 22, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("BON DE DÉPENSE", W / 2, 48, { align: "center" });

  // Infos générales
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`N° : ${form ? form.form_number : "________________"}`, 14, 60);
  doc.text(`Date : ${form ? formatDateSafe(form.date) : "____/____/________"}`, 14, 66);
  doc.text(`Demandeur : ${form ? form.requester_name : "_________________________________________"}`, 14, 72);
  doc.text(`Bénéficiaire : ${form ? form.beneficiary : "_____________________________________"}`, 14, 78);
  doc.text(`Motif : ${form ? form.reason : "_____________________________________________"}`, 14, 84);
  doc.text(`Paiement : ${form ? form.payment_method : "____________________"}`, 140, 60);

  // Tableau des dépenses
  const tableBody = form && form.items && form.items.length > 0
    ? form.items.map((item: any) => [
        item.description, 
        item.quantity.toString(), 
        item.unit_price.toFixed(2), 
        item.total_price.toFixed(2)
      ])
    : Array.from({ length: 10 }).map(() => ["", "", "", ""]);

  autoTable(doc, {
    startY: 90,
    head: [["Désignation", "Qté", "P.U. (DH)", "Total (DH)"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [44, 44, 44], textColor: 255, fontStyle: "bold", fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 3, minCellHeight: form ? 8 : 12 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" }
    },
  });

  // On récupère la position finale du tableau de manière synchrone
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Total
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(`TOTAL : ${form ? form.total_amount.toFixed(2) : "____________"} DH`, 196, finalY, { align: "right" });

  // Observations
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Observations :", 14, finalY + 15);
  doc.text(form && form.observations ? form.observations : "__________________________________________________________________", 14, finalY + 20);

  // Signatures
  const sigY = finalY + 50;
  doc.text("Signature du Demandeur", 40, sigY, { align: "center" });
  doc.text("Visa de la Direction", 160, sigY, { align: "center" });
  doc.line(14, sigY + 25, 80, sigY + 25);
  doc.line(130, sigY + 25, 196, sigY + 25);

  // Ajout du filigrane (attendre qu'il soit chargé)
  await addWatermark(doc, "INTERNE");
  
  // Sauvegarde finale
  doc.save(form ? `Bon_Depense_${form.form_number}.pdf` : "Bon_Depense_Vierge.pdf");
}
