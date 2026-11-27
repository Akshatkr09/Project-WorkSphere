"use client";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
const schema=z.object({name:z.string().trim().min(3,"Use at least 3 characters.").max(80),description:z.string().trim().max(240,"Keep it under 240 characters.")});
type Values=z.infer<typeof schema>;
export function CreateProjectForm(){const [open,setOpen]=useState(false);const [notice,setNotice]=useState("");const {register,handleSubmit,reset,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema),defaultValues:{name:"",description:""}});
async function submit(v:Values){setNotice(`“${v.name}” passed validation. API persistence is part of a later assessment.`);reset();setOpen(false)}
return <><button className="primary" onClick={()=>{setNotice("");setOpen(true)}}>＋ New project</button>{notice&&<p role="status" className="notice">{notice}</p>}{open&&<div className="backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="close" onClick={()=>setOpen(false)} aria-label="Close">×</button><h2 id="dialog-title">Create a project</h2><p>Give your team a clear place to start.</p><form noValidate onSubmit={handleSubmit(submit)}><label htmlFor="project-name">Project name</label><input id="project-name" aria-invalid={!!errors.name} placeholder="e.g. Website redesign" {...register("name")}/>{errors.name&&<small role="alert" className="error">{errors.name.message}</small>}<label htmlFor="project-description">Description (optional)</label><textarea id="project-description" {...register("description")}/>{errors.description&&<small role="alert" className="error">{errors.description.message}</small>}<div className="form-actions"><button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="primary" type="submit">Continue</button></div></form></section></div>}</>}
