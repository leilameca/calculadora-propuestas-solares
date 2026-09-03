"use client";

import { useEffect, useState } from "react";
import { Boxes, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  active: boolean;
};

const typeLabels: Record<Equipment["type"], string> = {
  PANEL: "Panel",
  INVERTER: "Inversor",
  BATTERY: "Batería",
  STRUCTURE: "Estructura",
  PROTECTION: "Protección",
  OTHER: "Otro",
};

const emptyForm = { type: "PANEL" as Equipment["type"], brand: "", model: "", description: "", powerWatts: "", capacityKwh: "", unitCostUsd: "", quantity: 1, warrantyYears: "" };

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/equipment");
    if (response.ok) setItems(await response.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
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
    };
    const response = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(data.error || "No se pudo guardar el equipo."); return; }
    setForm(emptyForm);
    setShowForm(false);
    setMessage("Equipo agregado al inventario.");
    await load();
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
          <CardHeader><CardTitle>Registrar equipo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label><span className="label">Tipo *</span><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Equipment["type"] })}>{(Object.keys(typeLabels) as Equipment["type"][]).map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}</select></label>
              <label><span className="label">Marca *</span><input className="field" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>
              <label><span className="label">Modelo *</span><input className="field" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
              <label><span className="label">Potencia (W)</span><input className="field" type="number" min="0" value={form.powerWatts} onChange={(e) => setForm({ ...form, powerWatts: e.target.value })} /></label>
              <label><span className="label">Capacidad (kWh)</span><input className="field" type="number" min="0" step="0.01" value={form.capacityKwh} onChange={(e) => setForm({ ...form, capacityKwh: e.target.value })} /></label>
              <label><span className="label">Costo unitario USD *</span><input className="field" type="number" min="0" step="0.01" required value={form.unitCostUsd} onChange={(e) => setForm({ ...form, unitCostUsd: e.target.value })} /></label>
              <label><span className="label">Existencia</span><input className="field" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></label>
              <label><span className="label">Garantía (años)</span><input className="field" type="number" min="0" value={form.warrantyYears} onChange={(e) => setForm({ ...form, warrantyYears: e.target.value })} /></label>
              <label className="sm:col-span-2 lg:col-span-3"><span className="label">Descripción</span><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              {message && <p className="text-sm font-medium text-primary sm:col-span-2 lg:col-span-3">{message}</p>}
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}Guardar equipo</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
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
                    {["Tipo", "Marca", "Modelo", "Potencia", "Capacidad", "Costo USD", "Existencia", "Garantía"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{typeLabels[item.type]}</span></td>
                      <td className="px-3 py-4 font-semibold">{item.brand}</td>
                      <td className="px-3 py-4">{item.model}</td>
                      <td className="px-3 py-4 text-slate-500">{item.powerWatts ? `${item.powerWatts} W` : "—"}</td>
                      <td className="px-3 py-4 text-slate-500">{item.capacityKwh ? `${Number(item.capacityKwh).toFixed(2)} kWh` : "—"}</td>
                      <td className="px-3 py-4 font-semibold">US$ {Number(item.unitCostUsd).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-4 text-center">{item.quantity}</td>
                      <td className="px-3 py-4 text-slate-500">{item.warrantyYears ? `${item.warrantyYears} años` : "—"}</td>
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