"use client";

import { useEffect, useState } from "react";
import { Boxes, FileCheck2, FileText, ImagePlus, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { imageToDataUrl } from "@/lib/client-images";

type Equipment = {
  id: string;
  type: "PANEL" | "INVERTER" | "BATTERY" | "STRUCTURE" | "PROTECTION" | "OTHER";
  brand: string;
  model: string;
  description?: string | null;
  powerWatts?: number | null;
  capacityKwh?: string | null;
  unitCostUsd: string;
  quantity: number;
  warrantyYears?: number | null;
  datasheetName?: string | null;
  certificateName?: string | null;
  active: boolean;
  logoUrl?: string | null;
};

const typeLabels: Record<Equipment["type"], string> = {
  PANEL: "Panel",
  INVERTER: "Inversor",
  BATTERY: "Batería",
  STRUCTURE: "Estructura",
  PROTECTION: "Protección",
  OTHER: "Otro",
};

const emptyForm = { type: "PANEL" as Equipment["type"], brand: "", model: "", description: "", powerWatts: "", capacityKwh: "", unitCostUsd: "", quantity: 1, warrantyYears: "",logoUrl:"" };

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [datasheet, setDatasheet] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/equipment");
    if (response.ok) setItems(await response.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if ([datasheet, certificate].some((file) => file && file.size > 4 * 1024 * 1024)) { setMessage("Cada documento debe pesar 4 MB o menos."); return; }
    setSaving(true);
    setMessage("");
    const body = {
      type: form.type,
      brand: form.brand,
      model: form.model,
      description: form.description || null,
      powerWatts: form.powerWatts ? Number(form.powerWatts) : null,
      capacityKwh: form.capacityKwh ? Number(form.capacityKwh) : null,
      unitCostUsd: Number(form.unitCostUsd),
      quantity: Number(form.quantity),
      warrantyYears: form.warrantyYears ? Number(form.warrantyYears) : null,
      logoUrl:form.logoUrl||null,
    };
    const response = await fetch("/api/equipment", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...body, id: editingId } : body),
    });
    const data = await response.json();
    if (!response.ok) { setSaving(false); setMessage(data.error || "No se pudo guardar el equipo."); return; }
    for (const [kind, file] of [["datasheet", datasheet], ["certificate", certificate]] as const) {
      if (!file) continue;
      const documents = new FormData(); documents.append("kind", kind); documents.append("file", file);
      const uploaded = await fetch(`/api/equipment/${data.id}/documents`, { method: "POST", body: documents });
      if (!uploaded.ok) { const error = await uploaded.json(); setSaving(false); setMessage(`El equipo se creó, pero no se pudo guardar ${kind === "datasheet" ? "el datasheet" : "el certificado"}: ${error.error}`); await load(); return; }
    }
    setSaving(false);
    setForm(emptyForm);
    setDatasheet(null); setCertificate(null);
    setEditingId(null);
    setShowForm(false);
    setMessage(editingId ? "Equipo actualizado correctamente." : "Equipo agregado al inventario.");
    await load();
  }

  function edit(item: Equipment) {
    setEditingId(item.id);
    setForm({ type: item.type, brand: item.brand, model: item.model, description: item.description || "", powerWatts: item.powerWatts?.toString() || "", capacityKwh: item.capacityKwh?.toString() || "", unitCostUsd: item.unitCostUsd, quantity: item.quantity, warrantyYears: item.warrantyYears?.toString() || "",logoUrl:item.logoUrl||"" });
    setDatasheet(null); setCertificate(null); setMessage(""); setShowForm(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Catálogo del tenant</p>
          <h1 className="text-3xl font-black">Inventario de equipos</h1>
          <p className="mt-1 text-sm text-slate-500">Los inversores aparecen aquí para selección explícita en la cotización.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus size={17} />Agregar equipo</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle>{editingId ? "Editar equipo" : "Registrar equipo"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label><span className="label">Tipo *</span><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Equipment["type"] })}>{(Object.keys(typeLabels) as Equipment["type"][]).map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></label>
              <label><span className="label">Marca *</span><input className="field" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>
              <label><span className="label">Modelo *</span><input className="field" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
              <label><span className="label">Potencia (W)</span><input className="field" type="number" min="0" value={form.powerWatts} onChange={(e) => setForm({ ...form, powerWatts: e.target.value })} /></label>
              <label><span className="label">Capacidad (kWh)</span><input className="field" type="number" min="0" step="0.01" value={form.capacityKwh} onChange={(e) => setForm({ ...form, capacityKwh: e.target.value })} /></label>
              <label><span className="label">Costo unitario USD *</span><input className="field" type="number" min="0" step="0.01" required value={form.unitCostUsd} onChange={(e) => setForm({ ...form, unitCostUsd: e.target.value })} /></label>
              <label><span className="label">Existencia</span><input className="field" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></label>
              <label><span className="label">Garantía (años)</span><input className="field" type="number" min="0" value={form.warrantyYears} onChange={(e) => setForm({ ...form, warrantyYears: e.target.value })} /></label>
              <label className="sm:col-span-2 lg:col-span-3"><span className="label">Descripción</span><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="rounded-xl border border-dashed p-4 sm:col-span-2 lg:col-span-3"><span className="label">Logo del fabricante o equipo</span><span className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-500"><ImagePlus size={18}/>{form.logoUrl?"Cambiar logo":"Subir logo"}<input className="hidden" type="file" accept="image/png,image/jpeg" onChange={e=>{const file=e.target.files?.[0];if(file)void imageToDataUrl(file,{maxWidth:800,maxHeight:500,outputType:"image/png"}).then(logoUrl=>setForm(old=>({...old,logoUrl})))}}/></span>{form.logoUrl&&<img src={form.logoUrl} alt="Logo del equipo" className="mt-3 h-16 max-w-full object-contain"/>}</label>
              <label className="sm:col-span-1"><span className="label">Datasheet (opcional)</span><input className="field file:mr-3 file:border-0 file:bg-transparent file:font-semibold" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setDatasheet(e.target.files?.[0] || null)} /><span className="mt-1 block text-xs text-slate-500">PDF, PNG o JPG · máximo 4 MB</span></label>
              <label className="sm:col-span-1"><span className="label">Certificado (opcional)</span><input className="field file:mr-3 file:border-0 file:bg-transparent file:font-semibold" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setCertificate(e.target.files?.[0] || null)} /><span className="mt-1 block text-xs text-slate-500">PDF, PNG o JPG · máximo 4 MB</span></label>
              {message && <p className="text-sm font-medium text-primary sm:col-span-2 lg:col-span-3">{message}</p>}
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Pencil size={17} /> : <Plus size={17} />}{editingId ? "Actualizar equipo" : "Guardar equipo"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Equipos activos ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <Boxes className="text-primary" size={36} />
              <h2 className="mt-4 font-bold">Inventario vacío</h2>
              <p className="mt-1 text-sm text-slate-500">Agrega paneles, inversores y baterías para usarlos en las cotizaciones.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    {["Tipo", "Marca", "Modelo", "Potencia", "Capacidad", "Costo USD", "Existencia", "Garantía", "Documentos"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{typeLabels[item.type]}</span></td>
                      <td className="px-3 py-4 font-semibold"><span className="flex items-center gap-2">{item.logoUrl&&<img src={item.logoUrl} alt="" className="size-8 rounded object-contain"/>}{item.brand}</span></td>
                      <td className="px-3 py-4">{item.model}</td>
                      <td className="px-3 py-4 text-slate-500">{item.powerWatts ? `${item.powerWatts} W` : "—"}</td>
                      <td className="px-3 py-4 text-slate-500">{item.capacityKwh ? `${Number(item.capacityKwh).toFixed(2)} kWh` : "—"}</td>
                      <td className="px-3 py-4 font-semibold">US$ {Number(item.unitCostUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-4 text-center">{item.quantity}</td>
                      <td className="px-3 py-4 text-slate-500">{item.warrantyYears ? `${item.warrantyYears} años` : "—"}</td>
                      <td className="px-3 py-4"><div className="flex min-w-28 flex-col gap-1 text-xs">{item.datasheetName?<span className="inline-flex items-center gap-1 text-emerald-700" title={item.datasheetName}><FileText size={14}/>Datasheet</span>:<span className="text-slate-400">Sin datasheet</span>}{item.certificateName?<span className="inline-flex items-center gap-1 text-emerald-700" title={item.certificateName}><FileCheck2 size={14}/>Certificado</span>:<span className="text-slate-400">Sin certificado</span>}<button type="button" className="mt-1 inline-flex items-center gap-1 font-semibold text-primary" onClick={() => edit(item)}><Pencil size={14}/>Editar</button></div></td>
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
