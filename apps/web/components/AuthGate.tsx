"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Redirige vers /login tant que l'utilisateur n'est pas connecté. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null && path !== "/login") router.replace("/login");
    if (session && path === "/login") router.replace("/");
  }, [session, path, router]);

  if (session === undefined) return <div className="grid min-h-dvh place-items-center text-grey">Chargement…</div>;
  if (session === null && path !== "/login") return null;
  return <>{children}</>;
}
