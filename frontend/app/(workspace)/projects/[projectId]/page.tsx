"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect,useState } from "react";
import { api,ApiEnvelope } from "@/lib/api";

type Project={id:string;name:string;description?:string|null;status:string;startDate?:string|null;dueDate?:string|null;milestones:{id:string;name:string;dueDate?:string|null}[];members:{id:string;role:string;user:{id:string;name:string;email:string}}[];_count:{tasks:number}};
type Task={id:string;title:string;description?:string|null;status:string;priority:string;dueDate?:string|null;version:number;project:{id:string;name:string}};
const statuses=["TODO","IN_PROGRESS","IN_REVIEW","BLOCKED","DONE"];

export default function ProjectDetail(){
 const params=useParams<{projectId:string}>();const projectId=params.projectId;
 const [project,setProject]=useState<Project|null>(null);const [tasks,setTasks]=useState<Task[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState("");
 async function load(){
   const [p,t]=await Promise.all([api<{data:Project}>(`/projects/${projectId}`),api<ApiEnvelope<Task[]>>("/tasks?pageSize=100")]);
   setProject(p.data);setTasks(t.data.filter(x=>x.project.id===projectId));
 }
 useEffect(()=>{if(projectId)void load().catch(e=>setError(e instanceof Error?e.message:"Unable to load project"));},[projectId]);
 async function updateStatus(task:Task,status:string){
   setBusy(task.id);setError("");
   try{await api(`/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify({status,version:task.version})});await load();}
   catch(e){setError(e instanceof Error?e.message:"Unable to update task");}
   finally{setBusy("");}
 }
 if(error&&!project)return <div className="stack"><p className="form-error">{error}</p><Link href="/projects">← Back to projects</Link></div>;
 if(!project)return <p className="loading-screen">Loading project…</p>;
 return <div className="stack">
   <div className="ws-breadcrumb"><Link href="/projects">Projects</Link><span>/</span><span>{project.name}</span></div>
   <div className="page-title"><div><small className="eyebrow">PROJECT WORKSPACE</small><h1>{project.name}</h1><p>{project.description||"Keep the work, milestones and collaborators for this project together."}</p></div><Link className="primary" href={`/tasks?projectId=${project.id}`}>＋ Manage tasks</Link></div>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <div className="ws-project-summary">
    <article className="panel"><small>STATUS</small><strong>{project.status.replaceAll("_"," ")}</strong></article>
    <article className="panel"><small>TASKS</small><strong>{tasks.length}</strong></article>
    <article className="panel"><small>PROJECT MEMBERS</small><strong>{project.members.length}</strong></article>
    <article className="panel"><small>DUE DATE</small><strong>{project.dueDate?new Date(project.dueDate).toLocaleDateString():"Not set"}</strong></article>
   </div>
   <article className="panel table-panel"><header><div><h2>Project tasks</h2><p>Update task status here or manage all tasks from the Tasks board.</p></div><Link href="/tasks">Open task board →</Link></header>
    {tasks.length===0?<p className="empty">No tasks in this project yet. <Link href="/tasks">Create the first task</Link> from the Tasks page.</p>:
    <div className="overflow"><table><thead><tr><th>TASK</th><th>PRIORITY</th><th>STATUS</th><th>DUE DATE</th></tr></thead><tbody>
     {tasks.map(t=><tr key={t.id}><td><b>{t.title}</b><small>{t.description||t.id}</small></td><td>{t.priority}</td><td><select aria-label={`Status for ${t.title}`} value={t.status} disabled={busy===t.id} onChange={e=>updateStatus(t,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></td><td>{t.dueDate?new Date(t.dueDate).toLocaleDateString():"—"}</td></tr>)}
    </tbody></table></div>}
   </article>
   <article className="panel table-panel"><header><div><h2>Milestones</h2><p>Project delivery checkpoints.</p></div></header>
    {project.milestones.length===0?<p className="empty">No milestones have been added yet.</p>:project.milestones.map(m=><div className="ws-milestone" key={m.id}><b>{m.name}</b><span>{m.dueDate?new Date(m.dueDate).toLocaleDateString():"No due date"}</span></div>)}
   </article>
   <article className="panel table-panel"><header><div><h2>Project members</h2><p>People with access to this project.</p></div></header>
    {project.members.length===0?<p className="empty">No project-specific members listed.</p>:project.members.map(m=><div className="ws-milestone" key={m.id}><b>{m.user.name}</b><span>{m.role}</span></div>)}
   </article>
 </div>;
}
