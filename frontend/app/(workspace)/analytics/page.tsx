"use client";
import { useEffect,useState } from "react";
import { api,ApiEnvelope } from "@/lib/api";
type Project={id:string;name:string};
type Metric={projectId?:string;projectName?:string;health?:string;completionRate?:number;totalTasks?:number;completedTasks?:number;openTasks?:number;overdueTasks?:number;[key:string]:unknown};
export default function Analytics(){
 const [projects,setProjects]=useState<Project[]>([]);const [selected,setSelected]=useState("");const [health,setHealth]=useState<Metric|null>(null);const [workload,setWorkload]=useState<unknown>(null);const [cycle,setCycle]=useState<unknown>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{api<ApiEnvelope<Project[]>>("/projects?pageSize=100").then(r=>{setProjects(r.data);if(r.data[0])setSelected(r.data[0].id)}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!selected)return;setBusy(true);setError("");Promise.all([
  api<Metric>(`/analytics/projects/${selected}/health`),
  api<unknown>(`/analytics/projects/${selected}/workload`),
  api<unknown>(`/analytics/projects/${selected}/cycle-time`)
 ]).then(([h,w,c])=>{setHealth(h);setWorkload(w);setCycle(c)}).catch(e=>setError(e.message)).finally(()=>setBusy(false));},[selected]);
 return <div className="stack"><div className="page-title"><div><small className="eyebrow">MEASURE WHAT MATTERS</small><h1>Analytics</h1><p>Project health and team delivery insights from the analytics service.</p></div><select value={selected} onChange={e=>setSelected(e.target.value)} aria-label="Select project">{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
 {busy&&<p className="muted">Loading analytics…</p>}{error&&<p className="form-error">{error}</p>}
 {health&&<><section className="stats"><article className="stat"><small>Health</small><strong>{String(health.health??"—")}</strong><p>Project health assessment</p></article><article className="stat"><small>Completion</small><strong>{health.completionRate==null?"—":`${Math.round(health.completionRate)}%`}</strong><p>Based on recorded tasks</p></article><article className="stat"><small>Total tasks</small><strong>{health.totalTasks??"—"}</strong><p>In selected project</p></article><article className="stat"><small>Overdue</small><strong>{health.overdueTasks??"—"}</strong><p>Requires attention</p></article></section>
 <section className="columns"><article className="panel"><header><div><h2>Team workload</h2><p>Assignee distribution returned by FastAPI.</p></div></header><pre className="json-panel">{JSON.stringify(workload,null,2)}</pre></article><article className="panel"><header><div><h2>Cycle-time metrics</h2><p>Cycle-time data from FastAPI.</p></div></header><pre className="json-panel">{JSON.stringify(cycle,null,2)}</pre></article></section></>}
 {projects.length===0&&!error&&<p className="empty">Create a project to start seeing analytics.</p>}</div>;
}
