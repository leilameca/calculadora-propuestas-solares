"use client";

import { useEffect, useState } from "react";
import { Download, FilePenLine, FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
type Proposal = {
  id:string; number:string; projectName:string; status:Status; totalUsd:string; createdAt:string;
  city:string; utility:string; tariff:string; systemType:string; monthlyConsumption:unknown;
  calculationInput:unknown; calculationResult:unknown; quoteItems:unknown; selectedInverterId?:string|null; manualInverter?:string|null;
  customer:{name:string;nic?:string|null;address?:string|null;logoUrl?:string|null}; createdBy:{name:string};
  projectImageUrl?:string|null;notes?:string|null;invoiceName?:string|null;invoiceMimeType?:string|null;invoiceData?:string|null;
};
type Company = {name:string;primaryColor:string;secondaryColor:string;accentColor:string;[key:string]:unknown};

const selectableStatuses: Array<{value:Status;label:string}> = [
  {value:"DRAFT",label:"Borrador"},{value:"SENT",label:"Entregada"},{value:"ACCEPTED",label:"Completada"},{value:"REJECTED",label:"Cancelada"},
];
const statusStyles:Record<Status,string>={DRAFT:"bg-amber-50 text-amber-700",SENT:"bg-sky-50 text-sky-700",ACCEPTED:"bg-emerald-50 text-emerald-700",REJECTED:"bg-red-50 text-red-700",EXPIRED:"bg-slate-100 text-slate-600"};

export default function ProposalsPage(){
  const [proposals,setProposals]=useState<Proposal[]>([]),[company,setCompany]=useState<Company|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState("");
  useEffect(()=>{Promise.all([fetch("/api/proposals").then(r=>r.ok?r.json():[]),fetch("/api/company").then(r=>r.ok?r.json():null)]).then(([rows,brand])=>{setProposals(Array.isArray(rows)?rows:[]);setCompany(brand)}).finally(()=>setLoading(false))},[]);

  async function changeStatus(proposal:Proposal,status:Status){
    setBusy(`status-${proposal.id}`);setMessage("");
    try{const response=await fetch("/api/proposals",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:proposal.id,status})});const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo cambiar el estado.");setProposals(rows=>rows.map(row=>row.id===proposal.id?{...row,status:data.status}:row));setMessage(`${proposal.number} actualizada.`)}catch(error){setMessage(error instanceof Error?error.message:"No se pudo cambiar el estado.")}finally{setBusy(null)}
  }

  async function download(proposal:Proposal,format:"pdf"|"docx"){
    setBusy(`${format}-${proposal.id}`);setMessage("");
    try{
      if(!company)throw new Error("No se pudo cargar la información de la empresa.");
      const detailResponse=await fetch(`/api/proposals?id=${encodeURIComponent(proposal.id)}`);
      const detail=await detailResponse.json();
      if(!detailResponse.ok)throw new Error(detail.error||"No se pudo cargar la propuesta completa.");
      const full=detail as Proposal;
      const input=full.calculationInput as Record<string,unknown>;
      const payload={company:{...company,logoBase64:company.logoUrl,coverImageBase64:full.projectImageUrl||company.coverImageUrl||(Array.isArray(company.coverImages)?company.coverImages[0]:undefined),backCoverImageBase64:company.backCoverImageUrl||(Array.isArray(company.coverImages)?company.coverImages[1]||company.coverImages[0]:undefined),itbisRate:company.itbisRate==null?undefined:Number(company.itbisRate)},customer:{...full.customer,logoBase64:full.customer.logoUrl},project:{name:full.projectName,city:full.city,utility:full.utility,tariff:full.tariff,systemType:full.systemType,panelWatts:Number(input.panelWatts)||0,inverter:String(input.inverter||full.manualInverter||"Por seleccionar")},consumption:full.monthlyConsumption,result:full.calculationResult,quoteItems:full.quoteItems,proposalText:full.notes||undefined,invoice:full.invoiceData?{name:full.invoiceName||"factura.pdf",mimeType:full.invoiceMimeType||"application/pdf",dataUrl:full.invoiceData}:undefined,proposalNumber:full.number,date:new Intl.DateTimeFormat("es-DO",{dateStyle:"long"}).format(new Date(full.createdAt)),selectedEquipmentIds:[input.panelEquipmentId,full.selectedInverterId,input.batteryEquipmentId].filter(Boolean)};
      const response=await fetch(`/api/proposals/${format}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(data?.error||`No se pudo generar el ${format.toUpperCase()}.`)}
      const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`${proposal.number.toLowerCase()}.${format}`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){setMessage(error instanceof Error?error.message:"No se pudo descargar la propuesta.")}finally{setBusy(null)}
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Pipeline comercial</p><h1 className="text-3xl font-black">Propuestas</h1><p className="mt-1 text-sm text-slate-500">Edita, cambia el estado o descarga cada propuesta.</p></div><Link href="/dashboard/calculator" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"><Plus size={17}/>Nueva propuesta</Link></div>
    {message&&<div className="rounded-lg border bg-white px-4 py-3 text-sm font-medium text-slate-700">{message}</div>}
    <Card><CardHeader><CardTitle>Propuestas ({proposals.length})</CardTitle></CardHeader><CardContent>
      {loading?<div className="grid place-items-center py-16"><Loader2 className="animate-spin text-primary"/></div>:proposals.length===0?<div className="grid place-items-center py-20 text-center"><div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText/></div><h2 className="mt-4 font-bold">Aún no hay propuestas guardadas</h2><p className="mt-1 max-w-md text-sm text-slate-500">Guarda una propuesta desde la calculadora para verla aquí.</p></div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500">{["Número","Cliente","Proyecto","Sistema","Total","Creada por","Estado","Acciones"].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{proposals.map(p=>{
        const result=p.calculationResult as {installedKwp?:number};const statusBusy=busy===`status-${p.id}`;
        return <tr key={p.id} className="border-b last:border-0"><td className="px-3 py-4 font-semibold">{p.number}</td><td className="px-3 py-4">{p.customer.name}</td><td className="px-3 py-4 text-slate-500">{p.projectName}</td><td className="px-3 py-4 text-slate-500">{result?.installedKwp?`${Number(result.installedKwp).toFixed(2)} kWp`:"—"}</td><td className="px-3 py-4 font-semibold">US$ {Number(p.totalUsd).toLocaleString("en-US",{minimumFractionDigits:2})}</td><td className="px-3 py-4 text-slate-500">{p.createdBy.name}</td><td className="px-3 py-4"><select aria-label={`Estado de ${p.number}`} disabled={statusBusy} value={p.status==="EXPIRED"?"DRAFT":p.status} onChange={e=>void changeStatus(p,e.target.value as Status)} className={`h-9 rounded-full border-0 px-3 text-xs font-semibold ${statusStyles[p.status]}`}>{selectableStatuses.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td className="px-3 py-4"><div className="flex justify-end gap-1"><Link href={`/dashboard/calculator?proposal=${encodeURIComponent(p.id)}`} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-slate-100" title="Editar propuesta"><FilePenLine size={15}/>Editar</Link><Button variant="ghost" className="h-9 px-2 text-xs" disabled={Boolean(busy)} onClick={()=>void download(p,"pdf")} title="Descargar PDF">{busy===`pdf-${p.id}`?<Loader2 className="animate-spin" size={15}/>:<Download size={15}/>}PDF</Button><Button variant="ghost" className="h-9 px-2 text-xs" disabled={Boolean(busy)} onClick={()=>void download(p,"docx")} title="Descargar Word">{busy===`docx-${p.id}`?<Loader2 className="animate-spin" size={15}/>:<Download size={15}/>}Word</Button></div></td></tr>})}</tbody></table></div>}
    </CardContent></Card>
  </div>;
}
