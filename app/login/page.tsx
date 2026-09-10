"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage(){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    try{
      const data=new FormData(event.currentTarget);
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal:AbortSignal.timeout(15_000),body:JSON.stringify({email:data.get("email"),password:data.get("password")})});
      if(!response.ok){setError("Correo o contraseña incorrectos.");setBusy(false);return;}
      router.replace("/dashboard");
    }catch(error){
      setError(error instanceof DOMException&&error.name==="TimeoutError"?"El servidor tard\u00f3 demasiado en responder. Intenta nuevamente.":"No fue posible conectar con el servidor.");
      setBusy(false);
    }
  }

  return <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#020617] px-5 py-12 text-slate-950">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(14,165,233,.22),transparent_42%),radial-gradient(circle_at_90%_90%,rgba(242,169,0,.10),transparent_30%)]"/>
    <div className="pointer-events-none absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]"/>
    <ThemeToggle className="absolute right-5 top-5 z-10 border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-amber-300"/>

    <section className="relative w-full max-w-[440px]">
      <div className="absolute -inset-px rounded-[29px] bg-gradient-to-b from-white/25 via-white/5 to-transparent"/>
      <form onSubmit={submit} className="relative rounded-[28px] border border-white/10 bg-white p-7 shadow-[0_30px_90px_-30px_rgba(0,0,0,.8)] sm:p-10 dark:bg-slate-900">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"><Image src="/heliopro-logo.webp" alt="HelioPro" width={48} height={31} priority/></span>
            <div><p className="text-xl font-black tracking-tight text-slate-950 dark:text-white">HELIO<span className="text-amber-500">PRO</span></p><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">Gestión solar</p></div>
          </div>
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.12)]" title="Sistema disponible"/>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Bienvenido</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Ingresa con las credenciales asignadas a tu cuenta.</p>
        </div>

        <div className="space-y-5">
          <label className="block"><span className="label">Correo electrónico</span><span className="relative block"><Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field h-12 rounded-xl pl-11" name="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" required autoFocus/></span></label>
          <label className="block"><span className="label">Contraseña</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field h-12 rounded-xl px-11" name="password" type={showPassword?"text":"password"} autoComplete="current-password" placeholder="Ingresa tu contraseña" required/><button type="button" onClick={()=>setShowPassword(value=>!value)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={showPassword?"Ocultar contraseña":"Mostrar contraseña"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
        </div>

        {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
        <Button className="mt-7 h-12 w-full rounded-xl shadow-lg shadow-primary/15" disabled={busy}>{busy?<><Loader2 size={18} className="animate-spin"/>Validando acceso…</>:"Ingresar"}</Button>
        <p className="mt-6 text-center text-[11px] font-medium uppercase tracking-[.14em] text-slate-400">Acceso privado y administrado</p>
      </form>
    </section>
  </main>;
}
