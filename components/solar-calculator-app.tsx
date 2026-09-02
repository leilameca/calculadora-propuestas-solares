"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Download, FileScan, Info, Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSolar, HSP_BY_CITY, MONTHS, type Tariff, type Utility } from "@/lib/solar-calculator";

const money = new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 });
type Inputs = { client:string; nic:string; address:string; city:keyof typeof HSP_BY_CITY; utility:Utility; tariff:Tariff; panelWatts:number; oversizingFactor:number; costPerWpUsd:number; exchangeRate:number; systemType:string; inverter:string };

export function SolarCalculatorApp() {
  const [inputs, setInputs] = useState<Inputs>({ client:"",nic:"",address:"",city:"Santiago",utility:"EDENORTE",tariff:"BTS-1",panelWatts:590,oversizingFactor:1.2,costPerWpUsd:.95,exchangeRate:60,systemType:"On-Grid",inverter:"" });
  const [consumption, setConsumption] = useState<number[]>([1060,980,1015,1100,1180,1240,1320,1290,1190,1110,1040,1025]);
  const [averageCount, setAverageCount] = useState(6);
  const [useAverage, setUseAverage] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const effectiveConsumption = useMemo(() => {
    if (!useAverage) return consumption;
    const billed = consumption.map((kwh, index) => ({ kwh, index })).filter((item) => item.kwh > 0).slice().reverse().slice(0, averageCount);
    const average = billed.length ? billed.reduce((sum, item) => sum + item.kwh, 0) / billed.length : 0;
    return Array(12).fill(average);
  }, [consumption, averageCount, useAverage]);

  const result = useMemo(() => {
    try { return calculateSolar({ consumption: effectiveConsumption, hsp:HSP_BY_CITY[inputs.city], oversizingFactor:inputs.oversizingFactor, panelWatts:inputs.panelWatts, costPerWpUsd:inputs.costPerWpUsd, exchangeRate:inputs.exchangeRate, utility:inputs.utility, tariff:inputs.tariff }); }
    catch { return null; }
  }, [effectiveConsumption, inputs]);

  const chart = result ? MONTHS.map((month,index)=>({ month:month.slice(0,3), consumo:Math.round(effectiveConsumption[index]), generacion:Math.round(result.monthlyGeneration[index]) })) : [];
  const projection = result ? result.projection25Years.map((row)=>({ year:row.year, generacion:Math.round(row.generationKwh), ahorro:Math.round(row.accumulatedSavingsDop) })) : [];

  function set<K extends keyof Inputs>(key: K, value: Inputs[K]) { setInputs((old)=>({...old,[key]:value})); }
  async function scan(file?: File) {
    if (!file) return;
    setOcrBusy(true);
    try {
      const form = new FormData(); form.append("file",file);
      const response = await fetch("/api/ocr",{method:"POST",body:form});
      if (!response.ok) throw new Error("No fue posible leer la factura");
      const data = await response.json();
      setInputs((old)=>({...old,client:data.customerName||old.client,nic:data.nic||old.nic,address:data.address||old.address,tariff:data.tariff||old.tariff,utility:data.utility||old.utility}));
      if (data.consumption?.length) setConsumption(MONTHS.map((_,i)=>Number(data.consumption.find((x:{month:number})=>x.month===i+1)?.kwh||0)));
    } finally { setOcrBusy(false); }
  }
  async function exportDocx() {
    if (!result) return;
    setExporting(true);
    try {
      const response = await fetch("/api/proposals/docx",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ company:{name:"EILEN Electric Service",rnc:"1-31-00000-1",phone:"809-555-0147",email:"propuestas@eilen.do",address:"Santiago, República Dominicana",slogan:"Ingeniería que transforma energía",primaryColor:"#0F4C5C",secondaryColor:"#2F7D32",accentColor:"#F2A900",proposalValidityDays:15}, customer:{name:inputs.client||"Cliente de demostración",nic:inputs.nic||"N/D",address:inputs.address||inputs.city}, project:{name:"Sistema Solar Fotovoltaico",city:inputs.city,utility:inputs.utility,tariff:inputs.tariff,systemType:inputs.systemType,panelWatts:inputs.panelWatts,inverter:inputs.inverter||"Por seleccionar"},consumption:effectiveConsumption,result,quoteItems:defaultQuote(result.costUsd,result.panelCount,inputs.panelWatts,inputs.inverter)})});
      if (!response.ok) throw new Error(await response.text());
      const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`propuesta-${(inputs.client||"solar").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.docx`;a.click();URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Nueva propuesta</p><h1 className="text-3xl font-black tracking-tight">Dimensionamiento solar</h1><p className="mt-1 text-sm text-slate-500">Calcula, compara y exporta una propuesta comercial editable.</p></div><div className="flex gap-2"><Button variant="outline"><Save size={17}/>Guardar borrador</Button><Button onClick={exportDocx} disabled={!result||exporting}>{exporting?<Loader2 className="animate-spin" size={17}/>:<Download size={17}/>}Exportar Word</Button></div></div>

    <Card className="border-dashed border-primary/30 bg-primary/[.03]"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileScan size={20}/></div><div><p className="text-sm font-bold">Lectura inteligente de factura</p><p className="text-xs text-slate-500">PDF, PNG o JPG de EDENORTE, EDESUR o EDEESTE.</p></div></div><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-white px-4 text-sm font-semibold hover:bg-slate-50"><input type="file" accept="image/*,.pdf" className="hidden" onChange={(e)=>scan(e.target.files?.[0])}/>{ocrBusy?<Loader2 size={17} className="animate-spin"/>:<Upload size={17}/>}Analizar factura</label></CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="space-y-6"><Card><CardHeader><CardTitle>Cliente y suministro</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente"><input className="field" value={inputs.client} onChange={e=>set("client",e.target.value)} placeholder="Nombre o razón social"/></Field><Field label="NIC"><input className="field" value={inputs.nic} onChange={e=>set("nic",e.target.value)} placeholder="Contrato energético"/></Field><Field label="Dirección" wide><input className="field" value={inputs.address} onChange={e=>set("address",e.target.value)} placeholder="Ubicación del proyecto"/></Field>
        <Field label="Provincia / ciudad"><select className="field" value={inputs.city} onChange={e=>set("city",e.target.value as Inputs["city"])}>{Object.keys(HSP_BY_CITY).map(v=><option key={v}>{v}</option>)}</select></Field><Field label="HSP"><input className="field bg-slate-50" readOnly value={HSP_BY_CITY[inputs.city].toFixed(2)}/></Field><Field label="Distribuidora"><select className="field" value={inputs.utility} onChange={e=>set("utility",e.target.value as Utility)}>{["EDENORTE","EDESUR","EDEESTE"].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Tarifa"><select className="field" value={inputs.tariff} onChange={e=>set("tariff",e.target.value as Tariff)}>{["BTS-1","BTS-2","BTD","BTH","MTD-1","MTD-2","MTH"].map(v=><option key={v}>{v}</option>)}</select></Field>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Configuración técnica</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><NumberField label="Panel (W)" value={inputs.panelWatts} onChange={v=>set("panelWatts",v)}/><NumberField label="Sobredimensionamiento" value={inputs.oversizingFactor} step="0.05" onChange={v=>set("oversizingFactor",v)}/><NumberField label="Costo USD/Wp" value={inputs.costPerWpUsd} step="0.01" onChange={v=>set("costPerWpUsd",v)}/><NumberField label="Tasa RD$/USD" value={inputs.exchangeRate} step="0.01" onChange={v=>set("exchangeRate",v)}/><Field label="Inversor" wide><select className="field" value={inputs.inverter} onChange={e=>set("inverter",e.target.value)}><option value="">Seleccionar después</option><option>Solis S6 10 kW</option><option>Deye SUN-12K-SG04LP3 12 kW</option><option>Huawei SUN2000-15KTL 15 kW</option><option value="manual">Especificación manual</option></select><p className="mt-1 text-[11px] text-slate-500">No se asigna automáticamente; proviene del inventario o se indica manualmente.</p></Field></CardContent></Card></div>

      <div className="space-y-6"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Consumo facturado (kWh)</CardTitle><div className="flex items-center gap-2"><select className="h-8 rounded-md border bg-white px-2 text-xs" value={averageCount} onChange={e=>setAverageCount(Number(e.target.value))}>{[3,6,9,12].map(v=><option key={v} value={v}>Últimos {v}</option>)}</select><button onClick={()=>setUseAverage(v=>!v)} className={`h-8 rounded-md px-3 text-xs font-semibold ${useAverage?"bg-primary text-white":"border bg-white"}`}>Promediar</button></div></CardHeader><CardContent><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{MONTHS.map((month,index)=><Field key={month} label={month.slice(0,3)}><input type="number" min="0" className="field text-right" value={consumption[index]||""} onChange={e=>setConsumption(old=>old.map((v,i)=>i===index?Number(e.target.value):v))}/></Field>)}</div>{useAverage&&<div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Info size={16} className="mt-0.5 shrink-0"/>El cálculo usa los últimos {averageCount} registros con consumo mayor que cero, ordenados desde el más reciente; no usa meses calendario vacíos.</div>}</CardContent></Card>
      {result&&<><div className="rounded-xl border border-primary/20 bg-primary/[.06] p-4 text-sm font-medium text-slate-700"><span className="mr-2 inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white"><Calculator size={13} className="mr-1"/>Análisis</span>Según el promedio de <strong>{number.format(result.averageMonthlyConsumption)} kWh</strong>, el consumo requiere teóricamente <strong>{result.theoreticalPanelCount} paneles de {inputs.panelWatts} W</strong> para el 100% de cobertura.</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Sistema instalado" value={`${result.installedKwp.toFixed(2)} kWp`}/><Metric label="Paneles" value={String(result.panelCount)}/><Metric label="Cobertura" value={`${result.coveragePercent.toFixed(1)}%`}/><Metric label="Inversión" value={money.format(result.totalUsd)}/></div></>}
      </div>
    </div>

    {result&&<><div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Generación solar vs. consumo mensual</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Bar dataKey="consumo" name="Consumo" fill="#0F4C5C" radius={[4,4,0,0]}/><Bar dataKey="generacion" name="Generación" fill="#F2A900" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Resultado financiero</CardTitle></CardHeader><CardContent className="space-y-4"><ResultRow label="Ahorro mensual" value={`RD$ ${number.format(result.monthlySavingsDop)}`}/><ResultRow label="Ahorro anual" value={`RD$ ${number.format(result.annualSavingsDop)}`}/><ResultRow label="Retorno estimado" value={`${result.roiYears.toFixed(1)} años`}/><ResultRow label="CO2 evitado" value={`${result.co2AvoidedTons.toFixed(2)} t/año`}/><ResultRow label="Precio por Wp" value={money.format(result.pricePerWpUsd)}/></CardContent></Card></div><Card><CardHeader><CardTitle>Proyección de generación a 25 años · degradación anual 0.6%</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={projection}><defs><linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2F7D32" stopOpacity={.3}/><stop offset="95%" stopColor="#2F7D32" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="year"/><YAxis/><Tooltip/><Area type="monotone" dataKey="generacion" name="Generación kWh" stroke="#2F7D32" fill="url(#solar)"/></AreaChart></ResponsiveContainer></CardContent></Card></>}
  </div>;
}

function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}) { return <label className={wide?"sm:col-span-2":""}><span className="label">{label}</span>{children}</label>; }
function NumberField({label,value,step="1",onChange}:{label:string;value:number;step?:string;onChange:(v:number)=>void}) { return <Field label={label}><input className="field text-right" type="number" min="0" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></Field>; }
function Metric({label,value}:{label:string;value:string}) { return <div className="metric"><p className="metric-value">{value}</p><p className="metric-label">{label}</p></div>; }
function ResultRow({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>; }
function defaultQuote(total:number,panels:number,panelWatts:number,inverter:string) { const rows=[["Módulos bifaciales",`${panels} módulos de ${panelWatts} W`,.38],["Inversor",inverter||"A seleccionar",.24],["Estructura galvanizada","Sistema certificado",.11],["Cableado y protecciones","DC/AC y puesta a tierra",.1],["Mano de obra e ingeniería","Instalación y puesta en marcha",.17]] as const; return rows.map(([name,description,share])=>({name,description,amountUsd:total*share})); }
