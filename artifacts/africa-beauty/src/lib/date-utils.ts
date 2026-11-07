// Formate une date sans décalage de fuseau horaire
export function formatDateSafe(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  
  // CAS 1 : C'est déjà une chaîne au format ISO (YYYY-MM-DD...)
  if (typeof dateStr === "string") {
    // On extrait directement les parties de la chaîne (pas de conversion UTC)
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
    // Si ce n'est pas une date ISO, on tente le parse normal
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return formatFromDateObject(d);
  }
  
  // CAS 2 : C'est un objet Date
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return "-";
    return formatFromDateObject(dateStr);
  }
  
  return "-";
}

// Formate un objet Date en utilisant les méthodes UTC (pas locales)
function formatFromDateObject(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Version longue : "14 octobre 2026"
export function formatDateLong(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  
  if (typeof dateStr === "string") {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const m = parseInt(month, 10) - 1;
      return `${parseInt(day, 10)} ${months[m]} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return "-";
    return `${dateStr.getUTCDate()} ${months[dateStr.getUTCMonth()]} ${dateStr.getUTCFullYear()}`;
  }
  
  return "-";
}
