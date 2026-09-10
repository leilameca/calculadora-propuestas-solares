"use client";

import { AlertCircle, ArrowUpRight, CircleDollarSign, FileCheck2, Loader2, PanelsTopLeft, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const [data,setData]=useState<{metrics:{proposalsThisMonth:number;capacityKwp:number;pipelineUsd:number;approvalRate:number;approvedCount:number;totalProposals:number};recent:Array<{id:string;number:string;customer:string;projectName:string;status:string;totalUsd:number;installedKwp:number}>}|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    setLoading(true);setError("");
    fetch("/api/dashboard",{signal:AbortSignal.timeout(15_000)}).then(async response=>{
      if(response.status===401){location.replace("/login?reason=session-expired");return null;}
      if(!response.ok)throw new Error("No se pudo cargar el resumen comercial.");
      return response.json();
    }).then(value=>{if(value)setData(value);}).catch(cause=>setError(cause instanceof DOMException&&cause.name==="TimeoutError"?"La conexi\u00f3n tard\u00f3 demasiado. Revisa tu internet e intenta de nuevo.":"No pudimos cargar el resumen en este momento.")).finally(()=>setLoading(false));
  },[attempt]);
  const money=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  const metrics=data?[["Propuestas este mes",String(data.metrics.proposalsThisMonth),FileCheck2],["Capacidad cotizada",`${data.metrics.capacityKwp.toFixed(1)} kWp`,PanelsTopLeft],["Valor en pipeline",`US$ ${money.format(data.metrics.pipelineUsd)}`,CircleDollarSign]] as const:[];
  if(loading)return <div className="grid min-h-96 place-items-center"><div className="text-center"><Loader2 className="mx-auto animate-spin text-primary"/><p className="mt-3 text-sm text-slate-500">Cargando tu empresa...</p></div></div>;
  if(error||!data)return <div className="grid min-h-96 place-items-center"><div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm"><AlertCircle className="mx-auto text-amber-500"/><h1 className="mt-3 text-lg font-bold">No fue posible cargar el panel</h1><p className="mt-2 text-sm leading-6 text-slate-500">{error||"La respuesta del servidor no conten\u00eda datos."}</p><button type="button" onClick={()=>setAttempt(value=>value+1)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"><RefreshCw size={16}/>Intentar de nuevo</button></div></div>;
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Panel comercial</p><h1 className="text-3xl font-black tracking-tight">Resumen</h1><p className="mt-1 text-sm text-slate-500">Actividad de propuestas y rendimiento del portafolio.</p></div><Link href="/dashboard/calculator" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"><Plus size={17}/>Nueva propuesta</Link></div>
    <div className="grid gap-4 md:grid-cols-3">{metrics.map(([label,value,Icon]) => <Card key={label}><CardContent className="flex items-center justify-between"><div><p className="metric-value">{value}</p><p className="metric-label">{label}</p></div><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22}/></div></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]"><Card><CardHeader><CardTitle>Propuestas recientes</CardTitle></CardHeader><CardContent className="space-y-1">{data.recent.length?data.recent.map((proposal)=><div key={proposal.id} className="grid grid-cols-[1fr_1.4fr_.8fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0"><span className="font-semibold">{proposal.number}</span><span>{proposal.customer}</span><span className="text-slate-500">{proposal.installedKwp.toFixed(1)} kWp</span><span className="text-right font-semibold">US$ {money.format(proposal.totalUsd)}</span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${proposal.status==="ACCEPTED"?"bg-emerald-50 text-emerald-700":proposal.status==="REJECTED"?"bg-red-50 text-red-700":"bg-amber-50 text-amber-700"}`}>{proposal.status==="ACCEPTED"?"Aprobada":proposal.status==="SENT"?"Entregada":proposal.status==="REJECTED"?"Cancelada":"Borrador"}</span></div>):<p className="py-10 text-center text-sm text-slate-500">Aún no hay propuestas registradas.</p>}</CardContent></Card><Card className="bg-slate-950 text-white"><CardContent className="flex h-full flex-col justify-between p-6"><div><p className="text-sm font-semibold text-amber-400">Tasa de aprobación</p><p className="mt-2 text-5xl font-black">{data.metrics.approvalRate.toFixed(1)}%</p><p className="mt-3 text-sm leading-6 text-slate-400">{data.metrics.approvedCount} de {data.metrics.totalProposals} propuestas están aprobadas.</p></div><div className="mt-8 flex items-center gap-2 text-sm font-semibold text-emerald-400"><ArrowUpRight size={18}/>Datos reales de tu empresa</div></CardContent></Card></div>
  </div>;
}
