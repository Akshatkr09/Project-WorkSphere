"use client";
import { useEffect,useState } from "react";
import { readSession } from "@/lib/api";
export default function Settings(){
 const [user,setUser]=useState<{name:string;email:string}|null>(null);const [org,setOrg]=useState<{name:string;slug:string}|null>(null);
 useEffect(()=>{const s=readSession();if(s){setUser(s.user);setOrg(s.organization)}},[]);
 return <div className="stack"><div className="page-title"><div><small className="eyebrow">WORKSPACE PROFILE</small><h1>Settings</h1><p>Account and workspace information for the current session.</p></div></div>
 <article className="panel setting"><div><b>Personal account</b><p>{user?.name} · {user?.email}</p></div></article>
 <article className="panel setting"><div><b>Workspace</b><p>{org?.name} · {org?.slug}</p></div></article>
 <article className="panel setting"><div><b>Session security</b><p>Access tokens are held in session storage for this local assessment frontend. Production deployment should move refresh credentials to secure, HttpOnly cookies.</p></div></article>
 </div>;
}
