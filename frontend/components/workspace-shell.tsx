"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Bell, BriefcaseBusiness, CheckSquare, Command, LayoutDashboard, LogOut, Settings, Users, BarChart3 } from "lucide-react";
import { clearSession, readSession } from "@/lib/api";
import type { Session } from "@/lib/api";

const nav = [
  {label:"Overview",href:"/dashboard",icon:LayoutDashboard},
  {label:"Projects",href:"/projects",icon:BriefcaseBusiness},
  {label:"Tasks",href:"/tasks",icon:CheckSquare},
  {label:"Team",href:"/team",icon:Users},
  {label:"Analytics",href:"/analytics",icon:BarChart3},
  {label:"Activity",href:"/activity",icon:Activity},
  {label:"Settings",href:"/settings",icon:Settings},
];
export function WorkspaceShell({children}:{children:React.ReactNode}) {
  const path=usePathname(); const router=useRouter();
  const [session,setSession]=useState<Session|null>(null);
  useEffect(()=>{
    const sync=()=>setSession(readSession());
    sync(); window.addEventListener("worksphere-session-change",sync);
    window.addEventListener("storage",sync);
    return ()=>{window.removeEventListener("worksphere-session-change",sync);window.removeEventListener("storage",sync)};
  },[]);
  function logout(){const current=readSession(); if(current?.refreshToken){fetch(`${process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api/v1"}/auth/logout`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${current.accessToken}`},body:JSON.stringify({refreshToken:current.refreshToken})}).catch(()=>{});} clearSession(); router.replace("/login");}
  return <div className="frame"><aside className="sidebar">
    <Link href="/dashboard" className="brand"><span className="mark"><Command size={18}/></span>worksphere</Link>
    <div className="workspace"><b>{session?.organization?.name?.slice(0,1).toUpperCase()??"W"}</b><span><strong>{session?.organization?.name??"Your workspace"}</strong><small>{session?.organization?.role??"Workspace"}</small></span></div>
    <p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{nav.map(({label,href,icon:Icon})=><Link key={href} href={href} className={`nav-link ${path===href?"active":""}`}><Icon size={17}/><span>{label}</span></Link>)}</nav>
    <div className="side-bottom"><div className="profile"><b>{session?.user?.name?.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()??"U"}</b><span><strong>{session?.user?.name??"Signed in user"}</strong><small>{session?.user?.email??""}</small></span><button className="icon-btn logout" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={16}/></button></div></div>
  </aside><main className="main"><header className="topbar"><div className="crumb">{session?.organization?.name??"Workspace"} <span>/</span> <b>{path.split("/").filter(Boolean).at(-1)||"Overview"}</b></div><div className="top-actions"><span className="secure-label">Connected workspace</span><button className="icon-btn" aria-label="Notifications"><Bell size={18}/></button></div></header><div className="content">{children}</div><footer>© 2026 WorkSphere <span>Workspace data is scoped to your organization</span></footer></main></div>;
}
