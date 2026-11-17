"use client";

import Link from "next/link";
import MilestoneItem from "@/components/MilestoneItem";
import { Empty, OfferCard, PageHeader } from "@/components/ui";
import { useOffers, useUpcomingMilestones } from "@/lib/hooks";

export default function HomePage() {
  const { offers } = useOffers();
  const { items: upcoming } = useUpcomingMilestones(3);

  const list = offers ?? [];
  const analysed = list.filter((o) => o.score != null).length;
  const matched = list.filter((o) => (o.score ?? 0) >= 50).length;
  const sent = list.filter((o) => ["progress", "ok", "ko"].includes(o.status)).length;
  const kpis = [
    { v: analysed, l: "offres analysées" },
    { v: analysed ? `${Math.round((matched / analysed) * 100)} %` : "–", l: "taux de correspondance" },
    { v: sent, l: "candidatures envoyées" },
    { v: upcoming?.length ?? 0, l: "entretiens à venir" },
  ];
  const todo = list.filter((o) => o.status === "todo").slice(0, 3);

  return (
    <>
      <PageHeader title="Accueil" />
      <section className="grid grid-cols-2 gap-3" aria-label="Chiffres clés">
        {kpis.map((k, i) => (
          <div key={k.l} className={i === 0 ? "card border-purple bg-gradient-to-br from-purple/40 to-surface" : "card"}>
            <div className="font-display text-3xl font-bold tabular-nums">{k.v}</div>
            <div className="text-sm text-grey">{k.l}</div>
          </div>
        ))}
      </section>

      <section className="card grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Prochains entretiens</h2>
          <Link href="/agenda" className="py-2 text-sm font-semibold text-purple-hi">Tout voir</Link>
        </div>
        {upcoming?.length ? upcoming.map((m) => <MilestoneItem key={m.id} m={m} />) : <Empty>Aucun entretien à venir.</Empty>}
      </section>

      <section className="card grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">À postuler</h2>
          <Link href="/offres?statut=todo" className="py-2 text-sm font-semibold text-purple-hi">Toutes</Link>
        </div>
        {todo.length ? todo.map((o) => <OfferCard key={o.id} offer={o} />) : <Empty>Rien à postuler. Analyse une offre avec le bouton +.</Empty>}
      </section>
    </>
  );
}
