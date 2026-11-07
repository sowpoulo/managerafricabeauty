import jsPDF from "jspdf";
import { formatDateSafe } from "./date-utils";
import { addWatermark } from "./pdf-watermark";

const COMPANY = {
  name: "ESTHETIQUE AND BEAUTY AFRICA",
  legalForm: "SOCIÉTÉ À RESPONSABILITE LIMITEE A ASSOCIE UNIQUE",
  capital: "100.000",
  address: "63 BD EL HANK RDC, CASABLANCA",
  rc: "491871",
  ice: "002723052000007",
  cnss: "2498080",
  website: "www.salonafricabeauty.com",
  email: "Salontima40@gmail.com",
  representative: "Mme Fatimata Dieck THIAM",
  role: "Gérante",
};

// Formater le nombre sans espace invisible (ex: 4000 -> "4 000")
function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Convertir le nombre en lettres (basique)
function numberToFrenchWords(n: number): string {
  if (n === 0) return "Zéro";
  const units = ["", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix", "Onze", "Douze", "Treize", "Quatorze", "Quinze", "Seize", "Dix-Sept", "Dix-Huit", "Dix-Neuf"];
  const tens = ["", "Dix", "Vingt", "Trente", "Quarante", "Cinquante", "Soixante", "Soixante-Dix", "Quatre-Vingt", "Quatre-Vingt-Dix"];

  if (n < 20) return units[n];
  if (n < 100) {
    const u = n % 10;
    const t = Math.floor(n / 10);
    return tens[t] + (u > 0 ? "-" + units[u] : "");
  }
  if (n < 1000) {
    const r = n % 100;
    const c = Math.floor(n / 100);
    return (c > 1 ? units[c] + " " : "") + "Cent" + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  if (n < 1000000) {
    const r = n % 1000;
    const m = Math.floor(n / 1000);
    return (m > 1 ? numberToFrenchWords(m) + " " : "") + "Mille" + (r > 0 ? " " + numberToFrenchWords(r) : "");
  }
  return n.toString();
}


function getCivility(gender?: string): string {
  if (gender === "F") return "Madame";
  if (gender === "M") return "Monsieur";
  return "Monsieur/Madame";
}

// Récupérer le logo
async function getHeaderLogo(): Promise<string> {
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
}

// Dessiner l'en-tête pro
function drawHeader(doc: jsPDF, logoBase64: string) {
  const W = 210;
  
  // Logo à gauche
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 15, 15, 25, 25, "", "FAST");
  }

  // Infos société à droite
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(44, 44, 44);
  doc.text(COMPANY.name, 45, 22);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(COMPANY.address, 45, 28);
  doc.text(`RC : ${COMPANY.rc} | IF : 48582152 | ICE : ${COMPANY.ice} | CNSS : ${COMPANY.cnss}`, 45, 33);
  doc.text(`Tél : +212 (0) 620503977 | Email : ${COMPANY.email}`, 45, 38);

  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, 46, 195, 46);
  doc.setTextColor(0, 0, 0);
}

