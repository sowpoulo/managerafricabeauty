import jsPDF from "jspdf";

export async function addWatermark(
  doc: jsPDF,
  type: "CONTRAT" | "PAIE" | "INTERNE" | "ATTESTATION" = "CONTRAT"
) {
  const W = 210;
  const H = 297;

  try {
    // Charger l'image depuis le dossier public
    const response = await fetch("/logo.png");
    if (!response.ok) throw new Error("Logo introuvable dans public/");
    
    const blob = await response.blob();
    const base64Logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Opacité très faible (8%)
      const gState = new (doc as any).GState({ opacity: 0.05 });
      doc.setGState(gState);

      const logoWidth = 130;
      const logoHeight = 130;
      const x = (W - logoWidth) / 2;
      const y = (H - logoHeight) / 2;

      // Ajouter le logo
      doc.addImage(base64Logo, "PNG", x, y, logoWidth, logoHeight, "", "FAST");

      // Texte légal
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text("ESTHETIQUE AND BEAUTY AFRICA", W / 2, y + logoHeight + 10, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("RC : 491871 | ICE : 002723052000007", W / 2, y + logoHeight + 16, { align: "center" });

      // Mention selon le document
      if (type === "PAIE") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("DOCUMENT BANCAIRE — CONFIDENTIEL", W / 2, y + logoHeight + 25, { align: "center" });
      } else if (type === "CONTRAT") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("CONTRAT DE TRAVAIL", W / 2, y + logoHeight + 25, { align: "center" });
      } else if (type === "ATTESTATION") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("ATTESTATION OFFICIELLE", W / 2, y + logoHeight + 25, { align: "center" });
      }

      // Réinitialiser l'opacité pour le reste du document
      doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
      doc.setTextColor(0, 0, 0);
    }
  } catch (error) {
    console.error("Erreur filigrane:", error);
    // Si le logo ne charge pas, on met juste un filigrane texte pour ne pas bloquer le PDF
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(40);
    doc.text("AFRICABEAUTY", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);
  }
}
