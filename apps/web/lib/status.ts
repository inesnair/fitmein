import type { MilestoneType, OfferStatus } from "./types";

export const STATUSES: { id: OfferStatus; label: string; color: string }[] = [
  { id: "analyse", label: "À analyser", color: "#6E6880" },
  { id: "nomatch", label: "Pas de match", color: "#5A5470" },
  { id: "todo", label: "À faire", color: "#FFB321" },
  { id: "progress", label: "En cours", color: "#A88BF5" },
  { id: "ok", label: "Terminée OK", color: "#3DBE84" },
  { id: "ko", label: "Terminée KO", color: "#EF5257" },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<OfferStatus, (typeof STATUSES)[number]>;

export const MILESTONE_LABEL: Record<MilestoneType, string> = {
  entretien_rh: "Entretien RH",
  entretien_manager: "Entretien manager",
  test_technique: "Test technique",
  cas_pratique: "Cas pratique",
  entretien_final: "Entretien final",
  proposition: "Proposition",
  autre: "Autre",
};

export const KO_REASONS = [
  "Profil pas assez senior", "Profil trop senior", "Compétence manquante",
  "Poste pourvu", "Salaire / TJM", "Pas de retour", "Autre",
];

export const LEVELS = ["Notions", "Intermédiaire", "Avancé", "Expert"];

export const scoreColor = (s: number) => (s >= 70 ? "#3DBE84" : s >= 50 ? "#FFB321" : "#EF5257");

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(iso).toLocaleDateString("fr-FR", opts);
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
