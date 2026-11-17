"use client";

import MilestoneItem from "@/components/MilestoneItem";
import { Empty, PageHeader } from "@/components/ui";
import { useUpcomingMilestones } from "@/lib/hooks";

export default function AgendaPage() {
  const { items } = useUpcomingMilestones();

  // Regroupe par semaine pour une lecture rapide sur mobile
  const groups = new Map<string, NonNullable<typeof items>>();
  for (const m of items ?? []) {
    const d = new Date(m.starts_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = `Semaine du ${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <>
      <PageHeader title="Agenda" />
      {items === null ? (
        <p className="text-grey">Chargement…</p>
      ) : groups.size ? (
        [...groups].map(([week, ms]) => (
          <section key={week} className="grid gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-grey">{week}</h2>
            {ms.map((m) => <MilestoneItem key={m.id} m={m} />)}
          </section>
        ))
      ) : (
        <Empty>Aucun entretien à venir. Ajoute-le depuis la fiche de la candidature.</Empty>
      )}
    </>
  );
}
