"use client";

import { useEffect, useState } from "react";
import { Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompanyForm = {
  name: string; rnc: string; phone: string; email: string; website: string;
  address: string; slogan: string; proposalValidityDays: number;
  primaryColor: string; secondaryColor: string; accentColor: string;
  itbisEnabled: boolean; itbisRate: number; logoUrl: string;
  coverImageUrl: string; backCoverImageUrl: string; coverImages: string[];
};

const fallback: CompanyForm = {
  name: "EILEN Electric Service", rnc: "1-31-00000-1", phone: "809-555-0147",
  email: "propuestas@eilen.do", website: "", address: "Santiago, República Dominicana",
  slogan: "Ingeniería que transforma energía", proposalValidityDays: 15,
  primaryColor: "#0F4C5C", secondaryColor: "#2F7D32", accentColor: "#F2A900",
  itbisEnabled: true, itbisRate: 0.18, logoUrl: "", coverImageUrl: "",
  backCoverImageUrl: "", coverImages: [],
};

function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CompanyProfileForm() {
  const [form, setForm] = useState(fallback);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/company").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!data) return;
      setForm({ ...fallback, ...data,
        itbisRate: data.itbisRate == null ? 0.18 : Number(data.itbisRate),
        coverImages: Array.isArray(data.coverImages) ? data.coverImages : [],
        coverImageUrl: data.coverImageUrl || "", backCoverImageUrl: data.backCoverImageUrl || "",
      });
    }).catch(() => undefined);
  }, []);

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function addImages(files: FileList | null) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const images = await Promise.all(selected.map(imageToDataUrl));
    setForm((current) => ({ ...current, coverImages: [...current.coverImages, ...images],
      coverImageUrl: current.coverImageUrl || images[0],
      backCoverImageUrl: current.backCoverImageUrl || images.at(-1) || images[0],
    }));
  }

  function removeImage(image: string) {
    setForm((current) => ({ ...current, coverImages: current.coverImages.filter((item) => item !== image),
      coverImageUrl: current.coverImageUrl === image ? "" : current.coverImageUrl,
      backCoverImageUrl: current.backCoverImageUrl === image ? "" : current.backCoverImageUrl,
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setMessage(response.ok ? "Perfil, portadas y reglas fiscales guardados." : "No se pudo guardar. Inicia sesión con una cuenta administradora.");
    } finally { setBusy(false); }
  }

  const commercialFields: Array<[keyof CompanyForm, string, string]> = [
    ["name", "Nombre", "text"], ["rnc", "RNC", "text"], ["phone", "Teléfono", "tel"],
    ["email", "Email", "email"], ["website", "Sitio web", "url"], ["address", "Dirección", "text"], ["slogan", "Eslogan", "text"],
  ];

  return <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Datos comerciales</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        {commercialFields.map(([key, label, type], index) => <label key={key} className={index > 4 ? "sm:col-span-2" : ""}><span className="label">{label}</span><input className="field" type={type} value={String(form[key])} onChange={(event) => set(key, event.target.value as never)} /></label>)}
        <label><span className="label">Vigencia de propuesta (días)</span><input className="field text-right" type="number" min="1" max="365" value={form.proposalValidityDays} onChange={(event) => set("proposalValidityDays", Number(event.target.value))} /></label>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Biblioteca de portadas</CardTitle></CardHeader><CardContent>
        <label className="flex h-28 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-semibold text-slate-500 hover:bg-slate-50"><ImagePlus size={18} />Agregar fotos JPG o PNG<input type="file" multiple className="hidden" accept="image/png,image/jpeg" onChange={(event) => void addImages(event.target.files)} /></label>
        {form.coverImages.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{form.coverImages.map((image, index) => <div key={`${image.slice(0, 40)}-${index}`} className="overflow-hidden rounded-lg border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={image} alt={`Proyecto ${index + 1}`} className="h-32 w-full object-cover" />
          <div className="grid grid-cols-[1fr_1fr_auto] gap-1 p-2"><button type="button" onClick={() => set("coverImageUrl", image)} className={`rounded px-2 py-1 text-xs font-semibold ${form.coverImageUrl === image ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{form.coverImageUrl === image && <Check className="mr-1 inline" size={12} />}Portada</button><button type="button" onClick={() => set("backCoverImageUrl", image)} className={`rounded px-2 py-1 text-xs font-semibold ${form.backCoverImageUrl === image ? "bg-secondary text-white" : "bg-slate-100 text-slate-600"}`}>{form.backCoverImageUrl === image && <Check className="mr-1 inline" size={12} />}Cierre</button><button type="button" onClick={() => removeImage(image)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar imagen"><Trash2 size={15} /></button></div>
        </div>)}</div>}
      </CardContent></Card>
    </div>
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Identidad visual</CardTitle></CardHeader><CardContent className="space-y-4">
        {(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => <label key={key} className="flex items-center justify-between gap-4"><span className="text-sm font-medium">{{ primaryColor: "Primario", secondaryColor: "Secundario", accentColor: "Acento" }[key]}</span><span className="flex items-center gap-2"><input type="color" value={form[key]} onChange={(event) => set(key, event.target.value)} /><input className="field w-28" value={form[key]} onChange={(event) => set(key, event.target.value)} /></span></label>)}
        <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-semibold text-slate-500 hover:bg-slate-50"><ImagePlus size={18} />{form.logoUrl ? "Cambiar logo" : "Cargar logo"}<input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void imageToDataUrl(file).then((value) => set("logoUrl", value)); }} /></label>
        {form.logoUrl && <div className="rounded-lg border bg-slate-50 p-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={form.logoUrl} alt="Logo institucional" className="mx-auto max-h-20 max-w-full object-contain" /></div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>ITBIS y fiscalización</CardTitle></CardHeader><CardContent className="space-y-4"><label className="flex items-center justify-between gap-4"><span className="text-sm font-medium">Aplicar ITBIS</span><input type="checkbox" checked={form.itbisEnabled} onChange={(event) => set("itbisEnabled", event.target.checked)} className="h-4 w-4" /></label><label><span className="label">Tasa ITBIS (%)</span><input className="field text-right" type="number" min="0" max="100" step="0.01" disabled={!form.itbisEnabled} value={form.itbisRate * 100} onChange={(event) => set("itbisRate", Number(event.target.value) / 100)} /></label></CardContent></Card>
      {message && <p className="text-sm font-medium text-primary">{message}</p>}<Button className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}Guardar perfil</Button>
    </div>
  </form>;
}
