"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Empty, OfferCard, PageHeader } from "@/components/ui";
import { useOffers } from "@/lib/hooks";
import { STATUSES, STATUS } from "@/lib/status";
import type { OfferStatus } from "@/lib/types";

function OffersList() {
  const { offers, error } = useOffers();
  const params = useSearchParams();
  const router = useRouter();
  const filter = (params.get("statut") as OfferStatus | null) ?? "all";
  const [q, setQ] = useState("");

  const searched = useMemo(() => {
    const n = q.toLowerCase();
    return (offers ?? []).filter((o) => !n || `${o.title} ${o.company}`.toLowerCase().includes(n));
  }, [offers, q]);
  const shown = filter === "all" ? searched : searched.filter((o) => o.status === filter);

  const setFilter = (id: string) => router.replace(id === "all" ? "/offres" : `/offres?statut=${id}`, { scroll: false });

  return (
    <>
      <PageHeader title="Mes offres" />
      <label className="relative block">
        <span className="sr-only">Rechercher</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" size={18} aria-hidden />
        <input type="search" className="field bg-surface pl-10" placeholder="Poste ou entreprise" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <div role="tablist" aria-label="Filtrer par statut" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[{ id: "all", label: "Toutes", color: "" }, ...STATUSES].map((s) => {
          const n = s.id === "all" ? searched.length : searched.filter((o) => o.status === s.id).length;
          const on = filter === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(s.id)}
              className={`flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${on ? "border-ink bg-ink text-bg" : "border-line bg-surface text-grey"}`}
            >
              {s.color && <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />}
              {s.label}
              <span className="text-xs tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-ko">{error}</p>}
      {offers === null ? (
        <p className="text-grey">Chargement…</p>
      ) : shown.length ? (
        <div className="grid gap-2.5 md:grid-cols-2">{shown.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
      ) : (
        <Empty>{filter === "all" ? "Aucune offre. Analyse ta première offre avec le bouton +." : `Aucune offre « ${STATUS[filter as OfferStatus].label} ».`}</Empty>
      )}
    </>
  );
}

export default function OffersPage() {
  return (
    <Suspense>
      <OffersList />
    </Suspense>
  );
}
