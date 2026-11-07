import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addWatermark } from "./pdf-watermark";

const COMPANY = {
  name: "ESTHETIQUE AND BEAUTY AFRICA",
  address: "63 BD EL HANK RDC CASABLANCA",
  rc: "491871", ice: "002723052000007", cnss: "2498080"
};

function formatMAD(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202F/g, " ").replace(/\u00A0/g, " ");
}

export async function generatePayslipPDF(employee: any, payrollData: any, month: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;

  // Variables de calcul
  const baseSalary = payrollData.netSalary || 0;
  const absenceDays = payrollData.absenceDays || 0;
  const dailyRate = payrollData.dailyRate || (baseSalary / 26);
  const absenceDeduction = payrollData.deductions || (dailyRate * absenceDays);
  const grossSalary = baseSalary - absenceDeduction;
  
  const cnssRate = 0.0448;
  const amoRate = 0.0226;
  const fraisProRate = 0.35; // 35% (standard)

  const cnssDeduction = grossSalary * cnssRate;
  const amoDeduction = grossSalary * amoRate;
  const fraisProDeduction = grossSalary * fraisProRate;
  
  const totalDeductions = cnssDeduction + amoDeduction;
  
  const cnssEmployer = grossSalary * 0.0898;
  const amoEmployer = grossSalary * 0.0411;
  const totalEmployer = cnssEmployer + amoEmployer;

  const netToPay = payrollData.toPay || (grossSalary - totalDeductions);

  const startStr = `01/${month.split('-')[1]}/${month.split('-')[0]}`;
  const endStr = `30/${month.split('-')[1]}/${month.split('-')[0]}`;

  // ===== EN-TÊTE =====
  // Titre avec fond vert clair
  doc.setFillColor(220, 240, 230); // Vert clair
  doc.rect(14, 15, 60, 10, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("BULLETIN DE PAIE", 16, 21);

  // Infos Entreprise à gauche
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.name, 14, 30);
  doc.text(COMPANY.address, 14, 34);
  doc.text(`RC: ${COMPANY.rc} | ICE: ${COMPANY.ice}`, 14, 38);

  // Infos Période à droite
  doc.setFontSize(8);
  doc.text(`Période du : ${startStr} au : ${endStr}`, W - 14, 18, { align: "right" });
  doc.text(`Paiement le : ${endStr} par : Virement`, W - 14, 24, { align: "right" });

  // ===== GRILLE DU HAUT (Matricule, Niveau, etc.) =====
  const topGridY = 42;
  autoTable(doc, {
    startY: topGridY,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
    body: [
      [
        { content: `Matricule : EMP-${String(employee.id).padStart(4, '0')}`, styles: { fontStyle: 'bold' } }, 
        { content: "Niveau : -" },
        { content: "Coefficient : -" },
        { content: "Indice : 0" },
        { content: "Ancienneté : 9 mois" },
        { content: "N° de Sécurité Sociale : 162597830" }
      ],
      [
        { content: "Catégorie : -" }, 
        { content: "Qualification : -", colSpan: 2 },
        { content: "Emploi occupé : " + employee.jobTitle, colSpan: 2 },
        { content: `N° AFF : ${COMPANY.cnss}` }
      ],
      [
        { content: "Horaire : 191,00" }, 
        { content: "Département : CCND", colSpan: 5 }
      ],
      [
        { content: "Repos comp. : 0" },
        { content: "Acquis : 13.500" },
        { content: "Reste à prendre : 0" },
        { content: "Pris : 0" }
      ]
    ],
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 36 }
    }
  });

  // ===== CASE EMPLOYÉ (Fond vert) =====
  const employeeBoxY = (doc as any).lastAutoTable.finalY + 2;
  doc.setFillColor(220, 240, 230);
  doc.rect(14, employeeBoxY, 182, 25, "F");
  doc.setDrawColor(0, 0, 0);
  doc.rect(14, employeeBoxY, 182, 25, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const fullName = (employee.gender === 'M' ? 'M ' : 'Mme ') + employee.name;
  doc.text(fullName, 50, employeeBoxY + 8);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(employee.address || "22 RUE GERCIF ETG 1 APPT 9", 50, employeeBoxY + 15);
  doc.text(employee.city || "CASA", 50, employeeBoxY + 20);

  // ===== TABLEAU PRINCIPAL =====
  const mainTableY = employeeBoxY + 27;
  autoTable(doc, {
    startY: mainTableY,
    theme: "grid",
    head: [
      [
        { content: "N", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Désignation", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Nombre", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Base", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Part salariale", colSpan: 2, styles: { halign: "center" } },
        { content: "Part patronale", colSpan: 3, styles: { halign: "center" } },
      ],
      [
        { content: "Taux" },
        { content: "Gain" },
        { content: "Retenue" },
        { content: "Taux" },
        { content: "Retenue (+)" },
        { content: "Retenue (-)" },
      ]
    ],
    body: [
      ["1", "SALAIRE DE BASE", "1,00", formatMAD(baseSalary), "", formatMAD(baseSalary), "", "", "", ""],
      ["24", "ABSENCE JRS", absenceDays.toFixed(2), formatMAD(dailyRate), "", formatMAD(absenceDeduction), "", "", "", ""],
      ["", "Total Brut", "", "", "", formatMAD(grossSalary), "", "", "", ""],
      ["701", "COTISATION CNSS", "", formatMAD(grossSalary), "4,48000", formatMAD(cnssDeduction), "8,98000", formatMAD(cnssEmployer), "0,00000", ""],
      ["755", "COTISATION AMO", "", formatMAD(grossSalary), "2,26000", formatMAD(amoDeduction), "4,11000", formatMAD(amoEmployer), "0,00000", ""],
      ["756", "Frais Professionnels", "", formatMAD(grossSalary), "35,00000", formatMAD(fraisProDeduction), "", "", "", ""],
      ["", "Total Cotisations", "", "", "", formatMAD(totalDeductions), "", "", formatMAD(totalEmployer), ""],
      ["996", "Arrodi du mois en cours", "", "", "", "1605,38", "", "", "", "503,46"] // Valeurs fixes comme sur votre image
    ],
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 12, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 15, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 15, halign: "right" },
      8: { cellWidth: 15, halign: "right" },
      9: { cellWidth: 17, halign: "right" },
    },
    didParseCell: (data) => {
      // Mettre en gras "Total Brut" et "Total Cotisations"
      if (data.row.index === 2 || data.row.index === 6) {
        data.cell.styles.fontStyle = "bold";
      }
    }
  });

  // ===== TABLEAU RÉCAPITULATIF (Pied de page) =====
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    theme: "grid",
    head: [
      ["Cumuls", "Salaire brut", "Net imposable", "Charges salariales", "Charges patronales", "Heures travaillées", "Heures sup.", "Avantages en nature", "NET A PAYER"]
    ],
    body: [
      [
        "Période", 
        formatMAD(grossSalary), 
        formatMAD(grossSalary - totalDeductions), 
        formatMAD(totalDeductions), 
        formatMAD(totalEmployer), 
        "191,00", 
        "0,00", 
        "0,00", 
        formatMAD(netToPay)
      ],
      [
        "Année", 
        formatMAD(grossSalary * 12), 
        formatMAD((grossSalary - totalDeductions) * 12), 
        formatMAD(totalDeductions * 12), 
        formatMAD(totalEmployer * 12), 
        "1146,00", 
        "0,00", 
        "0,00", 
        ""
      ]
    ],
    styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 22, halign: "right" },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 15, halign: "right" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 28, halign: "right", fontStyle: "bold", fillColor: [220, 240, 230] },
    },
    didParseCell: (data) => {
      if (data.column.index === 8) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 240, 230];
      }
    }
  });

  // Signature en bas
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Pour vous aider à faire valoir vos droits, conservez ce bulletin de paie sans limitation de durée.", 14, finalY);
  
  doc.setFont("helvetica", "normal");
  doc.text("Signature", W - 14, finalY, { align: "right" });

  await addWatermark(doc, "PAIE");
  doc.save(`Bulletin_Paie_${employee.name.replace(/\s/g, "_")}_${month}.pdf`);
}
