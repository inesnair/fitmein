import Link from "next/link";
import { MILESTONE_LABEL, fmtDate, fmtTime } from "@/lib/status";
import type { Milestone } from "@/lib/types";

const MODE = { visio: "Visio", presentiel: "Présentiel", telephone: "Téléphone" } as const;

export default function MilestoneItem({ m }: { m: Milestone }) {
  return (
    <Link href={`/offres/${m.offer_id}`} className="grid grid-cols-[76px_1fr] gap-3 rounded-xl border border-line bg-surface2 p-3 hover:border-purple-hi">
      <span className="font-display font-semibold capitalize text-amber">
        {fmtDate(m.starts_at, { weekday: "short", day: "numeric", month: "short" })}
        <span className="block text-sm font-normal tabular-nums text-grey">{fmtTime(m.starts_at)}</span>
      </span>
      <span>
        <strong>{MILESTONE_LABEL[m.type]}</strong>
        {m.offers && <> · {m.offers.title} <span className="text-grey">· {m.offers.company}</span></>}
        <span className="block text-sm text-grey">
          {[m.contact_name && `${m.contact_name}${m.contact_role ? ` (${m.contact_role})` : ""}`, m.mode && MODE[m.mode]]
            .filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}
