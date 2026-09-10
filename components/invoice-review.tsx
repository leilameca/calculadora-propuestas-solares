"use client";
import { useState } from "react";
import type { ParsedUtilityBill } from "@/lib/utility-bill/types";
import { validateBill } from "@/lib/utility-bill/parser";

export function InvoiceReview({ initial, onConfirm, onCancel }: { initial: ParsedUtilityBill; onConfirm: (bill: ParsedUtilityBill) => void; onCancel: () => void }) {
  const [bill, setBill] = useState(initial);
  const [error, setError] = useState("");
  const field = (key: "customerName" | "nic" | "contractNumber" | "address" | "tariff", label: string) => <label className="grid gap-1 text-sm">{label}<input className="rounded border p-2" value={bill[key] ?? ""} onChange={event => setBill({ ...bill, [key]: event.target.value })}/></label>;
  function confirm() {
    const checked = validateBill({ ...bill, warnings: [] });
    if (checked.consumptionHistory.length !== bill.consumptionHistory.length || (bill.currentConsumptionKwh !== undefined && !checked.currentConsumptionKwh) || (bill.billingPeriod && !checked.billingPeriod)) { setError("Corrija los períodos/consumos inválidos o duplicados antes de confirmar."); return; }
    onConfirm(checked);
  }
  return <section aria-label="Datos detectados de la factura" className="rounded-xl border bg-white p-5 shadow-sm">
    <h2 className="text-lg font-bold">Datos detectados de la factura</h2>
    <p className="my-2 text-sm">Confianza estimada: {Math.round(initial.confidence * 100)}%. Revise y corrija antes de incorporar los datos a la propuesta.</p>
    <ul className="my-3 list-disc pl-5 text-sm text-amber-800">{initial.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="grid gap-1 text-sm">Distribuidora<select className="rounded border p-2" value={bill.utility} onChange={event => setBill({ ...bill, utility: event.target.value as ParsedUtilityBill["utility"] })}>{["UNKNOWN", "EDENORTE", "EDEESTE", "EDESUR"].map(value => <option key={value}>{value}</option>)}</select></label>
      {field("customerName", "Nombre del cliente")}{field("nic", "NIC")}{field("contractNumber", "Contrato")}{field("tariff", "Tarifa")}{field("address", "Dirección")}
      <label className="grid gap-1 text-sm">Período facturado<input type="month" className="rounded border p-2" value={bill.billingPeriod ? `${bill.billingPeriod.year}-${String(bill.billingPeriod.month).padStart(2, "0")}` : ""} onChange={event => { const [year, month] = event.target.value.split("-").map(Number); setBill({ ...bill, billingPeriod: year && month ? { year, month } : undefined }); }}/></label>
      <label className="grid gap-1 text-sm">Consumo actual (kWh)<input type="number" min="0.01" step="any" className="rounded border p-2" value={bill.currentConsumptionKwh ?? ""} onChange={event => setBill({ ...bill, currentConsumptionKwh: event.target.value === "" ? undefined : Number(event.target.value) })}/></label>
    </div>
    <div className="my-4 space-y-2">{bill.consumptionHistory.map((row, index) => <div key={index} className="flex flex-wrap gap-2">{(["month", "year", "kwh"] as const).map((key, column) => <label key={key} className="grid text-xs">{["Mes (1–12)", "Año", "Consumo (kWh)"][column]}<input className="w-28 rounded border p-2" type="number" step={key === "kwh" ? "any" : "1"} value={row[key]} onChange={event => setBill({ ...bill, consumptionHistory: bill.consumptionHistory.map((value, i) => i === index ? { ...value, [key]: Number(event.target.value) } : value) })}/></label>)}<button className="text-sm underline" onClick={() => setBill({ ...bill, consumptionHistory: bill.consumptionHistory.filter((_, i) => i !== index) })}>Quitar mes</button></div>)}</div>
    {bill.consumptionHistory.length < 12 && <button className="text-sm underline" onClick={() => setBill({ ...bill, consumptionHistory: [...bill.consumptionHistory, { month: 1, year: new Date().getFullYear(), kwh: 0 }] })}>Añadir mes</button>}
    {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
    <div className="mt-4 flex gap-3"><button className="rounded bg-primary px-4 py-2 text-white" onClick={confirm}>Confirmar datos</button><button className="rounded border px-4 py-2" onClick={onCancel}>Cancelar</button></div>
  </section>;
}
