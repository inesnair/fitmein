"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) setError("L'envoi du lien a échoué. Vérifie l'adresse et réessaie.");
    else setSent(true);
  }

  return (
    <div className="grid min-h-[80dvh] content-center gap-6">
      <div className="grid gap-2">
        <h1 className="font-display text-3xl font-bold">
          Fit<span className="text-amber">Me</span>In
        </h1>
        <p className="text-grey">Sache en quelques secondes si une offre est faite pour toi.</p>
      </div>
      {sent ? (
        <p className="card">Lien de connexion envoyé à <strong>{email}</strong>. Ouvre-le depuis cet appareil.</p>
      ) : (
        <form onSubmit={submit} className="card grid gap-3">
          <label htmlFor="email" className="label">Adresse e-mail</label>
          <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-ko">{error}</p>}
          <button className="btn-primary">Recevoir un lien de connexion</button>
        </form>
      )}
    </div>
  );
}
