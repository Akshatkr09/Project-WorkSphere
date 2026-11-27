"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Bell, BriefcaseBusiness, CheckSquare, ChevronDown, Command, LayoutDashboard, Search, Settings, ShieldCheck, Users } from "lucide-react";
type Role = "owner" | "manager" | "member" | "platform";
const names: Record<Role,string> = { owner:"Organization owner", manager:"Project manager", member:"Team member", platform:"Platform administrator" };
const nav: Record<Role,{label:string;href:string;icon:typeof LayoutDashboard}[]> = {
 owner:[{label:"Overview",href:"/dashboard",icon:LayoutDashboard},{label:"Projects",href:"/projects",icon:BriefcaseBusiness},{label:"Tasks",href:"/tasks",icon:CheckSquare},{label:"Team",href:"/team",icon:Users},{label:"Settings",href:"/settings",icon:Settings}],
 manager:[{label:"Overview",href:"/dashboard",icon:LayoutDashboard},{label:"Projects",href:"/projects",icon:BriefcaseBusiness},{label:"Tasks",href:"/tasks",icon:CheckSquare},{label:"Team",href:"/team",icon:Users}],
 member:[{label:"My overview",href:"/dashboard",icon:LayoutDashboard},{label:"My tasks",href:"/tasks",icon:CheckSquare},{label:"Projects",href:"/projects",icon:BriefcaseBusiness}],
 platform:[{label:"Platform overview",href:"/platform",icon:ShieldCheck},{label:"Organizations",href:"/team",icon:Users},{label:"Activity",href:"/dashboard",icon:Activity},{label:"Settings",href:"/settings",icon:Settings}]
};
export function WorkspaceShell({children}:{children:React.ReactNode}) {
 const path=usePathname(); const [role,setRole]=useState<Role>("owner");
 useEffect(()=>{const saved=localStorage.getItem("worksphere-demo-role") as Role|null;if(saved&&saved in names)setRole(saved)},[]);
 function changeRole(r:Role){setRole(r);localStorage.setItem("worksphere-demo-role",r);if(r==="platform"&&!path.startsWith("/platform"))location.href="/platform";if(r!=="platform"&&path.startsWith("/platform"))location.href="/dashboard"}
 return <div className="frame"><aside className="sidebar"><Link href="/dashboard" className="brand"><span className="mark"><Command size={18}/></span>worksphere</Link><div className="workspace"><b>A</b><span><strong>Acme Studio</strong><small>Free workspace</small></span></div><p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{nav[role].map(({label,href,icon:Icon})=><Link key={href+label} href={href} className={`nav-link ${path===href?"active":""}`}><Icon size={17}/><span>{label}</span></Link>)}</nav><div className="side-bottom"><div className="profile"><b>AK</b><span><strong>Alex Kumar</strong><small>{names[role]}</small></span></div></div></aside><main className="main"><header className="topbar"><div className="crumb">Acme Studio <span>/</span> <b>{path.split("/").filter(Boolean).at(-1)||"Overview"}</b></div><div className="top-actions"><label className="search"><Search size={15}/><input aria-label="Search workspace" placeholder="Search anything..."/></label><button className="icon-btn" aria-label="Notifications"><Bell size={18}/></button><label className="role-picker"><small>Preview role</small><select value={role} onChange={e=>changeRole(e.target.value as Role)}><option value="owner">Owner</option><option value="manager">Project manager</option><option value="member">Member</option><option value="platform">Platform admin</option></select></label></div></header><div className="content">{children}</div><footer>© 2026 WorkSphere <span>Demo workspace · Sample content</span></footer></main></div>;
}
