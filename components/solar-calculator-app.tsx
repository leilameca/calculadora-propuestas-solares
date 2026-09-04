"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Download, FileScan, Info, Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSolar, HSP_BY_CITY, latestBilledAverage, MONTHS, type BilledConsumption, type Tariff, type Utility } from "@/lib/solar-calculator";

const money = new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 });
type Inputs = { client:string; nic:string; address:string; city:keyof typeof HSP_BY_CITY; utility:Utility; tariff:Tariff; panelWatts:number; oversizingFactor:number; costPerWpUsd:number; exchangeRate:number; systemType:string; inverter:string; itbisEnabled:boolean; itbisRate:number; designMode:"automatic"|"manual"; manualPanelCount:number };
type CompanyBrand={name:string;rnc?:string;phone?:string;email?:string;website?:string;address?:string;slogan?:string;primaryColor:string;secondaryColor:string;accentColor:string;proposalValidityDays:number;logoUrl?:string;coverImageUrl?:string;backCoverImageUrl?:string;coverImages?:string[];itbisEnabled?:boolean;itbisRate?:number|string|null};
type InventoryItem={id:string;type:string;brand:string;model:string;powerWatts?:number|null;quantity:number};
const defaultCompany:CompanyBrand={name:"EILEN Electric Service",rnc:"1-31-00000-1",phone:"809-555-0147",email:"propuestas@eilen.do",address:"Santiago, República Dominicana",slogan:"Ingeniería que transforma energía",primaryColor:"#0F4C5C",secondaryColor:"#2F7D32",accentColor:"#F2A900",proposalValidityDays:15,itbisEnabled:true,itbisRate:.18};

