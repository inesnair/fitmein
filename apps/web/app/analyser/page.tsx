"use client";

import { FileUp, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MatchDetail, PageHeader, ScoreRing } from "@/components/ui";
import { ApiError, api, type AnalyseResult, type CvResult, type DuplicateInfo } from "@/lib/api";
import { STATUS, fmtDate } from "@/lib/status";

export default function AnalysePage() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<null | "read" | "analyse" | "cv">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dup, setDup] = useState<DuplicateInfo | null>(null);
  const [result, setResult] = useState<AnalyseResult | null>(null);
  const [cv, setCv] = useState<CvResult | null>(null);

  const fail = (e: unknown) => setMessage(e instanceof ApiError && typeof e.detail === "string" ? e.detail : "Une erreur est survenue. Réessaie.");

  async function readUrl() {
    if (!url) return;
    setBusy("read"); setMessage(null);
    try { setText((await api.parseUrl(url)).text); } catch (e) { fail(e); } finally { setBusy(null); }
  }

  async function readFile(f: File | undefined) {
    if (!f) return;
    setBusy("read"); setMessage(null);
    try { setText((await api.parseFile(f)).text); } catch (e) { fail(e); } finally { setBusy(null); }
  }

  async function analyse(force = false) {
    setBusy("analyse"); setMessage(null); setDup(null); setResult(null); setCv(null);
    try {
      setResult(await api.analyse(text, url || undefined, force));
      setText(""); setUrl("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setDup(e.detail as DuplicateInfo);
      else fail(e);
    } finally { setBusy(null); }
  }

  async function makeCv() {
    if (!result) return;
    setBusy("cv"); setMessage(null);
    try { setCv(await api.generateCv(result.id)); } catch (e) { fail(e); } finally { setBusy(null); }
  }

  const verdict = result && (result.score >= 70 ? "Tu corresponds à cette offre" : result.score >= 50 ? "Correspondance partielle" : "Pas de correspondance");

  return (
    <>
      <PageHeader title="Analyser une offre" />

      <section className="card grid gap-4">
        <div>
          <label htmlFor="url" className="label">Lien de l&apos;offre</label>
          <div className="flex gap-2">
            <input id="url" type="url" inputMode="url" className="field" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn shrink-0" onClick={readUrl} disabled={!url || busy !== null} aria-label="Lire la page">
              <Link2 size={18} aria-hidden /> Lire
            </button>
          </div>
          <p className="mt-1.5 text-xs text-grey">LinkedIn et Indeed bloquent la lecture : colle le texte ou utilise l&apos;extension.</p>
        </div>

        <label className="btn w-full cursor-pointer">
          <FileUp size={18} aria-hidden /> Importer un fichier Word ou PDF
          <input type="file" accept=".docx,.pdf,.txt" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
        </label>

        <div>
          <label htmlFor="text" className="label">Texte de l&apos;offre</label>
          <textarea id="text" rows={8} className="field min-h-40" placeholder="Colle ici la description du poste et le profil recherché." value={text} onChange={(e) => setText(e.target.value)} />
        </div>

        <button className="btn-primary w-full" disabled={text.trim().length < 80 || busy !== null} onClick={() => analyse()}>
          {busy === "analyse" ? <><Loader2 className="animate-spin" size={18} aria-hidden /> Analyse en cours…</> : "Vérifier si je corresponds"}
        </button>
        {busy === "read" && <p className="text-sm text-grey">Lecture…</p>}
        {message && <p className="text-sm text-ko" role="alert">{message}</p>}
      </section>

      {dup && (
        <section className="card grid gap-3 border-amber/60" role="status">
          <p>
            Déjà analysée le {fmtDate(dup.created_at, { day: "numeric", month: "long" })} : <strong>{dup.title}</strong>
            {dup.company && ` chez ${dup.company}`}, score {dup.score ?? "–"}, « {STATUS[dup.status].label} ».
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/offres/${dup.offer_id}`} className="btn-purple">Ouvrir la fiche</Link>
            <button className="btn" onClick={() => analyse(true)}>Analyser quand même</button>
          </div>
        </section>
      )}

      {result && (
        <section className="card grid gap-4" aria-live="polite">
          <div className="flex items-start gap-4">
            <ScoreRing score={result.score} />
            <div>
              <h2 className="font-display text-lg font-semibold">{verdict}</h2>
              <p className="text-sm text-grey">{result.title}{result.company && ` · ${result.company}`}</p>
              <p className="mt-1 text-xs text-grey">Ajoutée dans « {STATUS[result.status].label} »</p>
            </div>
          </div>
          <MatchDetail match={result.match} summary={result.summary} />
          <div className="flex flex-wrap gap-2">
            {result.score >= 50 && !cv && (
              <button className="btn-primary" onClick={makeCv} disabled={busy !== null}>
                {busy === "cv" ? <><Loader2 className="animate-spin" size={18} aria-hidden /> Rédaction…</> : "Générer mon CV ATS"}
              </button>
            )}
            <Link href={`/offres/${result.id}`} className="btn">Ouvrir la fiche</Link>
          </div>
          {cv && (
            <div className="grid gap-3 rounded-xl border border-ok/40 bg-surface2 p-3">
              <a href={cv.download_url} className="btn-primary" download>Télécharger {cv.file_name}</a>
              {cv.gaps.length > 0 && <p className="text-sm text-grey">Non mis dans le CV faute de preuve dans ton profil : {cv.gaps.join(", ")}.</p>}
              {cv.removed_items.length > 0 && <p className="text-sm text-amber">Retiré par le contrôle anti-invention : {cv.removed_items.join(" ; ")}.</p>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
