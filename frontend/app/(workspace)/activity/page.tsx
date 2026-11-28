"use client";
import { useEffect,useState } from "react";
import { api,ApiEnvelope } from "@/lib/api";
type Task={id:string;title:string};
type Event={id:string;action:string;entityType:string;createdAt:string;actor?:{name:string};task?:{title:string}};
export default function Activity(){
 const [tasks,setTasks]=useState<Task[]>([]);const [taskId,setTaskId]=useState("");const [events,setEvents]=useState<Event[]>([]);const [error,setError]=useState("");
 useEffect(()=>{api<ApiEnvelope<Task[]>>("/tasks?pageSize=100").then(r=>{setTasks(r.data);if(r.data[0])setTaskId(r.data[0].id)}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(taskId)api<{data:Event[]}>(`/tasks/${taskId}/activity`).then(r=>setEvents(r.data)).catch(e=>setError(e.message));},[taskId]);
 return <div className="stack"><div className="page-title"><div><small className="eyebrow">KEEP THE CONTEXT</small><h1>Activity</h1><p>Recent recorded events for a selected task.</p></div><select value={taskId} onChange={e=>setTaskId(e.target.value)} aria-label="Select task">{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div>{error&&<p className="form-error">{error}</p>}<article className="panel"><header><div><h2>Task activity timeline</h2><p>Latest 100 events.</p></div></header>{events.length?events.map(e=><div className="activity-item" key={e.id}><span className="activity-dot"/><div><b>{e.action.replaceAll("."," ")}</b><p>{e.actor?.name??"Workspace user"} · {e.entityType}</p><small>{new Date(e.createdAt).toLocaleString()}</small></div></div>):<p className="empty">No activity recorded for this task yet.</p>}</article></div>;
}
