"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Proposal = {
  id: string;
  number: string;
  projectName: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  totalUsd: string;
  createdAt: string;
  customer: { name: string };
  createdBy: { name: string };
  calculationResult: { installedKwp: number } | null;
};

const statusLabels: Record<Proposal["status"], string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
};

const statusStyles: Record<Proposal["status"], string> = {
  DRAFT: "bg-amber-50 text-amber-700",
  SENT: "bg-sky-50 text-sky-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-600",
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => (r.ok ? r.json() : []))
      .then(setProposals)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Pipeline comercial</p>
          <h1 className="text-3xl font-black">Propuestas</h1>
          <p className="mt-1 text-sm text-slate-500">Historial de cotizaciones persistidas por empresa.</p>
        </div>
        <Link href="/dashboard/calculator" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"><Plus size={17} />Nueva propuesta</Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Propuestas ({proposals.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-primary" /></div>
          ) : proposals.length === 0 ? (
            <div className="grid place-items-center py-20 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText /></div>
              <h2 className="mt-4 font-bold">Aún no hay propuestas persistidas</h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">Usa el botón "Guardar borrador" en la calculadora para conservar insumos, resultados, partidas y estado comercial.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    {["Número", "Cliente", "Proyecto", "Sistema", "Total", "Creada por", "Estado", ""].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-3 py-4 font-semibold">{p.number}</td>
                      <td className="px-3 py-4">{p.customer.name}</td>
                      <td className="px-3 py-4 text-slate-500">{p.projectName}</td>
                      <td className="px-3 py-4 text-slate-500">{p.calculationResult ? `${p.calculationResult.installedKwp.toFixed(2)} kWp` : "—"}</td>
                      <td className="px-3 py-4 font-semibold">US$ {Number(p.totalUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-4 text-slate-500">{p.createdBy.name}</td>
                      <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[p.status]}`}>{statusLabels[p.status]}</span></td>
                      <td className="px-3 py-4 text-right"><Button variant="ghost" className="h-8 px-2" title="Exportar Word"><Download size={15} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}