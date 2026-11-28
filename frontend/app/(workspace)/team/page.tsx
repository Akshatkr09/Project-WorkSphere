"use client";
import { useEffect,useState } from "react";
import type { FormEvent } from "react";
import { api,ApiEnvelope } from "@/lib/api";
type Member={id:string;role:string;status:string;user:{id:string;name:string;email:string}};
type Invitation={id:string;email:string;role:string;status:string;expiresAt:string};
export default function Team(){
 const [members,setMembers]=useState<Member[]>([]);const [invitations,setInvitations]=useState<Invitation[]>([]);
 const [email,setEmail]=useState("");const [role,setRole]=useState("MEMBER");const [token,setToken]=useState("");
 const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function load(){const [m,i]=await Promise.all([api<ApiEnvelope<Member[]>>("/organization/members?pageSize=100"),api<ApiEnvelope<Invitation[]>>("/organization/invitations?pageSize=100")]);setMembers(m.data);setInvitations(i.data);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function invite(e:FormEvent){e.preventDefault();setBusy(true);setError("");setToken("");try{const r=await api<{data:Invitation&{invitationToken:string}}>("/organization/invitations",{method:"POST",body:JSON.stringify({email,role})});setToken(r.data.invitationToken);setEmail("");await load();}catch(e){setError(e instanceof Error?e.message:"Unable to invite member");}finally{setBusy(false)}}
 return <div className="stack"><div className="page-title"><div><small className="eyebrow">BETTER WORK, TOGETHER</small><h1>Team</h1><p>Manage your workspace collaborators and invitations.</p></div></div>
 <form className="panel form-grid" onSubmit={invite}><label>Invite by email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="teammate@company.com"/></label><label>Workspace role<select value={role} onChange={e=>setRole(e.target.value)}><option value="MEMBER">Member</option><option value="PROJECT_MANAGER">Project manager</option><option value="ADMIN">Admin</option><option value="AUDITOR">Auditor</option></select></label><button className="primary" disabled={busy}>{busy?"Creating…":"Create invitation"}</button></form>
 {token&&<div className="notice"><b>Invitation created.</b><p>Email delivery is not configured. Copy this one-time invitation token and share it securely with the invitee.</p><code>{token}</code><button className="secondary" onClick={()=>navigator.clipboard.writeText(token)}>Copy token</button></div>}
 {error&&<p className="form-error">{error}</p>}
 <article className="panel table-panel"><header><div><h2>Workspace members</h2><p>{members.length} members returned by the API.</p></div></header><div className="overflow"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><b>{m.user.name}</b></td><td>{m.user.email}</td><td>{m.role}</td><td><span className="pill">{m.status}</span></td></tr>)}</tbody></table></div></article>
 <article className="panel table-panel"><header><div><h2>Invitations</h2><p>Pending and historical invitations.</p></div></header><div className="overflow"><table><thead><tr><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>EXPIRES</th></tr></thead><tbody>{invitations.map(i=><tr key={i.id}><td>{i.email}</td><td>{i.role}</td><td>{i.status}</td><td>{new Date(i.expiresAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></article></div>;
}
