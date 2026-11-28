"use client";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession, Session } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [password,setPassword]=useState(""); const [organizationName,setOrganizationName]=useState("");
  const [organizationSlug,setOrganizationSlug]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result=await api<{data:Session}>("/auth/register",{method:"POST",body:JSON.stringify({name,email,password,organizationName,organizationSlug})},false);
      saveSession(result.data); router.replace("/dashboard");
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to create workspace"); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="brand auth-brand"><span className="mark">W</span>worksphere</Link>
    <p className="eyebrow">GET STARTED</p><h1>Create your workspace</h1><p className="muted">Set up your organization and invite your team when you're ready.</p>
    <form onSubmit={submit} className="form-stack">
      <label>Your name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
      <label>Work email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
      <label>Password<input type="password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/><small>At least 10 characters.</small></label>
      <label>Workspace name<input required value={organizationName} onChange={e=>setOrganizationName(e.target.value)} placeholder="Acme Studio"/></label>
      <label>Workspace slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={organizationSlug} onChange={e=>setOrganizationSlug(e.target.value.toLowerCase())} placeholder="acme-studio"/><small>Lowercase letters, numbers and hyphens.</small></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary full" disabled={busy}>{busy?"Creating workspace…":"Create workspace"}</button>
    </form>
    <p className="auth-switch">Already have a workspace? <Link href="/login">Sign in</Link></p>
  </section></main>;
}
