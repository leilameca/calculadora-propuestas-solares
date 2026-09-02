import { ArrowRight, FileText, ScanLine, SunMedium } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return <main className="min-h-screen bg-slate-950 text-white">
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
      <nav className="flex items-center justify-between"><span className="text-xl font-black">HELIO<span className="text-amber-400">PRO</span></span><Link href="/dashboard" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Entrar al dashboard</Link></nav>
      <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.1fr_.9fr]">
        <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-300"><SunMedium size={14} />Diseñado para el mercado dominicano</div><h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">Cotizaciones solares precisas, profesionales y listas para cerrar.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Dimensiona sistemas, interpreta facturas y genera propuestas Word editables con la marca de cada empresa.</p><Link href="/dashboard/calculator" className="mt-8 inline-flex h-12 items-center gap-2 rounded-md bg-amber-400 px-5 font-bold text-slate-950 hover:bg-amber-300">Crear propuesta <ArrowRight size={18} /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">{[[ScanLine,"OCR de facturas","Extrae cliente, NIC, tarifa y consumo facturado."],[FileText,"Word editable","Ocho páginas con marca dinámica y tablas profesionales."],[SunMedium,"Cálculo RD","HSP provincial, tarifas por distribuidora y proyección a 25 años."]].map(([Icon,title,copy]) => <div key={title as string} className="rounded-2xl border border-white/10 bg-white/5 p-5"><Icon className="mb-4 text-amber-400" /><h2 className="font-bold">{title as string}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{copy as string}</p></div>)}</div>
      </section>
    </div>
  </main>;
}
