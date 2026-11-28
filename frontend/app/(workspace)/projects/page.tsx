"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiEnvelope } from "@/lib/api";

type Project = { id:string; name:string; description?:string|null; status:string; dueDate?:string|null; _count?:{tasks:number;members:number;milestones:number} };

export default function Projects() {
  const [items,setItems]=useState<Project[]>([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [show,setShow]=useState(false);

  async function load() {
    const result=await api<ApiEnvelope<Project[]>>("/projects?pageSize=100");
    setItems(result.data);
  }
  useEffect(()=>{ void load().catch(e=>setError(e instanceof Error?e.message:"Unable to load projects")); },[]);

  async function create(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api("/projects",{method:"POST",body:JSON.stringify({name:name.trim(),description:description.trim()||undefined,status:"PLANNING"})});
      setName("");setDescription("");setShow(false);await load();
    } catch(e) { setError(e instanceof Error?e.message:"Unable to create project"); }
    finally { setBusy(false); }
  }

  return <div className="stack">
    <div className="page-title"><div><small className="eyebrow">YOUR WORK, ORGANIZED</small><h1>Projects</h1><p>Plan, track and deliver meaningful work together.</p></div><button className="primary" onClick={()=>{setShow(v=>!v);setError("");}}>＋ New project</button></div>
    {show&&<form className="panel form-grid" onSubmit={create}>
      <label>Project name<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder="Website redesign"/></label>
      <label>Description<input maxLength={10000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is this project about?"/></label>
      <div className="form-actions"><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button><button className="primary" disabled={busy}>{busy?"Creating…":"Create project"}</button></div>
    </form>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    <article className="panel table-panel"><header><div><h2>All projects</h2><p>{items.length} projects in your accessible workspace. Select a project to view its work.</p></div></header>
      <div className="overflow"><table><thead><tr><th>PROJECT</th><th>STATUS</th><th>TASKS</th><th>DUE DATE</th><th></th></tr></thead>
      <tbody>{items.map(p=><tr key={p.id} className="ws-clickable-row" onClick={()=>window.location.assign(`/projects/${p.id}`)} onKeyDown={e=>{if(e.key==="Enter")window.location.assign(`/projects/${p.id}`)}} tabIndex={0} role="link" aria-label={`Open ${p.name}`}>
        <td><Link className="ws-project-link" href={`/projects/${p.id}`} onClick={e=>e.stopPropagation()}><b>{p.name}</b><small>{p.description||"Open project workspace"}</small></Link></td>
        <td><span className="pill">{p.status.replaceAll("_"," ")}</span></td><td>{p._count?.tasks??0}</td><td>{p.dueDate?new Date(p.dueDate).toLocaleDateString():"—"}</td><td><Link href={`/projects/${p.id}`} aria-label={`View ${p.name}`}>View →</Link></td>
      </tr>)}</tbody></table></div>
      {items.length===0&&<p className="empty">Your workspace is ready. Create your first project.</p>}
    </article>
  </div>;
}