export function SolarCalculatorApp() {
  const [inputs, setInputs] = useState<Inputs>({ client:"",nic:"",address:"",city:"Santiago",utility:"EDENORTE",tariff:"BTS-1",panelWatts:590,oversizingFactor:1.2,costPerWpUsd:.95,exchangeRate:60,systemType:"On-Grid",inverter:"",itbisEnabled:true,itbisRate:.18,designMode:"automatic",manualPanelCount:20 });
  const [consumption, setConsumption] = useState<number[]>([1060,980,1015,1100,1180,1240,1320,1290,1190,1110,1040,1025]);
  const [billedRecords,setBilledRecords]=useState<BilledConsumption[]>(consumption.map((kwh,index)=>({month:index+1,year:new Date().getFullYear(),kwh})));
  const [averageCount, setAverageCount] = useState(6);
  const [useAverage, setUseAverage] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [exporting, setExporting] = useState<"docx"|"pdf"|null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [ocrMessage,setOcrMessage]=useState("");
  const [company,setCompany]=useState<CompanyBrand>(defaultCompany);
  const [inventory,setInventory]=useState<InventoryItem[]>([]);
  useEffect(()=>{fetch("/api/company").then(r=>r.ok?r.json():null).then(data=>{if(!data)return;setCompany({...defaultCompany,...data,coverImages:Array.isArray(data.coverImages)?data.coverImages:[]});setInputs(old=>({...old,itbisEnabled:data.itbisEnabled!==false,itbisRate:data.itbisRate == null ? 0.18 : Number(data.itbisRate)}))}).catch(()=>undefined)},[]);
  useEffect(()=>{fetch("/api/equipment").then(r=>r.ok?r.json():[]).then(data=>setInventory(Array.isArray(data)?data.filter((item:InventoryItem)=>item.type==="INVERTER"):[])).catch(()=>setInventory([]))},[]);

  const effectiveConsumption = useMemo(() => {
    if (!useAverage) return consumption;
    const average = latestBilledAverage(billedRecords,averageCount);
    return Array(12).fill(average);
  }, [consumption,billedRecords, averageCount, useAverage]);

  const result = useMemo(() => {
    try { return calculateSolar({ consumption: effectiveConsumption, hsp:HSP_BY_CITY[inputs.city], oversizingFactor:inputs.oversizingFactor, panelWatts:inputs.panelWatts, costPerWpUsd:inputs.costPerWpUsd, exchangeRate:inputs.exchangeRate, utility:inputs.utility, tariff:inputs.tariff,itbisEnabled:inputs.itbisEnabled,itbisRate:inputs.itbisRate,designMode:inputs.designMode,manualPanelCount:inputs.manualPanelCount }); }
    catch { return null; }
  }, [effectiveConsumption, inputs]);

  const chart = result ? MONTHS.map((month,index)=>({ month:month.slice(0,3), consumo:Math.round(effectiveConsumption[index]), generacion:Math.round(result.monthlyGeneration[index]) })) : [];
  const projection = result ? result.projection25Years.map((row)=>({ year:row.year, generacion:Math.round(row.generationKwh), ahorro:Math.round(row.accumulatedSavingsDop) })) : [];

  function set<K extends keyof Inputs>(key: K, value: Inputs[K]) { setInputs((old)=>({...old,[key]:value})); }
  async function scan(file?: File) {
    if (!file) return;
    setOcrBusy(true);
    setOcrMessage("");
    try {
      const form = new FormData(); form.append("file",file);
      const response = await fetch("/api/ocr",{method:"POST",body:form});
      if (!response.ok) throw new Error("No fue posible leer la factura");
      const data = await response.json();
      if(data.requiresManualEntry){setOcrMessage("La factura no fue reconocida como EDENORTE. Los campos manuales permanecen habilitados para completar la propuesta.");return;}
      setInputs((old)=>({...old,client:data.customerName||old.client,nic:data.nic||old.nic,address:data.address||old.address,tariff:data.tariff||old.tariff,utility:data.utility||old.utility}));
      if (data.consumption?.length){setBilledRecords(data.consumption);setConsumption(MONTHS.map((_,i)=>Number(data.consumption.find((x:{month:number})=>x.month===i+1)?.kwh||0)));setOcrMessage(`Factura EDENORTE procesada: ${data.consumption.length} meses recientes, excluyendo el mes base repetido.`);}
    } catch (error) {
      setOcrMessage(error instanceof Error ? error.message : "No fue posible leer la factura.");
    } finally { setOcrBusy(false); }
  }
  async function saveDraft() {
    if (!result) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: inputs.client || "Cliente de demostración",
          customerNic: inputs.nic || null,
          customerAddress: inputs.address || null,
          projectName: "Sistema Solar Fotovoltaico",
          systemType: inputs.systemType,
          city: inputs.city,
          utility: inputs.utility,
          tariff: inputs.tariff,
          monthlyConsumption: effectiveConsumption,
          calculationInput: { ...inputs, hsp: HSP_BY_CITY[inputs.city] },
          calculationResult: result,
          quoteItems: defaultQuote(result.costUsd, result.panelCount, inputs.panelWatts, inputs.inverter),
          manualInverter: inputs.inverter || null,
          exchangeRate: inputs.exchangeRate,
          subtotalUsd: result.costUsd,
          taxUsd: result.itbisUsd,
          totalUsd: result.totalUsd,
        }),
      });
      const data = await response.json();
      setSaveMessage(response.ok ? `Borrador guardado: ${data.number}` : data.error || "No se pudo guardar.");
    } catch {
      setSaveMessage("Error de red al guardar el borrador.");
    } finally {
      setSaving(false);
    }
  }

  function proposalPayload() {
    if (!result) return null;
    return { company:{...company,logoBase64:company.logoUrl,coverImageBase64:company.coverImageUrl||company.coverImages?.[0],backCoverImageBase64:company.backCoverImageUrl||company.coverImages?.[1]||company.coverImages?.[0],itbisEnabled:inputs.itbisEnabled,itbisRate:inputs.itbisRate}, customer:{name:inputs.client||"Cliente de demostración",nic:inputs.nic||"N/D",address:inputs.address||inputs.city}, project:{name:"Sistema Solar Fotovoltaico",city:inputs.city,utility:inputs.utility,tariff:inputs.tariff,systemType:inputs.systemType,panelWatts:inputs.panelWatts,inverter:inputs.inverter||"Por seleccionar"},consumption:effectiveConsumption,result,quoteItems:defaultQuote(result.costUsd,result.panelCount,inputs.panelWatts,inputs.inverter)};
  }
  async function exportProposal(format:"docx"|"pdf") {
    if (!result) return;
    setExporting(format);
    try {
      const response = await fetch(`/api/proposals/${format}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(proposalPayload())});
      if (!response.ok) throw new Error(await response.text());
      const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`propuesta-${(inputs.client||"solar").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.${format}`;a.click();URL.revokeObjectURL(url);
    } catch (error) {
      setSaveMessage(error instanceof Error ? `Error al exportar ${format.toUpperCase()}: ${error.message}` : "No se pudo exportar la propuesta.");
    } finally { setExporting(null); }
  }

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Nueva propuesta</p><h1 className="text-3xl font-black tracking-tight">Dimensionamiento solar</h1><p className="mt-1 text-sm text-slate-500">Calcula, compara y exporta una propuesta comercial editable.</p></div><div className="flex flex-col items-end gap-1"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={saveDraft} disabled={!result||saving}>{saving?<Loader2 className="animate-spin" size={17}/>:<Save size={17}/>}Guardar borrador</Button><Button variant="outline" onClick={()=>void exportProposal("pdf")} disabled={!result||Boolean(exporting)}>{exporting==="pdf"?<Loader2 className="animate-spin" size={17}/>:<Download size={17}/>}Exportar PDF</Button><Button onClick={()=>void exportProposal("docx")} disabled={!result||Boolean(exporting)}>{exporting==="docx"?<Loader2 className="animate-spin" size={17}/>:<Download size={17}/>}Exportar Word</Button></div>{saveMessage&&<p className="text-xs font-semibold text-primary">{saveMessage}</p>}</div></div>

    <Card className="border-dashed border-primary/30 bg-primary/[.03]"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileScan size={20}/></div><div><p className="text-sm font-bold">Lectura inteligente de factura EDENORTE</p><p className="text-xs text-slate-500">PDF, PNG o JPG. EDESUR, EDEESTE y formatos no reconocidos continúan por ingreso manual.</p>{ocrMessage&&<p className="mt-1 text-xs font-semibold text-primary">{ocrMessage}</p>}</div></div><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-white px-4 text-sm font-semibold hover:bg-slate-50"><input type="file" accept="image/*,.pdf" className="hidden" onChange={(e)=>scan(e.target.files?.[0])}/>{ocrBusy?<Loader2 size={17} className="animate-spin"/>:<Upload size={17}/>}Analizar factura</label></CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="space-y-6"><Card><CardHeader><CardTitle>Cliente y suministro</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente"><input className="field" value={inputs.client} onChange={e=>set("client",e.target.value)} placeholder="Nombre o razón social"/></Field><Field label="NIC"><input className="field" value={inputs.nic} onChange={e=>set("nic",e.target.value)} placeholder="Contrato energético"/></Field><Field label="Dirección" wide><input className="field" value={inputs.address} onChange={e=>set("address",e.target.value)} placeholder="Ubicación del proyecto"/></Field>
        <Field label="Provincia / ciudad"><select className="field" value={inputs.city} onChange={e=>set("city",e.target.value as Inputs["city"])}>{Object.keys(HSP_BY_CITY).map(v=><option key={v}>{v}</option>)}</select></Field><Field label="HSP"><input className="field bg-slate-50" readOnly value={HSP_BY_CITY[inputs.city].toFixed(2)}/></Field><Field label="Distribuidora"><select className="field" value={inputs.utility} onChange={e=>set("utility",e.target.value as Utility)}>{["EDENORTE","EDESUR","EDEESTE"].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Tarifa"><select className="field" value={inputs.tariff} onChange={e=>set("tariff",e.target.value as Tariff)}>{["BTS-1","BTS-2","BTD","BTH","MTD-1","MTD-2","MTH"].map(v=><option key={v}>{v}</option>)}</select></Field>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Configuración técnica</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Modo de diseño"><select className="field" value={inputs.designMode} onChange={e=>set("designMode",e.target.value as Inputs["designMode"])}><option value="automatic">Automático (según consumo)</option><option value="manual">Manual (cantidad de paneles)</option></select></Field>{inputs.designMode==="manual"&&<NumberField label="Cantidad de paneles" value={inputs.manualPanelCount} onChange={v=>set("manualPanelCount",v)}/>}<NumberField label="Panel (W)" value={inputs.panelWatts} onChange={v=>set("panelWatts",v)}/><NumberField label="Sobredimensionamiento" value={inputs.oversizingFactor} step="0.05" onChange={v=>set("oversizingFactor",v)}/><NumberField label="Costo USD/Wp" value={inputs.costPerWpUsd} step="0.01" onChange={v=>set("costPerWpUsd",v)}/><NumberField label="Tasa RD$/USD" value={inputs.exchangeRate} step="0.01" onChange={v=>set("exchangeRate",v)}/><Field label="Aplicar ITBIS"><select className="field" value={inputs.itbisEnabled?"yes":"no"} onChange={e=>set("itbisEnabled",e.target.value==="yes")}><option value="yes">Sí</option><option value="no">No</option></select></Field><Field label="Tasa ITBIS (%)"><input className="field text-right disabled:cursor-not-allowed disabled:bg-slate-100" type="number" min="0" max="100" step="0.01" disabled={!inputs.itbisEnabled} value={inputs.itbisRate*100} onChange={e=>set("itbisRate",Number(e.target.value)/100)}/></Field><Field label="Inversor" wide><input className="field" list="tenant-inverters" value={inputs.inverter} onChange={e=>set("inverter",e.target.value)} placeholder="Selecciona del inventario o escribe una especificación"/><datalist id="tenant-inverters">{inventory.map(item=><option key={item.id} value={`${item.brand} ${item.model}${item.powerWatts?` ${item.powerWatts} W`:""}`}>{item.quantity} disponibles</option>)}</datalist><p className="mt-1 text-[11px] text-slate-500">No se asigna automáticamente. Puedes elegir un inversor activo del inventario o escribir cualquier modelo manualmente.</p></Field></CardContent></Card></div>

      <div className="space-y-6"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Consumo facturado (kWh)</CardTitle><div className="flex items-center gap-2"><select className="h-8 rounded-md border bg-white px-2 text-xs" value={averageCount} onChange={e=>setAverageCount(Number(e.target.value))}>{[3,6,9,12].map(v=><option key={v} value={v}>Últimos {v}</option>)}</select><button onClick={()=>setUseAverage(v=>!v)} className={`h-8 rounded-md px-3 text-xs font-semibold ${useAverage?"bg-primary text-white":"border bg-white"}`}>Promediar</button></div></CardHeader><CardContent><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{MONTHS.map((month,index)=><Field key={month} label={month.slice(0,3)}><input type="number" min="0" className="field text-right" value={consumption[index]||""} onChange={e=>{const kwh=Number(e.target.value);setConsumption(old=>old.map((v,i)=>i===index?kwh:v));setBilledRecords(old=>{const next=old.filter(item=>item.month!==index+1);return kwh>0?[...next,{month:index+1,year:new Date().getFullYear(),kwh}]:next})}}/></Field>)}</div>{useAverage&&<div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Info size={16} className="mt-0.5 shrink-0"/>El cálculo usa los últimos {averageCount} registros realmente facturados, ordenados por año y mes desde el más reciente; no usa meses vacíos ni el mes base repetido.</div>}</CardContent></Card>
      {result&&<><div className="rounded-xl border border-primary/20 bg-primary/[.06] p-4 text-sm font-medium text-slate-700"><span className="mr-2 inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white"><Calculator size={13} className="mr-1"/>Análisis</span>Según el promedio de <strong>{number.format(result.averageMonthlyConsumption)} kWh</strong>, el consumo requiere teóricamente <strong>{result.theoreticalPanelCount} paneles de {inputs.panelWatts} W</strong> para el 100% de cobertura.</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Sistema instalado" value={`${result.installedKwp.toFixed(2)} kWp`}/><Metric label="Paneles" value={String(result.panelCount)}/><Metric label="Cobertura" value={`${result.coveragePercent.toFixed(1)}%`}/><Metric label="Inversión" value={money.format(result.totalUsd)}/></div></>}
      </div>
    </div>

    {result&&<><div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Generación solar vs. consumo mensual</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Bar dataKey="consumo" name="Consumo" fill={company.primaryColor} radius={[4,4,0,0]}/><Bar dataKey="generacion" name="Generación" fill={company.accentColor} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Resultado financiero</CardTitle></CardHeader><CardContent className="space-y-4"><ResultRow label="Ahorro mensual" value={`RD$ ${number.format(result.monthlySavingsDop)}`}/><ResultRow label="Ahorro anual" value={`RD$ ${number.format(result.annualSavingsDop)}`}/><ResultRow label="Retorno estimado" value={`${result.roiYears.toFixed(1)} años`}/><ResultRow label="CO2 evitado" value={`${result.co2AvoidedTons.toFixed(2)} t/año`}/><ResultRow label="Precio por Wp" value={money.format(result.pricePerWpUsd)}/></CardContent></Card></div><Card><CardHeader><CardTitle>Proyección de generación a 25 años · degradación anual 0.6%</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={projection}><defs><linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={company.secondaryColor} stopOpacity={.3}/><stop offset="95%" stopColor={company.secondaryColor} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="year"/><YAxis/><Tooltip/><Area type="monotone" dataKey="generacion" name="Generación kWh" stroke={company.secondaryColor} fill="url(#solar)"/></AreaChart></ResponsiveContainer></CardContent></Card></>}
  </div>;
}

function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}) { return <label className={wide?"sm:col-span-2":""}><span className="label">{label}</span>{children}</label>; }
function NumberField({label,value,step="1",onChange}:{label:string;value:number;step?:string;onChange:(v:number)=>void}) { return <Field label={label}><input className="field text-right" type="number" min="0" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></Field>; }
function Metric({label,value}:{label:string;value:string}) { return <div className="metric"><p className="metric-value">{value}</p><p className="metric-label">{label}</p></div>; }
function ResultRow({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>; }
function defaultQuote(total:number,panels:number,panelWatts:number,inverter:string) { const rows=[["Módulos bifaciales",`${panels} módulos de ${panelWatts} W`,.38],["Inversor",inverter||"A seleccionar",.24],["Estructura galvanizada","Sistema certificado",.11],["Cableado y protecciones","DC/AC y puesta a tierra",.1],["Mano de obra e ingeniería","Instalación y puesta en marcha",.17]] as const; return rows.map(([name,description,share])=>({name,description,amountUsd:total*share})); }
