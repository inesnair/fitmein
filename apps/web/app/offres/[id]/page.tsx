"use client";

import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MilestoneItem from "@/components/MilestoneItem";
import { Empty, MatchDetail, ScoreRing } from "@/components/ui";
import { KO_REASONS, MILESTONE_LABEL, STATUSES } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Milestone, MilestoneType, Offer } from "@/lib/types";

const CHANNELS = ["Site de l'entreprise", "LinkedIn", "Indeed", "HelloWork", "Welcome to the Jungle", "France Travail", "Cooptation", "Cabinet"];

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const [{ data: o }, { data: ms }] = await Promise.all([
      supabase.from("offers").select("*").eq("id", id).single(),
      supabase.from("milestones").select("*").eq("offer_id", id).order("starts_at"),
    ]);
    setOffer(o as Offer);
    setMilestones((ms as Milestone[]) ?? []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function patch(fields: Partial<Offer>) {
    if (!offer) return;
    const next = { ...offer, ...fields };
    if (fields.status === "progress" && !offer.applied_at) next.applied_at = new Date().toISOString().slice(0, 10);
    setOffer(next);
    const { error } = await supabase.from("offers").update({ ...fields, applied_at: next.applied_at }).eq("id", offer.id);
    setSaved(error ? "Échec de l'enregistrement" : "Enregistré");
    setTimeout(() => setSaved(null), 1500);
  }

  async function addMilestone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const starts = new Date(`${f.get("date")}T${f.get("time") || "09:00"}`);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("milestones").insert({
      user_id: u.user!.id, offer_id: id, type: f.get("type") as MilestoneType, starts_at: starts.toISOString(),
      mode: f.get("mode"), contact_name: f.get("contact_name") || null, contact_role: f.get("contact_role") || null,
      location_or_link: f.get("location_or_link") || null,
    });
    if (offer && ["todo", "analyse"].includes(offer.status)) await patch({ status: "progress" });
    e.currentTarget.reset();
    load();
  }

  async function remove() {
    await supabase.from("offers").delete().eq("id", id);
    router.replace("/offres");
  }

  if (!offer) return <p className="text-grey">Chargement…</p>;
  const sent = ["progress", "ok", "ko"].includes(offer.status);

  return (
    <>
      <header className="flex min-h-tap items-center gap-2">
        <Link href="/offres" className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-surface" aria-label="Retour aux offres">
          <ChevronLeft aria-hidden />
        </Link>
        <span className="text-sm text-grey">{saved}</span>
      </header>

      <section className="grid gap-1">
        <h1 className="h1">{offer.title}</h1>
        <p className="text-grey">{[offer.company, offer.location, offer.contract].filter(Boolean).join(" · ")}</p>
        {offer.url && <a href={offer.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-purple-hi">Voir l&apos;offre d&apos;origine</a>}
      </section>

      {offer.match && offer.score != null && (
        <section className="card flex flex-wrap items-start gap-4">
          <ScoreRing score={offer.score} size={76} />
          <div className="min-w-[200px] flex-1"><MatchDetail match={offer.match} summary={offer.summary} /></div>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="label">Statut</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => patch({ status: s.id })}
              aria-pressed={offer.status === s.id}
              className="min-h-[38px] shrink-0 rounded-full border px-3.5 text-sm font-semibold"
              style={offer.status === s.id ? { borderColor: s.color, color: s.color, background: "#1D1830" } : { borderColor: "#2D2645", color: "#9B95AC" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {sent && (
        <section className="card grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="applied" className="label">Date de dépôt</label>
            <input id="applied" type="date" className="field" value={offer.applied_at ?? ""} onChange={(e) => patch({ applied_at: e.target.value || null })} />
          </div>
          <div>
            <label htmlFor="channel" className="label">Canal</label>
            <select id="channel" className="field" value={offer.channel ?? ""} onChange={(e) => patch({ channel: e.target.value || null })}>
              <option value="">Choisir</option>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </section>
      )}

      {offer.status === "ko" && (
        <section className="card grid gap-3">
          <h2 className="font-display font-semibold">Retour négatif</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ko-date" className="label">Date du retour</label>
              <input id="ko-date" type="date" className="field" value={offer.outcome_date ?? ""} onChange={(e) => patch({ outcome_date: e.target.value || null })} />
            </div>
            <div>
              <label htmlFor="ko-reason" className="label">Motif</label>
              <select id="ko-reason" className="field" value={offer.outcome_reason ?? ""} onChange={(e) => patch({ outcome_reason: e.target.value || null })}>
                <option value="">Choisir</option>
                {KO_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ko-stage" className="label">Étape atteinte</label>
              <select id="ko-stage" className="field" value={offer.outcome_stage ?? ""} onChange={(e) => patch({ outcome_stage: e.target.value || null })}>
                <option value="">Choisir</option>
                {["Candidature", ...Object.values(MILESTONE_LABEL)].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <label htmlFor="ko-comment" className="label">Commentaire de l&apos;employeur</label>
          <textarea id="ko-comment" className="field" rows={3} defaultValue={offer.outcome_comment ?? ""} onBlur={(e) => patch({ outcome_comment: e.target.value || null })} />
        </section>
      )}

      {offer.status === "ok" && (
        <section className="card grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ok-date" className="label">Date de la proposition</label>
            <input id="ok-date" type="date" className="field" value={offer.outcome_date ?? ""} onChange={(e) => patch({ outcome_date: e.target.value || null })} />
          </div>
          <div>
            <label htmlFor="ok-start" className="label">Date de démarrage</label>
            <input id="ok-start" type="date" className="field" value={offer.start_date ?? ""} onChange={(e) => patch({ start_date: e.target.value || null })} />
          </div>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="font-display text-lg font-semibold">Jalons</h2>
        {milestones.length ? milestones.map((m) => <MilestoneItem key={m.id} m={m} />) : <Empty>Aucun jalon pour l&apos;instant.</Empty>}
        <details className="card">
          <summary className="min-h-tap cursor-pointer content-center font-semibold text-amber">Ajouter un jalon</summary>
          <form onSubmit={addMilestone} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="m-type" className="label">Type</label>
              <select id="m-type" name="type" className="field">{Object.entries(MILESTONE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label htmlFor="m-mode" className="label">Mode</label>
              <select id="m-mode" name="mode" className="field"><option value="visio">Visio</option><option value="presentiel">Présentiel</option><option value="telephone">Téléphone</option></select></div>
            <div><label htmlFor="m-date" className="label">Date</label><input id="m-date" name="date" type="date" required className="field" /></div>
            <div><label htmlFor="m-time" className="label">Heure</label><input id="m-time" name="time" type="time" className="field" defaultValue="10:00" /></div>
            <div><label htmlFor="m-name" className="label">Interlocuteur</label><input id="m-name" name="contact_name" className="field" autoComplete="off" /></div>
            <div><label htmlFor="m-role" className="label">Rôle</label><input id="m-role" name="contact_role" className="field" placeholder="RH, manager…" /></div>
            <div className="sm:col-span-2"><label htmlFor="m-loc" className="label">Lien visio ou adresse</label><input id="m-loc" name="location_or_link" className="field" /></div>
            <button className="btn-purple sm:col-span-2">Ajouter le jalon</button>
          </form>
        </details>
      </section>

      <section>
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" className="field" rows={4} defaultValue={offer.notes ?? ""} onBlur={(e) => patch({ notes: e.target.value || null })} />
      </section>

      <button className="btn border-ko/40 text-ko" onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}>
        <Trash2 size={18} aria-hidden /> {confirmDelete ? "Confirmer la suppression" : "Supprimer cette offre"}
      </button>
    </>
  );
}
