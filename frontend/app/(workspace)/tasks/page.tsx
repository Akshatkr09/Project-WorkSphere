"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";
import { api,ApiEnvelope } from "@/lib/api";

type Project={id:string;name:string};
type Member={user:{id:string;name:string;email:string};status:string};
type Task={id:string;title:string;description?:string|null;status:string;priority:string;dueDate?:string|null;version:number;project:{id:string;name:string};assignees?:{user:{id:string;name:string}}[]};
const statuses=["TODO","IN_PROGRESS","IN_REVIEW","BLOCKED","DONE"];
const priorities=["LOW","MEDIUM","HIGH","URGENT"];

export default function Tasks(){
 const [items,setItems]=useState<Task[]>([]);
 const [projects,setProjects]=useState<Project[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const [show,setShow]=useState(false);
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [projectId,setProjectId]=useState("");
 const [priority,setPriority]=useState("MEDIUM");
 const [status,setStatus]=useState("TODO");
 const [dueDate,setDueDate]=useState("");
 const [assigneeId,setAssigneeId]=useState("");

 async function load(){
   const [taskResult,projectResult]=await Promise.all([
     api<ApiEnvelope<Task[]>>("/tasks?pageSize=100"),
     api<ApiEnvelope<Project[]>>("/projects?pageSize=100")
   ]);
   setItems(taskResult.data);setProjects(projectResult.data);
   if(!projectId&&projectResult.data[0])setProjectId(projectResult.data[0].id);
 }
 useEffect(()=>{
   void load().catch(e=>setError(e instanceof Error?e.message:"Unable to load tasks"));
   api<ApiEnvelope<Member[]>>("/organization/members?pageSize=100").then(r=>setMembers(r.data.filter(m=>m.status==="ACTIVE"))).catch(()=>setMembers([]));
 },[]);

 async function create(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(!projectId){setError("Create a project before adding a task.");return;}
   setBusy("create");setError("");
   try{
     await api("/tasks",{method:"POST",body:JSON.stringify({
       projectId,title:title.trim(),description:description.trim()||undefined,priority,status,
       dueDate:dueDate?new Date(`${dueDate}T12:00:00`).toISOString():undefined,
       assigneeIds:assigneeId?[assigneeId]:[]
     })});
     setTitle("");setDescription("");setPriority("MEDIUM");setStatus("TODO");setDueDate("");setAssigneeId("");setShow(false);await load();
   }catch(e){setError(e instanceof Error?e.message:"Unable to create task");}
   finally{setBusy("");}
 }
 async function changeStatus(task:Task,nextStatus:string){
   setBusy(task.id);setError("");
   try{await api(`/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify({status:nextStatus,version:task.version})});await load();}
   catch(e){setError(e instanceof Error?e.message:"Unable to update task");}
   finally{setBusy("");}
 }
 return <div className="stack">
  <div className="page-title"><div><small className="eyebrow">MAKE PROGRESS VISIBLE</small><h1>Tasks</h1><p>Track work across all projects you can access.</p></div><button className="primary" onClick={()=>{setShow(v=>!v);setError("");}}>＋ Create task</button></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {show&&<form className="panel ws-task-form" onSubmit={create}>
    <h2>Create a task</h2>
    <label>Task title<input required minLength={2} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Design the dashboard"/></label>
    <label>Description<textarea maxLength={20000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Add context or acceptance criteria"/></label>
    <div className="ws-form-row">
      <label>Project<select required value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}>{priorities.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
    </div>
    <div className="ws-form-row">
      <label>Due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
      <label>Assignee<select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.map(m=><option key={m.user.id} value={m.user.id}>{m.user.name} · {m.user.email}</option>)}</select></label>
    </div>
    {projects.length===0&&<p className="form-error">Create a project first; tasks must belong to a project.</p>}
    {members.length===0&&<p className="ws-hint">Member assignment is unavailable for your current role or there are no other active members. You can still create an unassigned task.</p>}
    <div className="form-actions"><button type="button" className="secondary" onClick={()=>setShow(false)}>Cancel</button><button className="primary" disabled={busy==="create"||projects.length===0}>{busy==="create"?"Creating…":"Create task"}</button></div>
  </form>}
  <section className="kanban">{statuses.map(s=><article className="kanban-col" key={s}><h2>{s.replaceAll("_"," ")} <span>{items.filter(t=>t.status===s).length}</span></h2>
    {items.filter(t=>t.status===s).map(t=><article className="kanban-card" key={t.id}>
      <small><Link href={`/projects/${t.project.id}`}>{t.project.name}</Link></small><b>{t.title}</b>{t.description&&<p>{t.description}</p>}
      <footer><span>{t.priority}{t.dueDate?` · ${new Date(t.dueDate).toLocaleDateString()}`:""}</span><select aria-label={`Change status for ${t.title}`} value={t.status} disabled={busy===t.id} onChange={e=>changeStatus(t,e.target.value)}>{statuses.map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></footer>
      {t.assignees?.length? <small className="ws-assignees">Assigned: {t.assignees.map(a=>a.user.name).join(", ")}</small>:null}
    </article>)}
    {items.filter(t=>t.status===s).length===0&&<p className="ws-column-empty">No tasks</p>}
  </article>)}</section>
 </div>;
}
