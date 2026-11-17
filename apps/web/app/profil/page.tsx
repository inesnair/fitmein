"use client";

import clsx from "clsx";
import { FileUp, Loader2, LogOut, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Empty, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { LEVELS } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Profile, Referential, Skill } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [ref, setRef] = useState<Referential | null>(null);
  const [domain, setDomain] = useState("produit");
  const [free, setFree] = useState("");
  const [cvState, setCvState] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user!.id).single(),
      supabase.from("user_skills").select("*").order("level", { ascending: false }),
    ]);
    setProfile(p as Profile);
    setSkills((s as Skill[]) ?? []);
  }, []);

  useEffect(() => { load(); api.referential().then(setRef).catch(() => setRef(null)); }, [load]);

  async function saveField(field: keyof Profile, value: string) {
    if (!profile) return;
    await supabase.from("profiles").update({ [field]: value || null }).eq("id", profile.id);
  }

  async function uploadCv(file?: File) {
    if (!file) return;
    setCvState("Lecture du CV et repérage des compétences…");
    try {
      const r = await api.uploadCv(file);
      setCvState(r.skills_added ? `${r.skills_added} compétences pré-remplies : vérifie les niveaux.` : "CV importé.");
      load();
    } catch { setCvState("Impossible de lire ce fichier. Essaie un .docx."); }
  }

  async function addSkill(name: string, level = 2) {
    const n = name.trim();
    if (!n || skills.some((s) => s.domain === domain && s.name.toLowerCase() === n.toLowerCase())) return;
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("user_skills").insert({ user_id: u.user!.id, domain, name: n, level }).select().single();
    if (data) setSkills((prev) => [...prev, data as Skill]);
  }

  async function setLevel(s: Skill, level: Skill["level"]) {
    setSkills((prev) => prev.map((x) => (x.id === s.id ? { ...x, level } : x)));
    await supabase.from("user_skills").update({ level }).eq("id", s.id);
  }

  async function removeSkill(s: Skill) {
    setSkills((prev) => prev.filter((x) => x.id !== s.id));
    await supabase.from("user_skills").delete().eq("id", s.id);
  }

  if (!profile) return <p className="text-grey">Chargement…</p>;
  const current = ref?.domains.find((d) => d.id === domain);
  const mine = skills.filter((s) => s.domain === domain);
  const countBy = (id: string) => skills.filter((s) => s.domain === id).length;

  return (
    <>
      <PageHeader
        title="Mon profil"
        action={<button className="btn px-3" onClick={() => supabase.auth.signOut()} aria-label="Se déconnecter"><LogOut size={18} aria-hidden /></button>}
      />

      <section className="card grid gap-3 sm:grid-cols-2">
        {([["full_name", "Prénom et nom", "text"], ["target_title", "Poste visé", "text"], ["location", "Localisation", "text"]] as const).map(([k, l]) => (
          <div key={k}>
            <label htmlFor={k} className="label">{l}</label>
            <input id={k} className="field" defaultValue={profile[k] ?? ""} onBlur={(e) => saveField(k, e.target.value)} />
          </div>
        ))}
        <div>
          <label htmlFor="contract" className="label">Contrat recherché</label>
          <select id="contract" className="field" defaultValue={profile.contract ?? ""} onChange={(e) => saveField("contract", e.target.value)}>
            {["", "CDI", "CDD", "Freelance", "Alternance", "Stage"].map((c) => <option key={c} value={c}>{c || "Indifférent"}</option>)}
          </select>
        </div>
      </section>

      <section className="card grid gap-3">
        <h2 className="font-display text-lg font-semibold">Mon CV</h2>
        <label className="btn w-full cursor-pointer">
          <FileUp size={18} aria-hidden /> {profile.cv_file_name ? `Remplacer ${profile.cv_file_name}` : "Importer mon CV (.docx ou .pdf)"}
          <input type="file" accept=".docx,.pdf" className="sr-only" onChange={(e) => uploadCv(e.target.files?.[0])} />
        </label>
        {cvState && <p className="flex items-center gap-2 text-sm text-grey">{cvState.endsWith("…") && <Loader2 className="animate-spin" size={16} aria-hidden />}{cvState}</p>}
      </section>

      <section className="card grid gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Compétences</h2>
          <p className="text-sm text-grey">Choisis un domaine, puis tes compétences et ton niveau.</p>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Domaines">
          {(ref?.domains ?? []).map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={d.id === domain}
              onClick={() => setDomain(d.id)}
              className={clsx("min-h-[38px] shrink-0 rounded-full border px-3.5 text-sm font-semibold",
                d.id === domain ? "border-purple bg-purple text-ink" : countBy(d.id) ? "border-purple-hi text-ink" : "border-line text-grey")}
            >
              {d.name}{countBy(d.id) > 0 && <span className="ml-1 tabular-nums opacity-70">{countBy(d.id)}</span>}
            </button>
          ))}
        </div>

        {mine.length ? (
          <ul className="grid gap-2">
            {mine.map((s) => (
              <li key={s.id} className="grid gap-2 rounded-xl border border-line bg-surface2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.name}</span>
                  <button onClick={() => removeSkill(s)} className="grid h-9 w-9 place-items-center rounded-full text-grey hover:text-ko" aria-label={`Retirer ${s.name}`}><X size={18} aria-hidden /></button>
                </div>
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Niveau en ${s.name}`}>
                  {LEVELS.map((l, i) => (
                    <button
                      key={l}
                      role="radio"
                      aria-checked={s.level === i + 1}
                      onClick={() => setLevel(s, (i + 1) as Skill["level"])}
                      className={clsx("min-h-[36px] rounded-lg border text-xs font-semibold",
                        s.level === i + 1 ? "border-amber bg-amber text-[#1a1205]" : "border-line text-grey")}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucune compétence dans ce domaine.</Empty>
        )}

        {current && (
          <div>
            <p className="mb-2 text-sm text-grey">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {current.skills.filter((n) => !mine.some((s) => s.name.toLowerCase() === n.toLowerCase())).map((n) => (
                <button key={n} onClick={() => addSkill(n)} className="min-h-[36px] rounded-full border border-dashed border-line px-3 text-sm text-grey hover:border-amber hover:text-ink">
                  + {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addSkill(free); setFree(""); }}>
          <label htmlFor="free" className="sr-only">Autre compétence</label>
          <input id="free" className="field" placeholder="Autre compétence" value={free} onChange={(e) => setFree(e.target.value)} />
          <button className="btn-purple shrink-0" disabled={!free.trim()}>Ajouter</button>
        </form>
      </section>
    </>
  );
}
