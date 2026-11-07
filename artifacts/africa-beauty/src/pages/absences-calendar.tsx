import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("africa_beauty_token");
}

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type Absence = {
  id: number;
  employeeName: string;
  type: "CONGE" | "MALADIE" | "ABSENCE";
  dateStart: string;
  dateEnd: string;
  status: string;
};

const TYPE_COLORS: Record<string, string> = {
  CONGE: "bg-green-100 text-green-700 border-green-300",
  MALADIE: "bg-orange-100 text-orange-700 border-orange-300",
  ABSENCE: "bg-red-100 text-red-700 border-red-300",
};

const TYPE_SHORT: Record<string, string> = {
  CONGE: "C",
  MALADIE: "M",
  ABSENCE: "A",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AbsencesCalendarPage() {
  const { role } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const { data: absences, isLoading } = useQuery({
    queryKey: ["absences", year, month],
    queryFn: () => apiFetch("/absences"),
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Grouper les absences par jour
  const absencesByDay: Record<string, Absence[]> = {};
  if (absences) {
    // Filtrer les absences approuvées seulement
    const approved = absences.filter((a: Absence) => a.status === "APPROVED");
    for (const a of approved) {
      const start = new Date(a.dateStart);
      const end = new Date(a.dateEnd);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        if (!absencesByDay[key]) absencesByDay[key] = [];
        absencesByDay[key].push(a);
      }
    }
  }

  const monthName = new Date(year, month).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendrier des congés</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vue d'ensemble des absences approuvées</p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <button
            onClick={() => {
              if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); }
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-foreground">{monthName}</span>
          <button
            onClick={() => {
              if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); }
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="py-1.5">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-lg bg-muted/10" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = formatDateKey(year, month, day);
                const dayAbsences = absencesByDay[dateKey] || [];
                const isToday = new Date().toISOString().split("T")[0] === dateKey;

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg p-1 border transition-all ${
                      dayAbsences.length > 0
                        ? "border-primary/30 bg-primary/5"
                        : isToday
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:border-primary/20"
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"} text-right px-0.5`}>
                        {day}
                      </span>
                      <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-y-auto max-h-[60px]">
                        {dayAbsences.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            className={`text-[9px] font-medium px-1 py-0.5 rounded ${TYPE_COLORS[a.type]}`}
                            title={`${a.employeeName} - ${a.type}`}
                          >
                            {a.employeeName.split(" ")[0]} {TYPE_SHORT[a.type]}
                          </div>
                        ))}
                        {dayAbsences.length > 3 && (
                          <div className="text-[9px] text-muted-foreground text-center">
                            +{dayAbsences.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(absencesByDay).length === 0 && (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                <CalendarOff className="w-8 h-8 opacity-40" />
                Aucun congé approuvé ce mois-ci
              </div>
            )}

            {/* Légende */}
            <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Légende :</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-200 border border-green-300" />
                Congé
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-200 border border-orange-300" />
                Maladie
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-200 border border-red-300" />
                Absence
              </span>
              <span className="ml-4 text-muted-foreground/60">{Object.keys(absencesByDay).length} jours avec absences</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
