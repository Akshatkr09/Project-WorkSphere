"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { ArrowUpRight,CheckCircle2,Clock3,FolderKanban,Plus,Users } from "lucide-react";
import { api,ApiEnvelope } from "@/lib/api";
type Project={id:string;name:string;status:string;dueDate?:string|null;_count?:{tasks:number}};
type Task={id:string;title:string;status:string;priority:string;dueDate?:string|null;project?:{name:string}};
export default function Dashboard(){
 const [projects,setProjects]=useState<Project[]>([]);const [tasks,setTasks]=useState<Task[]>([]);
 const [members,setMembers]=useState<number|null>(null);const [error,setError]=useState("");
 useEffect(()=>{Promise.all([
  api<ApiEnvelope<Project[]>>("/projects?pageSize=5"),
  api<ApiEnvelope<Task[]>>("/tasks?pageSize=6"),
  api<ApiEnvelope<unknown[]>>("/organization/members?pageSize=1")
 ]).then(([p,t,m])=>{setProjects(p.data);setTasks(t.data);setMembers(m.pagination?.total??m.data.length)}).catch(e=>setError(e.message));},[]);
 const completed=tasks.filter(t=>t.status==="DONE").length;
 return <div className="stack"><section className="welcome"><div><small className="eyebrow">WORKSPACE OVERVIEW</small><h1>Your work, in focus.</h1><p>A live snapshot of your projects and team's workload.</p></div><Link className="primary" href="/projects"><Plus size={16}/> New project</Link></section>
 {error&&<p className="form-error">{error}</p>}
 <section className="stats">
  <article className="stat"><div><FolderKanban/></div><small>Projects</small><strong>{projects.length}</strong><p>Visible in this workspace</p></article>
  <article className="stat"><div><CheckCircle2/></div><small>Tasks completed</small><strong>{completed}</strong><p>In the loaded task list</p></article>
  <article className="stat"><div><Clock3/></div><small>Open tasks</small><strong>{tasks.filter(t=>t.status!=="DONE").length}</strong><p>Across accessible projects</p></article>
  <article className="stat"><div><Users/></div><small>Workspace members</small><strong>{members??"—"}</strong><p>Active and invited members excluded</p></article>
 </section>
 <section className="columns"><article className="panel"><header><div><h2>Projects</h2><p>Recently updated work.</p></div><Link href="/projects">View all <ArrowUpRight size={14}/></Link></header>
 {projects.length===0?<p className="empty">No projects yet. Create your first project to get started.</p>:projects.map(p=><div className="project-row" key={p.id}><div className="project-mark blue">{p.name.slice(0,2).toUpperCase()}</div><div className="project-info"><div><b>{p.name}</b><span className="pill">{p.status.replaceAll("_"," ")}</span></div><small>{p._count?.tasks??0} tasks <span>{p.dueDate?new Date(p.dueDate).toLocaleDateString():"No due date"}</span></small></div></div>)}</article>
 <article className="panel"><header><div><h2>Tasks</h2><p>Latest work items.</p></div><Link href="/tasks">See all <ArrowUpRight size={14}/></Link></header>
 {tasks.length===0?<p className="empty">No tasks yet. Add tasks from a project.</p>:tasks.slice(0,5).map(t=><div className="task-row" key={t.id}><span className={`circle ${t.status==="DONE"?"done":""}`}>{t.status==="DONE"?"✓":""}</span><div><b>{t.title}</b><small>{t.project?.name??"Project"}</small></div><time>{t.priority}</time></div>)}</article></section>
 <section className="banner"><div><small>WORKSPHERE ANALYTICS</small><h2>Turn activity into insight.</h2><p>Explore project health, workload and delivery trends.</p></div><Link href="/analytics">View analytics →</Link></section></div>;
}
