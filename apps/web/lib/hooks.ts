"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Milestone, Offer } from "./types";

export function useOffers() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const { data, error } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
    if (error) setError("Impossible de charger tes offres.");
    else setOffers(data as Offer[]);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { offers, error, reload };
}

export function useUpcomingMilestones(limit = 50) {
  const [items, setItems] = useState<Milestone[] | null>(null);
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("milestones")
      .select("*, offers(title, company)")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(limit);
    setItems((data as Milestone[]) ?? []);
  }, [limit]);
  useEffect(() => { reload(); }, [reload]);
  return { items, reload };
}
