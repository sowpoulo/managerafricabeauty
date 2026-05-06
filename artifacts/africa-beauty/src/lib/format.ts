import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return "";
  try {
    return format(parseISO(isoString), "dd/MM/yyyy HH:mm", { locale: fr });
  } catch (e) {
    return isoString;
  }
}

export function formatDateDay(isoString: string): string {
  if (!isoString) return "";
  try {
    return format(parseISO(isoString), "dd/MM/yyyy", { locale: fr });
  } catch (e) {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  if (!isoString) return "";
  try {
    return format(parseISO(isoString), "HH:mm", { locale: fr });
  } catch (e) {
    return isoString;
  }
}