// Dessiner le pied de page pro
function drawFooter(doc: jsPDF) {
  const W = 210;
  const H = 297;
  
  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, H - 20, 195, H - 20);

  // Texte du pied de page
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${COMPANY.name} - ${COMPANY.address}`, W / 2, H - 15, { align: "center" });
  doc.text(`Site web : ${COMPANY.website} | Email : ${COMPANY.email}`, W / 2, H - 10, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

function drawTitle(doc: jsPDF, title: string, y: number) {
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, y, { align: "center" });
  // Soulignement
  const textWidth = doc.getTextWidth(title);
  doc.setLineWidth(0.8);
  doc.line(105 - textWidth / 2, y + 2, 105 + textWidth / 2, y + 2);
}

// Fonction générique pour générer les textes sans bug d'espacement
function getBaseText(employee: any, extraText: string) {
  const prefix = employee.gender === "F" ? "Madame" : employee.gender === "M" ? "Monsieur" : "Monsieur/Madame";
  
  // Construire la description de la personne
  const birthStr = employee.birthDate ? `${employee.gender === "M" ? "né" : "née"} le ${employee.birthDate}` : "";
  const natStr = employee.nationality ? `de nationalité ${employee.nationality}` : "";
  const passStr = employee.passport ? `titulaire ${employee.idType === 'CIN' ? 'de la CIN' : employee.idType === 'Carte de séjour' ? 'de la carte de séjour' : 'du passeport'} numéro ${employee.passport}` : "";
  
  const details = [birthStr, natStr, passStr].filter(Boolean).join(", ");
  const detailsStr = details ? `, ${details}` : "";
  
  return `Nous soussigné la Société ${COMPANY.name}, ${COMPANY.legalForm} au capital de ${COMPANY.capital} dirhams, sis au ${COMPANY.address}, Maroc,\n\nAttestons par la présente que ${prefix} ${employee.name}${detailsStr}, ${extraText}`;
}

export async function generateAttestationSalaire(employee: { name: string; jobTitle: string; salary: number; birthDate?: string; nationality?: string; passport?: string; startDate?: string }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);

  const today = new Date().toLocaleDateString("fr-FR");
  const start = employee.startDate ? formatDateSafe(employee.startDate) : "01/01/2024";
  const salaryInWords = numberToFrenchWords(employee.salary);

  drawTitle(doc, "ATTESTATION DE SALAIRE", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const extra = `travaille au sein de la Société sis au ${COMPANY.address}, Maroc, en qualité de ${employee.jobTitle} et perçoit un Salaire de ${salaryInWords} Dirhams (${formatNumber(employee.salary)} DH) depuis le ${start}.\n\nLa présente attestation est délivrée à la demande de l'intéressé pour servir et valoir ce que de droit.`;
  
  const fullText = getBaseText(employee, extra);
  const splitText = doc.splitTextToSize(fullText, 170);
  doc.text(splitText, 20, 80);

  // Signatures
  doc.setFontSize(11);
  doc.text(`Fait à Casablanca le : ${today}`, 20, 220);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 140, 235, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.role, 140, 240, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "ATTESTATION");
  doc.save(`Attestation_Salaire_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateAttestationTravail(employee: { name: string; jobTitle: string; startDate?: string; birthDate?: string; nationality?: string; passport?: string }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);

  const today = new Date().toLocaleDateString("fr-FR");
  const start = employee.startDate ? formatDateSafe(employee.startDate) : "01/01/2024";

  drawTitle(doc, "ATTESTATION DE TRAVAIL", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const extra = `travaille au sein de la Société sis au ${COMPANY.address}, Maroc, en qualité de ${employee.jobTitle || "Employé(e)"} depuis le ${start}.\n\nLa présente attestation est délivrée à l'intéressé pour servir et valoir ce que de droit.`;
  
  const fullText = getBaseText(employee, extra);
  const splitText = doc.splitTextToSize(fullText, 170);
  doc.text(splitText, 20, 80);

  doc.setFontSize(11);
  doc.text(`Fait à Casablanca le : ${today}`, 20, 220);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 140, 235, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.role, 140, 240, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "ATTESTATION");
  doc.save(`Attestation_Travail_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateCertificatTravail(employee: { name: string; jobTitle: string; startDate?: string; endDate?: string; birthDate?: string; nationality?: string; passport?: string }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);

  const today = new Date().toLocaleDateString("fr-FR");
  const start = employee.startDate ? formatDateSafe(employee.startDate) : "01/01/2024";
  const end = employee.endDate ? formatDateSafe(employee.endDate) : "ce jour";

  drawTitle(doc, "CERTIFICAT DE TRAVAIL", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const extra = `a été employé(e) au sein de notre société du ${start} au ${end}, en qualité de ${employee.jobTitle}.\n\nL'intéressé(e) est libre de tout engagement envers notre société. Ce certificat est délivré conformément aux dispositions légales en vigueur pour servir et valoir ce que de droit.`;
  
  // Pour le certificat, on adapte le texte de base
  const birthStr = employee.birthDate ? `né(e) le ${employee.birthDate}, ` : "";
  const natStr = employee.nationality ? `de nationalité ${employee.nationality}, ` : "";
  const passStr = employee.passport ? `titulaire du passeport numéro ${employee.passport}, ` : "";
  
  const fullText = `Nous soussigné la Société ${COMPANY.name}, ${COMPANY.legalForm} au capital de ${COMPANY.capital} dirhams, sis au ${COMPANY.address}, Maroc,\n\nCertifions que Monsieur/Madame ${employee.name}, ${birthStr}${natStr}${passStr}${extra}`;
  
  const splitText = doc.splitTextToSize(fullText, 170);
  doc.text(splitText, 20, 80);

  doc.setFontSize(11);
  doc.text(`Fait à Casablanca le : ${today}`, 20, 220);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 140, 235, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.role, 140, 240, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "ATTESTATION");
  doc.save(`Certificat_Travail_${employee.name.replace(/\s/g, "_")}.pdf`);
}

