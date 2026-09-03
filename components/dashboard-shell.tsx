"use client";

import { BarChart3, Boxes, Building2, FileText, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  ["/dashboard", "Resumen", LayoutDashboard],
  ["/dashboard/calculator", "Nueva propuesta", BarChart3],
  ["/dashboard/proposals", "Propuestas", FileText],
  ["/dashboard/customers", "Clientes", Users],
  ["/dashboard/equipment", "Inventario", Boxes],
  ["/dashboard/company", "Perfil de empresa", Building2],
  ["/dashboard/admin", "Empresas", ShieldCheck],
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [company,setCompany]=useState("EILEN Electric Service");
  const [role,setRole]=useState("");
  const pathname = usePathname();
  useEffect(()=>{fetch("/api/company").then(r=>r.ok?r.json():null).then(data=>{if(data?.name)setCompany(data.name);if(data?.primaryColor){const toRgb=(hex:string)=>{const clean=hex.replace("#","");return `${parseInt(clean.slice(0,2),16)} ${parseInt(clean.slice(2,4),16)} ${parseInt(clean.slice(4,6),16)}`};document.documentElement.style.setProperty("--brand-primary",toRgb(data.primaryColor));document.documentElement.style.setProperty("--brand-secondary",toRgb(data.secondaryColor));document.documentElement.style.setProperty("--brand-accent",toRgb(data.accentColor));}}).catch(()=>undefined)},[]);
  useEffect(()=>{fetch("/api/me").then(r=>r.ok?r.json():null).then(data=>{if(data?.role)setRole(data.role)}).catch(()=>undefined)},[]);
  return <div className="min-h-screen bg-slate-50">
    <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 border-r bg-slate-950 text-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link href="/dashboard" className="text-lg font-black tracking-tight">HELIO<span className="text-accent">PRO</span></Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
      </div>
      <nav className="space-y-1 p-3">{nav.filter(([href])=>href!=="/dashboard/admin"||role==="SUPERADMIN").map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white", pathname === href && "bg-primary text-white")}><Icon size={18} />{label}</Link>)}</nav>
      <div className="absolute inset-x-3 bottom-4 border-t border-white/10 pt-3"><button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});location.href="/login"}} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={17} />Cerrar sesión</button></div>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:px-8">
        <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
        <div className="ml-auto flex items-center gap-3"><div className="text-right"><p className="text-sm font-semibold">{company}</p><p className="text-xs text-slate-500">Administrador</p></div><div className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-white">{company.split(/\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase()}</div></div>
      </header>
      <main className="p-4 lg:p-8">{children}</main>
    </div>
  </div>;
}
