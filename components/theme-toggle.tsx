"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({className=""}:{className?:string}){
  const [dark,setDark]=useState(false);
  useEffect(()=>setDark(document.documentElement.classList.contains("dark")),[]);
  function toggle(){
    const next=!dark;
    setDark(next);
    document.documentElement.classList.toggle("dark",next);
    document.documentElement.style.colorScheme=next?"dark":"light";
    localStorage.setItem("heliopro-theme",next?"dark":"light");
  }
  return <button type="button" onClick={toggle} className={`inline-flex size-9 items-center justify-center rounded-full border bg-white text-slate-600 transition hover:bg-slate-100 hover:text-primary ${className}`} aria-label={dark?"Activar modo claro":"Activar modo nocturno"} title={dark?"Modo claro":"Modo nocturno"}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button>;
}
