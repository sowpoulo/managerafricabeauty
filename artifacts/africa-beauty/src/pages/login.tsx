import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Email ou mot de passe incorrect");
      }

      const data = await res.json();
      
      // On utilise notre propre fonction login qui stocke le token correctement
      login(data.token, data.user);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-sidebar-primary -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-accent translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative text-center px-12">
          <h1 className="text-5xl font-serif font-bold text-sidebar-primary-foreground mb-4 leading-tight">
            Africa<span className="text-sidebar-primary">Beauty</span>
          </h1>
          <p className="text-sidebar-foreground/60 text-lg max-w-xs mx-auto leading-relaxed">
            La plateforme de gestion pour les salons de coiffure professionnels
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { label: "Gestion des RDV", desc: "Planning complet" },
              { label: "Suivi du CA", desc: "Statistiques en temps réel" },
              { label: "Equipe", desc: "Gestion des employés" },
              { label: "Rapports", desc: "Export PDF mensuel" },
            ].map((item) => (
              <div key={item.label} className="bg-sidebar-accent/50 rounded-lg p-3">
                <div className="text-sidebar-primary-foreground font-medium text-sm">{item.label}</div>
                <div className="text-sidebar-foreground/50 text-xs mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-4xl font-serif font-bold text-foreground">
              Africa<span className="text-primary">Beauty</span>
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
            <p className="text-muted-foreground mt-1 text-sm">Connectez-vous à votre espace de gestion</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoFocus
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Gestionnaire par defaut — manager@africabeauty.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
