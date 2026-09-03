"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Customer = {
  id: string;
  name: string;
  nic?: string | null;
  rnc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  utility?: string | null;
  tariff?: string | null;
  createdAt: string;
  _count: { proposals: number };
};

const emptyForm = { name: "", nic: "", rnc: "", email: "", phone: "", address: "", city: "", utility: "EDENORTE", tariff: "BTS-1" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/customers");
    if (response.ok) setCustomers(await response.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(data.error || "No se pudo crear el cliente."); return; }
    setForm(emptyForm);
    setShowForm(false);
    setMessage("Cliente creado correctamente.");
    await load();
  }

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.nic || "").toLowerCase().includes(q) || (c.rnc || "").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Directorio</p>
          <h1 className="text-3xl font-black">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Clientes y NIC aislados por empresa, vinculados a su historial de propuestas.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus size={17} />Nuevo cliente</Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle>Registrar cliente</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="sm:col-span-2 lg:col-span-1"><span className="label">Nombre *</span><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><span className="label">NIC</span><input className="field" value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })} /></label>
              <label><span className="label">RNC</span><input className="field" value={form.rnc} onChange={(e) => setForm({ ...form, rnc: e.target.value })} /></label>
              <label><span className="label">Email</span><input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label><span className="label">Teléfono</span><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label><span className="label">Ciudad</span><input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
              <label><span className="label">Distribuidora</span><select className="field" value={form.utility} onChange={(e) => setForm({ ...form, utility: e.target.value })}>{["EDENORTE", "EDESUR", "EDEESTE"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label><span className="label">Tarifa</span><select className="field" value={form.tariff} onChange={(e) => setForm({ ...form, tariff: e.target.value })}>{["BTS-1", "BTS-2", "BTD", "BTH", "MTD-1", "MTD-2", "MTH"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label className="sm:col-span-2 lg:col-span-3"><span className="label">Dirección</span><input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              {message && <p className="text-sm font-medium text-primary sm:col-span-2 lg:col-span-3">{message}</p>}
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}Guardar cliente</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Directorio ({filtered.length})</CardTitle>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="field w-56 pl-9" placeholder="Buscar por nombre, NIC o RNC" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <Users className="text-primary" size={36} />
              <h2 className="mt-4 font-bold">{query ? "Sin resultados" : "Aún no hay clientes"}</h2>
              <p className="mt-1 text-sm text-slate-500">{query ? "Prueba con otro término de búsqueda." : "Registra el primer cliente para comenzar a cotizar."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-500">
                    {["Cliente", "NIC / RNC", "Contacto", "Ubicación", "Tarifa", "Propuestas"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-3 py-4 font-semibold">{c.name}</td>
                      <td className="px-3 py-4 text-slate-500">{c.nic || "—"}{c.rnc ? ` · ${c.rnc}` : ""}</td>
                      <td className="px-3 py-4 text-slate-500">{c.phone || c.email || "—"}</td>
                      <td className="px-3 py-4 text-slate-500">{c.city || c.address || "—"}</td>
                      <td className="px-3 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{c.utility || "—"} {c.tariff || ""}</span></td>
                      <td className="px-3 py-4 text-center font-semibold">{c._count.proposals}</td>
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