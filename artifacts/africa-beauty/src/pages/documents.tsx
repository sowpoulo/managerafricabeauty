import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText, FileCheck, Award, Printer, AlertCircle,
  RefreshCw, Receipt, UserPlus, AlertTriangle, Calendar,
  FileMinus, ClipboardList, BookOpen
} from "lucide-react";
import {
  generateAttestationTravail,
  generateAttestationSalaire,
  generateCertificatTravail,
  generateAvenant,
  generateSoldeDeToutCompte,
  generateRecuAvance,
  generatePromesseEmbauche,
  generateLettreAvertissement,
  generateDemandeConge,
  generateLettreDemission,
  generateFicheDePoste,
  generateReglementInterieur,
  generateEntretienEvaluation,
  generateAttestationDomiciliation
} from "@/lib/document-templates";
import { generatePayslipPDF } from "@/lib/payslip-template";

const API_BASE = "/api";
function getToken() { return localStorage.getItem("africa_beauty_token"); }

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Employee { id: number; name: string; bank_name?: string; bank_rib?: string; }

export default function DocumentsPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Section 2
  const [newSalary, setNewSalary] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [endDate, setEndDate] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [deductionMonth, setDeductionMonth] = useState("");

  // Section 3
  const [promiseStartDate, setPromiseStartDate] = useState("");
  const [warningReason, setWarningReason] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");

  // Section 4
  const [resignationDate, setResignationDate] = useState("");
  const [resignationReason, setResignationReason] = useState("");
  const [jobMissions, setJobMissions] = useState("");
  const [jobSchedule, setJobSchedule] = useState("");

  // Section 5
  const [evalYear, setEvalYear] = useState(new Date().getFullYear().toString());
  const [evalComments, setEvalComments] = useState("");

  // Bulletin de paie
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["users-documents"],
    queryFn: () => apiFetch("/users?role=EMPLOYEE&active=true"),
  });

  const { data: contracts, isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts-for-docs", selectedEmployeeId],
    queryFn: () => apiFetch("/contracts"),
    enabled: !!selectedEmployeeId,
  });

  const selectedEmployee = employees?.find((e: Employee) => e.id === parseInt(selectedEmployeeId));
  const activeContract = contracts?.find(
    (c: any) => c.employeeId === parseInt(selectedEmployeeId) && c.status === "ACTIVE"
  );

  const saveDocumentLog = async (employeeId: number, docType: string, docTitle: string) => {
    try {
      const token = getToken();
      await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employeeId, documentType: docType, title: docTitle }),
      });
    } catch (e) {
      console.error("Erreur log doc", e);
    }
  };

  const getEmpData = () => {
    if (!selectedEmployee || !activeContract) return null;
    return {
      id: parseInt(selectedEmployeeId),
      name: selectedEmployee.name,
      jobTitle: activeContract.jobTitle || activeContract.job_title || "Employé(e)",
      salary: activeContract.baseSalary,
      startDate: activeContract.startDate,
      endDate: activeContract.endDate,
      birthDate: activeContract.birthDate ? new Date(activeContract.birthDate).toLocaleDateString("fr-FR") : "",
      nationality: activeContract.nationality || "",
      passport: activeContract.passportNumber || activeContract.idNumber || "",
      gender: activeContract.gender || "",
      idType: activeContract.idType || "Passeport",
    };
  };

  const handleGenerate = async (type: string) => {
    const data = getEmpData();
    if (!data) return;
    const empId = parseInt(selectedEmployeeId);

    try {
      if (type === "travail") { await generateAttestationTravail(data); await saveDocumentLog(empId, "ATTESTATION_TRAVAIL", "Attestation de Travail"); }
      if (type === "salaire") { await generateAttestationSalaire(data); await saveDocumentLog(empId, "ATTESTATION_SALAIRE", "Attestation de Salaire"); }
      if (type === "certificat") { await generateCertificatTravail(data); await saveDocumentLog(empId, "CERTIFICAT_TRAVAIL", "Certificat de Travail"); }
      if (type === "avenant") { await generateAvenant(data, parseFloat(newSalary) || undefined, newJobTitle || undefined); await saveDocumentLog(empId, "AVENANT", "Avenant au Contrat"); }
      if (type === "solde") { await generateSoldeDeToutCompte(data, endDate || new Date().toISOString()); await saveDocumentLog(empId, "SOLDE_COMPTE", "Solde de Tout Compte"); }
      if (type === "avance") { await generateRecuAvance(data, parseFloat(advanceAmount) || 0, deductionMonth); await saveDocumentLog(empId, "RECU_AVANCE", "Reçu d'Avance"); }
      if (type === "promesse") { await generatePromesseEmbauche(data, promiseStartDate); await saveDocumentLog(empId, "PROMESSE_EMBAUCHE", "Promesse d'Embauche"); }
      if (type === "avertissement") { await generateLettreAvertissement(data, warningReason); await saveDocumentLog(empId, "AVERTISSEMENT", "Lettre d'Avertissement"); }
      if (type === "conge") { await generateDemandeConge(data, leaveStartDate, leaveEndDate); await saveDocumentLog(empId, "DEMANDE_CONGE", "Demande de Congé"); }
      if (type === "demission") { await generateLettreDemission(data, resignationDate, resignationReason); await saveDocumentLog(empId, "DEMISSION", "Lettre de Démission"); }
      if (type === "ficheposte") { await generateFicheDePoste(data, jobMissions, jobSchedule); await saveDocumentLog(empId, "FICHE_POSTE", "Fiche de Poste"); }
      if (type === "reglement") { await generateReglementInterieur(data); await saveDocumentLog(empId, "REGLEMENT_INTERIEUR", "Règlement Intérieur"); }
      if (type === "evaluation") { await generateEntretienEvaluation(data, evalYear, evalComments); await saveDocumentLog(empId, "ENTRETIEN_EVALUATION", `Entretien Annuel ${evalYear}`); }
      if (type === "domiciliation") { await generateAttestationDomiciliation(data, selectedEmployee?.bank_name || "", selectedEmployee?.bank_rib || ""); await saveDocumentLog(empId, "ATTESTATION_DOMICILIATION", "Attestation de Domiciliation"); }
      
      if (type === "bulletin") {
        const payrollList = await apiFetch(`/payroll?month=${payMonth}`);
        const empPayroll = payrollList.find((p: any) => p.employeeId === empId);
        
        if (!empPayroll) {
          alert("Aucune donnée de paie trouvée pour ce mois. Veuillez d'abord configurer la paie dans le module Paie.");
          return;
        }
        
        await generatePayslipPDF(data, empPayroll, payMonth);
        await saveDocumentLog(empId, "BULLETIN_PAIE", `Bulletin de Paie - ${payMonth}`);
      }
    } catch (err) {
      console.error("Erreur génération PDF:", err);
      alert("Erreur lors de la génération du PDF. Vérifiez la console.");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents Officiels</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Générez tous les documents RH avec le logo et le filigrane de la société.
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Sélectionner une employée</label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Choisir une employée..." />
            </SelectTrigger>
            <SelectContent>
              {loadingEmployees ? (
                <SelectItem value="loading" disabled>Chargement...</SelectItem>
              ) : (
                employees?.map((e: Employee) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <>
            {loadingContracts ? (
              <div className="p-6 text-center text-muted-foreground">Chargement du contrat...</div>
            ) : !activeContract ? (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Aucun contrat actif trouvé</p>
                  <p className="text-sm text-red-600 mt-1">
                    Veuillez d'abord créer un contrat pour cette employée dans l'onglet "Contrats".
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Contrat actif : {activeContract.jobTitle} — {activeContract.baseSalary.toLocaleString("fr-FR")} MAD
                  </p>
                </div>

                {/* SECTION 1 */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 border-b pb-2">1. Attestations de base</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => handleGenerate("travail")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group">
                      <FileText className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-foreground text-sm text-center">Attestation de Travail</span>
                    </button>
                    <button onClick={() => handleGenerate("salaire")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group">
                      <FileCheck className="w-8 h-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-foreground text-sm text-center">Attestation de Salaire</span>
                    </button>
                    <button onClick={() => handleGenerate("certificat")} className="flex flex-col items-center justify-center p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group">
                      <Award className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-foreground text-sm text-center">Certificat de Travail</span>
                    </button>
                  </div>
                  
                  <div className="mt-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Attestation de Domiciliation de Salaire</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedEmployee?.bank_name && selectedEmployee?.bank_rib 
                          ? `✅ Domiciliation liée au profil : ${selectedEmployee.bank_name} — RIB : ${selectedEmployee.bank_rib}`
                          : "⚠️ Aucune information bancaire enregistrée. Le PDF affichera des pointillés à remplir."}
                      </p>
                    </div>
                    <button onClick={() => handleGenerate("domiciliation")} className="flex items-center justify-center gap-2 p-2 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors whitespace-nowrap h-9 px-4 w-fit">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold text-sm">Générer l'Attestation</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 2 */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 border-b pb-2">2. Documents complémentaires</h3>

                  <div className="mb-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Nouveau poste (optionnel)</Label>
                        <Input value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} placeholder="Ex: Manager" />
                      </div>
                      <div>
                        <Label className="text-xs">Nouveau salaire (optionnel)</Label>
                        <Input type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)} placeholder="Ex: 5000" />
                      </div>
                    </div>
                    <button onClick={() => handleGenerate("avenant")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors whitespace-nowrap">
                      <RefreshCw className="w-5 h-5" />
                      <span className="font-semibold text-sm">Avenant</span>
                    </button>
                  </div>

                  <div className="mb-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Date de fin de contrat</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <button onClick={() => handleGenerate("solde")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-destructive text-destructive hover:bg-destructive/5 transition-colors whitespace-nowrap">
                      <FileText className="w-5 h-5" />
                      <span className="font-semibold text-sm">Solde de Tout Compte</span>
                    </button>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Montant de l'avance (MAD)</Label>
                        <Input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="Ex: 1000" />
                      </div>
                      <div>
                        <Label className="text-xs">Mois de retenue</Label>
                        <Input value={deductionMonth} onChange={e => setDeductionMonth(e.target.value)} placeholder="Ex: Novembre 2026" />
                      </div>
                    </div>
                    <button onClick={() => handleGenerate("avance")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-orange-500 text-orange-600 hover:bg-orange-50 transition-colors whitespace-nowrap">
                      <Receipt className="w-5 h-5" />
                      <span className="font-semibold text-sm">Reçu d'Avance</span>
                    </button>
                  </div>

                  {/* BULLETIN DE PAIE */}
                  <div className="mt-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Bulletin de Paie (Format Marocain)</p>
                      <p className="text-xs text-muted-foreground mt-1">Génère le bulletin avec les cotisations CNSS et AMO.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Mois de paie</Label>
                        <Input type="month" value={payMonth} onChange={e => setPayMonth(e.target.value)} />
                      </div>
                      <button onClick={() => handleGenerate("bulletin")} className="flex items-center justify-center gap-2 p-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap h-9">
                        <FileText className="w-4 h-4" />
                        <span className="font-semibold text-sm">Générer le Bulletin</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION 3 */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 border-b pb-2">3. Gestion RH & Discipline</h3>

                  <div className="mb-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Date d'embauche prévue</Label>
                      <Input type="date" value={promiseStartDate} onChange={e => setPromiseStartDate(e.target.value)} />
                    </div>
                    <button onClick={() => handleGenerate("promesse")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap">
                      <UserPlus className="w-5 h-5" />
                      <span className="font-semibold text-sm">Promesse d'Embauche</span>
                    </button>
                  </div>

                  <div className="mb-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Motif de l'avertissement</Label>
                      <Input value={warningReason} onChange={e => setWarningReason(e.target.value)} placeholder="Ex: Retards répétés..." />
                    </div>
                    <button onClick={() => handleGenerate("avertissement")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold text-sm">Avertissement</span>
                    </button>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Début du congé</Label>
                        <Input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Fin du congé</Label>
                        <Input type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} />
                      </div>
                    </div>
                    <button onClick={() => handleGenerate("conge")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-purple-500 text-purple-600 hover:bg-purple-50 transition-colors whitespace-nowrap">
                      <Calendar className="w-5 h-5" />
                      <span className="font-semibold text-sm">Demande de Congé</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 4 */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 border-b pb-2">4. Gestion du Personnel</h3>

                  <div className="mb-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Date de départ</Label>
                        <Input type="date" value={resignationDate} onChange={e => setResignationDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Motif (optionnel)</Label>
                        <Input value={resignationReason} onChange={e => setResignationReason(e.target.value)} placeholder="Ex: Projet personnel" />
                      </div>
                    </div>
                    <button onClick={() => handleGenerate("demission")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap">
                      <FileMinus className="w-5 h-5" />
                      <span className="font-semibold text-sm">Lettre de Démission</span>
                    </button>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg border border-border flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Missions principales (optionnel)</Label>
                        <textarea
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                          value={jobMissions}
                          onChange={e => setJobMissions(e.target.value)}
                          placeholder="Laissez vide pour le texte par défaut..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Horaires / Planning (optionnel)</Label>
                        <textarea
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                          value={jobSchedule}
                          onChange={e => setJobSchedule(e.target.value)}
                          placeholder="Laissez vide pour le texte par défaut..."
                        />
                      </div>
                    </div>
                    <button onClick={() => handleGenerate("ficheposte")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 transition-colors">
                      <ClipboardList className="w-5 h-5" />
                      <span className="font-semibold text-sm">Fiche de Poste</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 5 */}
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 border-b pb-2">5. Règlement & Évaluation</h3>

                  <div className="mb-4 bg-muted/20 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">Règlement Intérieur Signé</p>
                      <p className="text-xs text-muted-foreground mt-1">Page de garde : l'employé reconnaît avoir lu et approuvé le règlement.</p>
                    </div>
                    <button onClick={() => handleGenerate("reglement")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-indigo-500 text-indigo-600 hover:bg-indigo-50 transition-colors whitespace-nowrap">
                      <BookOpen className="w-5 h-5" />
                      <span className="font-semibold text-sm">Règlement Intérieur</span>
                    </button>
                  </div>

                  <div className="bg-muted/20 p-4 rounded-lg border border-border flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <Label className="text-xs">Année d'évaluation</Label>
                        <Input value={evalYear} onChange={e => setEvalYear(e.target.value)} placeholder="Ex: 2026" />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs">Commentaires (optionnel)</Label>
                        <Input value={evalComments} onChange={e => setEvalComments(e.target.value)} placeholder="Objectifs pour l'année prochaine..." />
                      </div>
                    </div>
                    <button onClick={() => handleGenerate("evaluation")} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-pink-500 text-pink-600 hover:bg-pink-50 transition-colors">
                      <Award className="w-5 h-5" />
                      <span className="font-semibold text-sm">Grille d'Entretien Annuel</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground mb-2">
          <Printer className="w-4 h-4" /> À savoir
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Tous les documents sont générés en PDF avec le logo officiel et le filigrane de sécurité.</li>
          <li>Les données de base proviennent du contrat actif de l'employée.</li>
          <li>Le salaire en lettres est calculé automatiquement.</li>
          <li>Chaque génération est enregistrée dans l'historique de la base de données.</li>
        </ul>
      </div>
    </div>
  );
}
