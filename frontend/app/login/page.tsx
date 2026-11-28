"use client";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession, Session } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await api<{data: Session}>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, organizationSlug }),
      }, false);
      saveSession(result.data);
      router.replace("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in"); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="brand auth-brand"><span className="mark">W</span>worksphere</Link>
    <p className="eyebrow">WELCOME BACK</p><h1>Sign in to your workspace</h1>
    <p className="muted">Pick up where your team left off.</p>
    <form onSubmit={submit} className="form-stack">
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>
      <label>Workspace slug<input required value={organizationSlug} onChange={e=>setOrganizationSlug(e.target.value)} placeholder="your-workspace"/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="auth-switch">New to WorkSphere? <Link href="/register">Create a workspace</Link></p>
  </section></main>;
}
