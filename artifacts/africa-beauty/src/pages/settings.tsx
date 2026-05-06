import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSalon, useUpdateSalon, getGetSalonQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const { data: salon, isLoading } = useGetSalon();
  const updateMut = useUpdateSalon();
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (salon) { setName(salon.name); setAddress(salon.address); }
  }, [salon]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate(
      { data: { name, address } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSalonQueryKey() });
          toast({ title: "Salon mis à jour", description: "Les informations ont été enregistrées." });
        },
      }
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Informations du salon</p>
      </div>

      <div className="max-w-lg">
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom du salon</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} required />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={updateMut.isPending}>
                  {updateMut.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