// ===== NOUVEAUX DOCUMENTS =====

export async function generateAvenant(employee: any, newSalary?: number, newJobTitle?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");

  drawTitle(doc, "AVENANT AU CONTRAT DE TRAVAIL", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  let changes = "";
  if (newJobTitle && newJobTitle !== employee.jobTitle) changes += `- Le poste occupé devient : ${newJobTitle}\n`;
  if (newSalary && newSalary !== employee.salary) changes += `- La rémunération mensuelle brute passe à : ${numberToFrenchWords(newSalary)} Dirhams (${formatNumber(newSalary)} DH)\n`;

  const text = `Entre les soussignés :
La Société ${COMPANY.name}, ${COMPANY.legalForm} au capital de ${COMPANY.capital} dirhams, sis au ${COMPANY.address}, Maroc,
Représentée par ${COMPANY.representative}, en sa qualité de ${COMPANY.role},
D'UNE PART,

Et ${getCivility(employee.gender)} ${employee.name},
D'AUTRE PART,

Il a été convenu ce qui suit, modifiant le contrat de travail initial :

${changes || "- Modification des conditions de travail (à préciser)."}

Les autres clauses du contrat initial restent inchangées.
Fait à Casablanca, le ${today}, en deux exemplaires originaux.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  // Signatures
  doc.text("L'Employeur", 40, 210, { align: "center" });
  doc.text("L'Employé(e)", 160, 210, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 40, 230, { align: "center" });
  doc.text(employee.name, 160, 230, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "CONTRAT");
  doc.save(`Avenant_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateSoldeDeToutCompte(employee: any, endDate: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const end = endDate ? formatDateSafe(endDate) : today;

  drawTitle(doc, "SOLDE DE TOUT COMPTE", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Nous soussignés, la Société ${COMPANY.name}, attestons que ${getCivility(employee.gender)} ${employee.name}, a cessé ses fonctions au sein de notre société en date du ${end}.

Conformément à la législation en vigueur, nous lui avons versé l'ensemble des sommes dues au titre de la rupture de son contrat de travail (salaire du dernier mois, indemnité compensatrice de congés payés, et le cas échéant, indemnité de préavis et de licenciement).

L'intéressé(e) déclare avoir reçu l'intégralité de ces sommes et ne plus avoir aucune réclamation à formuler à l'encontre de la société.

Fait à Casablanca, le ${today}, en deux exemplaires originaux.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.text("L'Employeur", 40, 210, { align: "center" });
  doc.text("L'Employé(e) (Lu et approuvé)", 160, 210, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 40, 230, { align: "center" });
  doc.text(employee.name, 160, 230, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "ATTESTATION");
  doc.save(`Solde_Tout_Compte_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateRecuAvance(employee: any, amount: number, monthDeduction: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");

  drawTitle(doc, "REÇU D'AVANCE SUR SALAIRE", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const civility = getCivility(employee.gender);
  const text = `Je soussigné(e) ${civility} ${employee.name}, employé(e) au sein de la société ${COMPANY.name} en qualité de ${employee.jobTitle},

Reconnais avoir reçu de la part de mon employeur, à titre d'avance sur mon salaire, la somme de :
${numberToFrenchWords(amount)} Dirhams (${formatNumber(amount)} DH).

Cette somme sera déduite de mon salaire du mois de : ${monthDeduction || "........................"}.

Fait à Casablanca, le ${today}.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.text("Signature de l'Employé(e)", 105, 210, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(employee.name, 105, 230, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "PAIE");
  doc.save(`Recu_Avance_${employee.name.replace(/\s/g, "_")}.pdf`);
}

// ===== DOCUMENTS RH SUPPLÉMENTAIRES =====

export async function generatePromesseEmbauche(employee: any, startDate: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const start = startDate ? formatDateSafe(startDate) : today;
  const civility = getCivility(employee.gender);

  drawTitle(doc, "PROMESSE D'EMBAUCHE", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Nous soussignés, la Société ${COMPANY.name}, ${COMPANY.legalForm} au capital de ${COMPANY.capital} dirhams, sis au ${COMPANY.address}, Maroc,

Avons l'honneur de vous confirmer notre intention de vous embaucher en qualité de ${employee.jobTitle}, à compter du ${start}.

Les conditions de votre collaboration seront les suivantes :
- Rémunération brute mensuelle : ${numberToFrenchWords(employee.salary)} Dirhams (${formatNumber(employee.salary)} DH).
- Lieu de travail : ${COMPANY.address}.

Cette promesse est faite sous réserve de la signature du contrat de travail définitif et de la fourniture des documents administratifs requis.

Nous avons hâte de vous compter parmi nous.

Fait à Casablanca, le ${today}.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 140, 210, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.role, 140, 215, { align: "center" });
  
  doc.text(`Pour ${civility} ${employee.name}`, 40, 210, { align: "center" });
  doc.text("(Bon pour accord)", 40, 215, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "CONTRAT");
  doc.save(`Promesse_Embauche_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateLettreAvertissement(employee: any, reason: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const civility = getCivility(employee.gender);

  drawTitle(doc, "LETTRE D'AVERTISSEMENT", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Casablanca, le ${today}

À l'attention de ${civility} ${employee.name},
Poste : ${employee.jobTitle}

Objet : Avertissement

${civility},

Nous avons constaté un manquement à vos obligations professionnelles, à savoir :
"${reason || "Retards répétés / Non-respect des consignes"}"

Ce comportement perturbe le bon fonctionnement de notre établissement. Par la présente, nous vous notifions un avertissement formel.

Nous vous demandons de prendre les mesures nécessaires pour remédier immédiatement à cette situation. À défaut, nous serions contraints d'envisager des sanctions plus lourdes, conformément au Code du travail.

Veuillez agréer, ${civility}, l'expression de nos salutations distinguées.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 140, 220, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.role, 140, 225, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "INTERNE");
  doc.save(`Avertissement_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateDemandeConge(employee: any, startDate: string, endDate: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const civility = getCivility(employee.gender);
  const start = startDate ? formatDateSafe(startDate) : "......./......./.......";
  const end = endDate ? formatDateSafe(endDate) : "......./......./.......";

  drawTitle(doc, "FORMULAIRE DE DEMANDE DE CONGÉ", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `
Je soussigné(e) ${civility} ${employee.name}, occupant le poste de ${employee.jobTitle},

Ai l'honneur de solliciter l'autorisation de m'absenter pour congés payés, selon les dates suivantes :

Date de début : ${start}
Date de fin : ${end}

Motif (optionnel) : ..........................................................................

Signature de l'employé(e) : ....................................


----- CADRE RÉSERVÉ À LA DIRECTION -----

Avis du Manager :
[  ] Favorable
[  ] Défavorable

Date : ....../....../..........
Signature et Cachet :`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  // Cadre pour la direction
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, 150, 180, 60);

  drawFooter(doc);
  await addWatermark(doc, "INTERNE");
  doc.save(`Demande_Conge_${employee.name.replace(/\s/g, "_")}.pdf`);
}

// ===== GESTION DU PERSONNEL =====

export async function generateLettreDemission(employee: any, endDate: string, reason: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const end = endDate ? formatDateSafe(endDate) : today;
  const civility = getCivility(employee.gender);

  drawTitle(doc, "LETTRE DE DÉMISSION", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Casablanca, le ${today}

À l'attention de la Direction,
${COMPANY.name}
${COMPANY.address}

Objet : Démission de mes fonctions

${civility},

Par la présente, j'ai l'honneur de vous notifier ma décision de démissionner de mes fonctions de ${employee.jobTitle} au sein de votre société, à compter de la date d'aujourd'hui.

Conformément aux dispositions légales et à mon contrat de travail, je respecterai la période de préavis requise. Ma date de départ effectif est fixée au ${end}.

${reason ? `Motif : ${reason}\n\n` : ""}Je tiens à vous remercier pour l'opportunité qui m'a été offerte au sein de votre établissement et pour les relations professionnelles que j'ai pu y développer.

Veuillez agréer, ${civility}, l'expression de mes salutations distinguées.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.setFont("helvetica", "bold");
  doc.text(employee.name, 140, 220, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Signature de l'employé(e)", 140, 225, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "INTERNE");
  doc.save(`Lettre_Demission_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateFicheDePoste(employee: any, missions: string, schedule: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const civility = getCivility(employee.gender);

  drawTitle(doc, "FICHE DE POSTE", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Titre du poste : ${employee.jobTitle}
Titulaire du poste : ${civility} ${employee.name}
Date de mise à jour : ${today}

1. RATTACHEMENT HIÉRARCHIQUE
Le/La titulaire du poste est directement rattaché(e) à la Direction / Gérance du salon.

2. MISSIONS PRINCIPALES
${missions || "- Accueillir la clientèle et assurer les prestations de soins/coiffure.\n- Veiller à l'hygiène et à la propreté de son espace de travail.\n- Conseiller les clients sur les produits et services."}

3. HORAIRES DE TRAVAIL
${schedule || "Selon le planning hebdomadaire affiché au salon (ex: 44 heures par semaine)."}

4. COMPÉTENCES ET QUALITÉS REQUISES
- Sens du service client et de la communication.
- Maîtrise des techniques liées au poste.
- Ponctualité, discrétion et esprit d'équipe.

5. OBJECTIFS
Atteindre les objectifs de chiffre d'affaires fixés par la direction et fidéliser la clientèle.

L'employé(e) reconnaît avoir pris connaissance de cette fiche de poste et s'engage à en respecter le contenu.

Fait à Casablanca, le ${today}, en deux exemplaires originaux.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.setFont("helvetica", "bold");
  doc.text("L'Employeur", 40, 240, { align: "center" });
  doc.text("L'Employé(e)", 160, 240, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.representative, 40, 245, { align: "center" });
  doc.text(employee.name, 160, 245, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "INTERNE");
  doc.save(`Fiche_Poste_${employee.name.replace(/\s/g, "_")}.pdf`);
}

// ===== REGLEMENT INTERIEUR & EVALUATION =====

export async function generateReglementInterieur(employee: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const civility = getCivility(employee.gender);

  drawTitle(doc, "ATTESTATION DE PRISE DE CONNAISSANCE DU RÈGLEMENT", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Je soussigné(e) ${civility} ${employee.name}, employé(e) au sein de la société ${COMPANY.name} en qualité de ${employee.jobTitle},

Reconnais avoir reçu, lu et pris pleinement connaissance du Règlement Intérieur de l'établissement.

Je m'engage à en respecter toutes les dispositions, notamment en ce qui concerne :
- Les horaires de travail et la ponctualité.
- Les règles d'hygiène et de sécurité.
- Le devoir de réserve et la confidentialité.
- Le respect du matériel et des locaux.
- Les relations professionnelles avec la clientèle et l'équipe.

Je reconnais que le non-respect de ces règles pourra entraîner des sanctions disciplinaires conformément au Code du Travail et au Règlement Intérieur.

Fait à Casablanca, le ${today}, en deux exemplaires originaux.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.setFont("helvetica", "bold");
  doc.text("L'Employeur", 40, 210, { align: "center" });
  doc.text("L'Employé(e) (Lu et approuvé)", 160, 210, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.representative, 40, 230, { align: "center" });
  doc.text(employee.name, 160, 230, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "INTERNE");
  doc.save(`Reglement_Interieur_${employee.name.replace(/\s/g, "_")}.pdf`);
}

export async function generateEntretienEvaluation(employee: any, year: string, comments: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  const civility = getCivility(employee.gender);

  drawTitle(doc, `ENTRETIEN ANNUEL D'ÉVALUATION - ${year}`, 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Nom de l'employé(e) : ${civility} ${employee.name}`, 20, 80);
  doc.text(`Poste : ${employee.jobTitle}`, 20, 86);
  doc.text(`Date de l'entretien : ${today}`, 20, 92);

  // Tableau d'évaluation manuel
  const startY = 105;
  doc.setFont("helvetica", "bold");
  doc.text("CRITÈRES D'ÉVALUATION", 20, startY);
  doc.text("NOTE / 5", 160, startY);
  
  doc.setLineWidth(0.3);
  doc.line(20, startY + 2, 190, startY + 2);

  const criteria = [
    "Ponctualité et assiduité",
    "Qualité du travail et technique",
    "Relation avec la clientèle",
    "Esprit d'équipe et communication",
    "Atteinte des objectifs (CA)",
    "Respect des règles d'hygiène"
  ];

  doc.setFont("helvetica", "normal");
  criteria.forEach((c, index) => {
    const y = startY + 10 + (index * 8);
    doc.text(c, 20, y);
    doc.text("[   ] / 5", 160, y);
    doc.setDrawColor(240, 240, 240);
    doc.line(20, y + 2, 190, y + 2);
  });

  const commentsY = startY + 70;
  doc.setFont("helvetica", "bold");
  doc.text("COMMENTAIRES GÉNÉRAUX ET OBJECTIFS POUR L'ANNÉE PROCHAINE :", 20, commentsY);
  
  doc.setFont("helvetica", "normal");
  const commentText = comments || "...................................................................................................................................................................\n\n...................................................................................................................................................................\n\n...................................................................................................................................................................";
  const splitComments = doc.splitTextToSize(commentText, 170);
  doc.text(splitComments, 20, commentsY + 8);

  const sigY = commentsY + 50;
  doc.setFont("helvetica", "bold");
  doc.text("L'Employeur", 40, sigY, { align: "center" });
  doc.text("L'Employé(e)", 160, sigY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.representative, 40, sigY + 15, { align: "center" });
  doc.text(employee.name, 160, sigY + 15, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "INTERNE");
  doc.save(`Entretien_Evaluation_${employee.name.replace(/\s/g, "_")}_${year}.pdf`);
}

// ===== ATTESTATION DE DOMICILIATION DE SALAIRE =====

export async function generateAttestationDomiciliation(employee: any, bankName: string, bankRib: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getHeaderLogo();
  drawHeader(doc, logo);
  const today = new Date().toLocaleDateString("fr-FR");
  
  const civility = getCivility(employee.gender); // Monsieur ou Madame
  const accord = employee.gender === "F" ? "employée" : "employé";
  const amen = employee.gender === "F" ? "amenée" : "amené";

  drawTitle(doc, "ATTESTATION DE DOMICILIATION DE SALAIRE", 65);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const text = `Nous soussignés, la Société ${COMPANY.name}, ayant son siège social au ${COMPANY.address}, représentée par ${COMPANY.representative}, en sa qualité de ${COMPANY.role}, en vertu des pouvoirs qui lui ont été conférés à cet effet, attestons par la présente que nous nous engageons à virer les appointements de ${civility} ${employee.name} à son compte ouvert à la banque ${bankName || "________________________"} sous le numéro ${bankRib || "________________________________"}, et ce, tant que l'intéressé(e) demeure ${accord} dans notre société.

Dans le cas où ${civility} ${employee.name} serait ${amen} à nous quitter, nous ne manquerons pas de vous informer par écrit et de vous transférer son solde de tout compte.

Cette attestation lui est délivrée pour servir et valoir ce que de droit.`;

  const splitText = doc.splitTextToSize(text, 170);
  doc.text(splitText, 20, 80);

  doc.setFontSize(11);
  doc.text(`Fait à Casablanca, le : ${today}`, 20, 220);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.representative, 140, 235, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.role, 140, 240, { align: "center" });

  drawFooter(doc);
  await addWatermark(doc, "ATTESTATION");
  doc.save(`Attestation_Domiciliation_${employee.name.replace(/\s/g, "_")}.pdf`);
}
