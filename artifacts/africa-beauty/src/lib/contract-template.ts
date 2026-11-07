import jsPDF from "jspdf";
import { formatDateSafe } from "./date-utils";
import { addWatermark } from "./pdf-watermark";

function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}


interface ContractData {
  employeeName: string;
  employeeBirthDate?: string;
  employeeNationality?: string;
  employeePassport?: string;
  employeeIdType?: string;
  employeeIdNumber?: string;
  employeeGender?: string;
  contractType: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  workingHours?: number;
  trialPeriodMonths?: number;
}

function getCivility(gender?: string): string {
  if (gender === "F") return "Madame";
  if (gender === "M") return "Monsieur";
  return "Madame/Monsieur";
}

const COMPANY = {
  name: "ESTHETIQUE AND BEAUTY AFRICA",
  address: "63 BOULEVARD EL HANK, CASABLANCA",
  rc: "491871",
  if: "48582152",
  ice: "002723052000007",
  cnss: "2498080",
  phone: "+212 (0) 620503977 / +212 (0) 808596192",
  email: "Salontima40@gmail.com",
  representative: "Madame FATIMATA DIECK THIAM",
  representativeNationality: "Sénégalaise",
  representativeCard: "BE66524V",
  representativeRole: "gérante",
};

function formatDateFr(dateStr: string): string {
  return formatDateSafe(dateStr);
}

