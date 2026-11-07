import { useState } from "react";
import { Upload, FileText, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("africa_beauty_token");

interface Props {
  employeeId: number | string;
  side: "front" | "back";
  label: string;
  currentUrl?: string | null;
  onUploaded: () => void;
}

export function IdUploader({ employeeId, side, label, currentUrl, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/employees/${employeeId}/upload-id/${side}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur upload");
      }

      onUploaded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      await fetch(`${API_BASE}/employees/${employeeId}/upload-id/${side}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      onUploaded();
    } catch (err) {
      alert("Erreur suppression");
    }
  };

  const isImage = currentUrl && !currentUrl.endsWith(".pdf");

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      {currentUrl ? (
        <div className="border border-border rounded-lg p-3 bg-muted/20 space-y-2">
          <div className="flex items-center gap-2">
            {isImage ? (
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                <img src={currentUrl} alt={label} className="w-16 h-16 object-cover rounded border" />
              </a>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded border">
                <FileText className="w-6 h-6 text-red-500" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {isImage ? "Image importée" : "PDF importé"}
              </p>
              <p className="text-xs text-muted-foreground">Cliquez sur l'aperçu pour ouvrir</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => window.open(currentUrl, "_blank")}>
              <Eye className="w-3 h-3" /> Voir
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={handleDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors ${uploading ? "opacity-50" : ""}`}>
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Importer {label}</span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG ou PDF (max 5 Mo)</span>
            </>
          )}
          <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
