"use client";

import clsx from "clsx";
import Link from "next/link";
import { STATUS, fmtDate, scoreColor } from "@/lib/status";
import type { Match, Offer } from "@/lib/types";

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="flex min-h-tap items-center justify-between gap-3">
      <h1 className="h1">{title}</h1>
      {action}
    </header>
  );
}

export function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const color = scoreColor(score);
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full font-display font-bold tabular-nums"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${score}%, #2D2645 0)`, fontSize: size / 3.6 }}
      role="img"
      aria-label={`Score de correspondance : ${score} sur 100`}
    >
      <span className="absolute inset-[7px] rounded-full bg-surface" />
      <span className="relative">{score}</span>
    </div>
  );
}

export function StatusPill({ status }: { status: Offer["status"] }) {
  const s = STATUS[status];
  return (
    <span className="chip border-current text-[11px] font-semibold" style={{ color: s.color }}>
      {s.label}
    </span>
  );
}

export function OfferCard({ offer, nextEvent }: { offer: Offer; nextEvent?: string }) {
  return (
    <Link
      href={`/offres/${offer.id}`}
      className="card grid gap-1 border-l-[3px] transition hover:border-purple-hi"
      style={{ borderLeftColor: STATUS[offer.status].color }}
    >
      <span className="font-semibold leading-snug">{offer.title}</span>
      <span className="text-sm text-grey">
        {offer.company || "Entreprise inconnue"}
        {offer.location && ` · ${offer.location}`}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-1.5">
        <StatusPill status={offer.status} />
        {offer.score != null && (
          <span className="chip border-0 text-[11px] font-bold text-bg tabular-nums" style={{ background: scoreColor(offer.score) }}>
            {offer.score}
          </span>
        )}
        {nextEvent && <span className="chip border-line text-[11px] text-grey">{nextEvent}</span>}
        {offer.status === "ko" && offer.outcome_reason && (
          <span className="chip border-line text-[11px] text-grey">{offer.outcome_reason}</span>
        )}
        {offer.status === "progress" && offer.applied_at && (
          <span className="chip border-line text-[11px] text-grey">Envoyée le {fmtDate(offer.applied_at)}</span>
        )}
      </span>
    </Link>
  );
}

export function MatchDetail({ match, summary }: { match: Match; summary?: string | null }) {
  const group = (title: string, items: string[], cls: string) =>
    items.length > 0 && (
      <div>
        <p className="mb-1.5 text-sm text-grey">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((x) => (
            <span key={x} className={clsx("chip", cls)}>{x}</span>
          ))}
        </div>
      </div>
    );
  return (
    <div className="grid gap-3">
      {group("Compétences couvertes", match.covered, "border-ok/50 text-[#9FE6C4]")}
      {group("Niveau un peu juste", match.partial, "border-amber/50 text-[#FFD27A]")}
      {group("Manquantes", match.missing, "border-ko/60 text-[#F7A3A6]")}
      {summary && <p className="text-sm">{summary}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-grey">{children}</p>;
}