export async function generateContractPDF(data: ContractData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 20; // marge
  const maxY = 270; // limite avant pied de page
  let y = 20;

  const footer = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const footerText = `Siège social : ${COMPANY.address}, RC: ${COMPANY.rc} | IF: ${COMPANY.if} | ICE: ${COMPANY.ice} | CNSS: ${COMPANY.cnss}`;
      doc.text(footerText, W / 2, 285, { align: "center" });
      doc.text(`Tél : ${COMPANY.phone} | Email : ${COMPANY.email}`, W / 2, 289, { align: "center" });
      doc.text(`Page ${i} / ${pageCount}`, W / 2, 293, { align: "center" });
    }
  };

  const checkPage = (needed: number = 10) => {
    if (y + needed > maxY) {
      footer();
      doc.addPage();
      y = 20;
    }
  };

  const addParagraph = (text: string, options: { bold?: boolean; size?: number; indent?: number; align?: "left" | "center" | "justify" } = {}) => {
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size || 10);
    doc.setTextColor(0, 0, 0);
    const indent = options.indent || 0;
    const maxWidth = W - 2 * M - indent;
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      checkPage(6);
      doc.text(line, M + indent, y);
      y += 5;
    }
    y += 1;
  };

  const addArticle = (title: string, content: string[]) => {
    checkPage(20);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(title, M, y);
    y += 6;

    for (const para of content) {
      addParagraph(para, { size: 10 });
    }
  };

  // ===== TITRE =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Contrat de travail à durée ${data.contractType === "CDD" ? "déterminée" : "indéterminée"}`, W / 2, y, { align: "center" });
  y += 15;

  // ===== PARTIES =====
  addParagraph("Entre", { bold: true, size: 11 });
  addParagraph(
    `La société ${COMPANY.name} dont le siège social est au ${COMPANY.address}, immatriculée au Registre de Commerce sous le numéro ${COMPANY.rc}. Représentée par ${COMPANY.representative} de nationalité ${COMPANY.representativeNationality}, titulaire de la carte d'immatriculation numéro ${COMPANY.representativeCard} agissant en sa qualité de ${COMPANY.representativeRole}.`,
    { size: 10 }
  );
  addParagraph("Ci-après dénommée la \"société\"", { bold: true, size: 10, align: "center" });
  y += 2;
  addParagraph("D'UNE PART", { bold: true, size: 11, align: "center" });
  y += 3;
  addParagraph("ET", { bold: true, size: 11, align: "center" });
  y += 3;

  const civility = getCivility(data.employeeGender);
  const bornWord = data.employeeGender === "M" ? "né" : "née";
  const details = [
    data.employeeBirthDate ? `${bornWord} le ${formatDateFr(data.employeeBirthDate)}` : "",
    data.employeeNationality ? `de nationalité ${data.employeeNationality}` : "",
    data.employeeIdNumber ? `titulaire ${data.employeeIdType === 'CIN' ? 'de la CIN' : data.employeeIdType === 'Carte de séjour' ? 'de la carte de séjour' : 'du passeport'} numéro ${data.employeeIdNumber}` : "",
  ].filter(Boolean).join(", ");

  const employeeDetails = details
    ? `${civility} ${data.employeeName}, ${details}.`
    : `${civility} ${data.employeeName}.`;

  addParagraph(employeeDetails, { size: 10 });
  addParagraph("Ci-après dénommée le \"Salarié\"", { bold: true, size: 10, align: "center" });
  y += 2;
  addParagraph("D'AUTRE PART", { bold: true, size: 11, align: "center" });
  y += 3;
  addParagraph("Ci-après conjointement dénommée les « parties » et séparément « partie »", { size: 9, align: "center" });
  y += 3;

  addParagraph("Il a été convenu et arrêté ce qui suit :", { bold: true, size: 11 });
  y += 3;

  // ===== ARTICLE 1 : ENGAGEMENT =====
  addArticle("ARTICLE 1 : ENGAGEMENT", [
    `La société ${COMPANY.name} engage le salarié pour une durée ${data.contractType === "CDD" ? "déterminée" : "indéterminée"} pour la période allant du ${formatDateFr(data.startDate)}${data.endDate ? ` au ${formatDateFr(data.endDate)}` : ""}.`,
    "Le salarié accepte cet engagement dans les conditions ci-après définies, et :",
    "• Déclare formellement n'être lié à aucune entreprise et avoir quitté son emploi libre de tout engagement, y compris de non-concurrence sur sa zone d'activité de son affectation géographique telle que reprise à l'article 2 ci-après, à la date de son entrée en fonction.",
    "• Certifie l'exactitude des indications fournies dans son dossier de candidature et lors de l'entretien d'embauche, sous peine de résiliation immédiate de plein droit et sans aucune indemnité en cas de fourniture d'indication inexacte.",
    "• Doit fournir, dans le délai d'un mois, un extrait de casier judiciaire datant de moins de 3 mois qu'il a indiqué être vierge. Dans le cas où il résulterait de la fourniture de cette pièce, le présent contrat sera résilié de plein droit, sans aucune indemnité ni préavis.",
    "• Doit conformément à la législation du travail, passé l'examen médical d'embauche. Dans le cas d'une inaptitude dûment constatée au poste repris à l'article 2, le présent contrat serait résilié de plein droit, sans aucune indemnité, notamment de préavis.",
    "• Doit justifier de son domicile ou de sa résidence et signaler tout changement au gérant, dans les huit jours.",
    "Il accepte de se conformer au règlement intérieur de la société et de veiller à son application par ses fonctions hiérarchiques éventuelles (un exemplaire de ce règlement intérieur lui sera remis ultérieurement).",
  ]);

  // ===== ARTICLE 2 : FONCTION =====
  addArticle("ARTICLE 2 : FONCTION", [
    `Le salarié, au titre de sa première affectation géographique, est engagé à la société ${COMPANY.name} en qualité de ${data.jobTitle}.`,
  ]);

  // ===== ARTICLE 3 : REMUNERATION =====
  addArticle("ARTICLE 3 : REMUNERATION", [
    `La rémunération est constituée d'appointement fixe brut mensuel de ${formatNumber(data.baseSalary)} DH.`,
    "Bien entendu, l'ensemble de votre rémunération sera soumis aux retenues légales ainsi qu'à celles relatives aux régimes de retraite et de mutuelle auxquels la société est affiliée.",
  ]);

  // ===== ARTICLE 4 : PERIODE D'ESSAI =====
  addArticle("ARTICLE 4 : PERIODE D'ESSAI", [
    `Le salarié est à l'essai pendant une période de ${data.trialPeriodMonths || 3} mois, renouvelable pour une période équivalente conformément à la législation en vigueur.`,
    "En cas d'absence pour congés maladie ou autre, la période d'essai est prolongée de la durée de cette absence.",
    "En outre, les périodes de formation ainsi que les stages de formation à l'initiative des supérieurs hiérarchiques du salarié pouvant être effectués dans un ou plusieurs établissements de la société au cours desquelles le salarié n'occupe pas effectivement le poste pour lequel il a été embauché, prolongent au maximum la période d'essai du tiers de sa durée initialement prévue.",
    "Durant la période d'essai, les parties peuvent se séparer sans préavis ni indemnité d'aucune sorte.",
  ]);

  // ===== ARTICLE 5 : MOBILITE GEOGRAPHIQUE =====
  addArticle("ARTICLE 5 : MOBILITE GEOGRAPHIQUE", [
    "De convention expresse, le lieu de travail ne constitue pas un élément substantiel du présent contrat.",
    "Pour permettre la mise en œuvre d'éventuelle promotion ainsi que la répartition d'affectation que la société estimera utile aux besoins de son activité, le salarié s'engage à accepter sans réserve toute mutation géographique que la société pourra lui demander.",
    "Si la mutation n'implique pas changement de résidence, la société la notifiera au moins trois mois à l'avance et remboursera au salarié les frais justifiés de déménagement (selon devis préalablement soumis par le salarié pour acceptation). Et les frais de voyage du salarié et de sa famille (conjoint et personne à charge).",
    "L'engagement du salarié concernant sa mobilité géographique aux conditions qui précèdent constitue une clause fondamentale du présent contrat, sans l'acceptation de laquelle la société n'aurait pas embauché le salarié.",
    "En cas de violation de son engagement par le salarié, celui-ci prendra donc l'initiative et assumera la responsabilité exclusive de la rupture. Il sera alors, de convention expresse, réputé démissionnaire.",
  ]);

  // ===== ARTICLE 6 : CONGES PAYES =====
  addArticle("ARTICLE 6 : CONGES PAYES", [
    "La durée des congés payés est de 18 jours ouvrables par année de service. En cas d'année incomplète, la durée des congés est calculée au prorata temporis. L'époque de prise de congé sera fixée d'un commun accord entre la société et le salarié compte tenu des exigences du service.",
  ]);

  // ===== ARTICLE 7 : COMPTES RENDUS D'ACTIVITE =====
  addArticle("ARTICLE 7 : COMPTES RENDUS D'ACTIVITE", [
    "Le salarié rendra compte périodiquement de sa fonction à son supérieur hiérarchique et établira tout rapport qui lui sera demandé par ce dernier.",
  ]);

  // ===== ARTICLE 8 : EXCLUSIVITE DE SERVICE =====
  addArticle("ARTICLE 8 : EXCLUSIVITE DE SERVICE", [
    "Pendant toute la durée du présent contrat, le salarié doit réserver à la société l'exclusivité de ses services et ne peut avoir aucune activité professionnelle, même de non-concurrence, sauf accord écrit préalable de la direction.",
  ]);

  // ===== ARTICLE 9 : SECRET PROFESSIONNEL =====
  addArticle("ARTICLE 9 : SECRET PROFESSIONNEL", [
    "Le salarié s'engage formellement à ne divulguer à qui que ce soit, tant pendant l'exercice du présent contrat qu'après sa fin de quelque cause que ce soit, aucune indication notamment sur l'organisation, les méthodes de travail, les projets, les études, la politique commerciale, les moyens promotionnels et les actions de formation de la société ou de ses clients.",
  ]);

  // ===== ARTICLE 10 : USAGE ET RESTITUTION DES BIENS DE LA SOCIETE =====
  addArticle("ARTICLE 10 : USAGE ET RESTITUTION DES BIENS DE LA SOCIETE", [
    "Le matériel, la correspondance, la documentation (originaux et copies), confiés au salarié pour l'exécution de ses fonctions demeurent la propriété de la société.",
    "En outre, le salarié s'interdit de donner à ce matériel un usage autre que professionnel ainsi que d'en faire des copies ou reproduction pour son usage personnel ou tout usage.",
    "Le salarié s'engage également à restituer le matériel, la correspondance, la documentation ainsi que toute copie ou reproduction en sa possession, le jour même où il cessera définitivement ses fonctions, pour quelque raison que ce soit, sans qu'il soit besoin d'une demande ou d'une mise en demeure préalable de la société.",
  ]);

  // ===== ARTICLE 11 : CONFORMITE A LA LOI 09-08 =====
  addArticle("ARTICLE 11 : CONFORMITE A LA LOI 09-08", [
    `Je soussigné(e), permet à mon employeur ${COMPANY.name} de collecter et traiter mes données personnelles en vue d'assurer la gestion administrative de mon dossier (paie, gestion de carrière). Ainsi, pour lui permettre de répondre à ses obligations légales, ces données peuvent être transmises aux organismes de la prévoyance sociale (CNSS, CIMR...) aux services des impôts, d'assurances et aux établissements financiers.`,
    "Ce traitement a fait l'objet d'une demande d'autorisation auprès de la CNDP sous le numéro A-RH-495/2019 DU 29/04/2020.",
    "Vous pouvez vous adresser au service RH pour exercer vos droits d'accès, de rectification et d'opposition conformément aux dispositions de la loi 09-08.",
    "Le salarié voudra bien retourner au gérant un exemplaire du présent contrat, revêtu de sa signature qui devra être légalisée, précédée de la mention (manuscrite).",
    "Il apposera également ses initiales au bas de chaque page.",
  ]);

  // ===== SIGNATURES =====
  y += 5;
  checkPage(50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Fait à Casablanca", M, y);
  y += 5;
  doc.text(`Le ${formatDateFr(data.startDate)}`, M, y);
  y += 5;
  doc.text("En Trois exemplaires.", M, y);
  y += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Employé(e)", M + 10, y);
  doc.text(`LA SOCIETE << ${COMPANY.name} >>`, W - M - 10, y, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Signature précédée de la mention", M, y);
  doc.text("\"Lu et approuvé\"", M, y + 5);
  y += 10;
  doc.text("_______________________", M, y);
  y += 5;
  doc.text(data.employeeName, M, y);

  doc.text("Cachet et signature de la société", W - M - 50, y - 20, { align: "right" });
  doc.rect(W - M - 55, y - 15, 55, 30);

  footer();
  await addWatermark(doc, "CONTRAT");

  doc.save(`contrat-${data.employeeName.replace(/\s/g, "-")}-${formatDateFr(data.startDate).replace(/\//g, "-")}.pdf`);
}
