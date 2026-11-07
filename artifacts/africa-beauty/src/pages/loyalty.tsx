import { useState } from "react";
import { Users, Star } from "lucide-react";

export default function LoyaltyPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Star className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fidélité</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Programme de fidélisation (à venir)</p>
        </div>
      </div>
      <div className="bg-card border border-card-border rounded-xl p-10 text-center text-muted-foreground">
        <Users className="w-12 h-12 mx-auto opacity-40 mb-3" />
        <p>Module de fidélité en cours de développement</p>
        <p className="text-sm mt-1">Suivi des points, offres et clients fidèles</p>
      </div>
    </div>
  );
}
