import { supabase } from "./supabase";
import type { Match, OfferStatus, Referential } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : "Erreur");
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.detail ?? "Erreur inattendue");
  return body as T;
}

export interface DuplicateInfo { offer_id: string; title: string; company: string; score: number | null; status: OfferStatus; created_at: string }
export interface AnalyseResult { id: string; title: string; company: string; location: string; score: number; status: OfferStatus; match: Match; summary: string }
export interface CvResult { document_id: string; file_name: string; download_url: string; removed_items: string[]; keywords_used: string[]; gaps: string[] }

export const api = {
  referential: () => call<Referential>("/referential"),
  uploadCv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return call<{ cv_chars: number; skills_added: number }>("/profile/cv", { method: "POST", body: fd });
  },
  parseFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return call<{ text: string }>("/offers/parse-file", { method: "POST", body: fd });
  },
  parseUrl: (url: string) => call<{ text: string }>("/offers/parse-url", { method: "POST", body: JSON.stringify({ url }) }),
  analyse: (text: string, url?: string, force = false) =>
    call<AnalyseResult>(`/offers/analyse${force ? "?force=true" : ""}`, {
      method: "POST",
      body: JSON.stringify({ text, url: url || null, source: url ? "url" : "text" }),
    }),
  generateCv: (offerId: string) => call<CvResult>(`/offers/${offerId}/cv`, { method: "POST" }),
};
