import { useState } from "react";
import { useGetMySchedule } from "@workspace/api-client-react";
import { formatEuro, formatDateTime, formatTime } from "@/lib/format";
import { Clock, User, Scissors } from "lucide-react";

type View = "day" | "week";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-50 border-blue-200 text-blue-700",
  IN_PROGRESS: "bg-orange-50 border-orange-200 text-orange-700",
  COMPLETED: "bg-green-50 border-green-200 text-green-700",
  CANCELLED: "bg-red-50 border-red-200 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export default function MySchedulePage() {
  const [view, setView] = useState<View>("day");
  const { data: appointments, isLoading } = useGetMySchedule({ view }, { query: { enabled: true } });

  const title = view === "day" ? "Planning du jour" : "Planning de la semaine";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mon planning</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{title}</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("day")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === "day" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === "week" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Cette semaine
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : !appointments?.length ? (
        <div className="bg-card border border-card-border rounded-xl p-12 text-center">
          <Scissors className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Aucun rendez-vous</p>
          <p className="text-muted-foreground/60 text-sm mt-1">
            {view === "day" ? "Pas de rendez-vous aujourd'hui" : "Pas de rendez-vous cette semaine"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => (
            <div key={appt.id} className={`bg-card border rounded-xl p-5 shadow-sm border-l-4 ${STATUS_COLORS[appt.status] || "border-l-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[appt.status]}`}>
                      {STATUS_LABELS[appt.status] || appt.status}
                    </span>
                    <span className="text-sm font-bold text-foreground">{formatTime(String(appt.date))}</span>
                  </div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {appt.clientName}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5" />
                      {appt.service?.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {appt.service?.duration} min
                    </span>
                  </div>
                  {view === "week" && (
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(String(appt.date))}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{formatEuro(appt.price)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
