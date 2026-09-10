"use client";

import { InvoiceReview } from "./invoice-review";
import type { ParsedUtilityBill } from "@/lib/utility-bill/types";
import { ELECTRICITY_RATES } from "@/lib/solar-calculator";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Download, FileScan, Info, Loader2, Plus, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSolar, HSP_BY_CITY, latestBilledAverage, MONTHS, type BilledConsumption, type Tariff, type Utility } from "@/lib/solar-calculator";
import { fileToDataUrl, imageToDataUrl } from "@/lib/client-images";

const money = new Intl.NumberFormat("es-DO", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 });
type Inputs = { client:string; nic:string; address:string; city:keyof typeof HSP_BY_CITY; utility:Utility; tariff:Tariff; panelEquipmentId:string; panelWatts:number; oversizingFactor:number; costPerWpUsd:number; exchangeRate:number; systemType:string; inverter:string; battery:string; itbisEnabled:boolean; itbisRate:number; designMode:"automatic"|"manual"; manualPanelCount:number };
type CompanyBrand={name:string;rnc?:string;phone?:string;email?:string;website?:string;address?:string;slogan?:string;primaryColor:string;secondaryColor:string;accentColor:string;proposalValidityDays:number;logoUrl?:string;coverImageUrl?:string;backCoverImageUrl?:string;coverImages?:string[];itbisEnabled?:boolean;itbisRate?:number|string|null};
type InventoryItem={id:string;type:string;brand:string;model:string;powerWatts?:number|null;quantity:number;logoUrl?:string|null;warrantyYears?:number|null};
type Customer={id:string;name:string;nic?:string|null;address?:string|null;city?:string|null;utility?:string|null;tariff?:string|null;logoUrl?:string|null;projectImageUrl?:string|null};
type AdditionalItem={id:number;name:string;amount:string};
const defaultCompany:CompanyBrand={name:"EILEN Electric Service",rnc:"1-31-00000-1",phone:"809-555-0147",email:"propuestas@eilen.do",address:"Santiago, República Dominicana",slogan:"Ingeniería que transforma energía",primaryColor:"#0F4C5C",secondaryColor:"#2F7D32",accentColor:"#F2A900",proposalValidityDays:15,itbisEnabled:true,itbisRate:.18};

function manualBilledRecords(values:number[],lastMonth:number,lastYear:number):BilledConsumption[]{
  return values.map((kwh,index)=>{const month=index+1;return {month,year:month<=lastMonth?lastYear:lastYear-1,kwh:Number(kwh)||0}}).filter(record=>record.kwh>0);
}

export function SolarCalculatorApp() {
  const [inputs, setInputs] = useState<Inputs>({ client:"",nic:"",address:"",city:"Santiago",utility:"EDENORTE",tariff:"BTS-1",panelEquipmentId:"",panelWatts:590,oversizingFactor:1.2,costPerWpUsd:.95,exchangeRate:60,systemType:"On-Grid",inverter:"",battery:"",itbisEnabled:true,itbisRate:.18,designMode:"automatic",manualPanelCount:20 });
  const [consumption, setConsumption] = useState<number[]>(Array(12).fill(0));
  const [billedRecords,setBilledRecords]=useState<BilledConsumption[]>([]);
  const [averageCount, setAverageCount] = useState(6);
  const [useAverage, setUseAverage] = useState(false);
  const [lastBilledMonth,setLastBilledMonth]=useState(new Date().getMonth()+1);
  const [lastBilledYear,setLastBilledYear]=useState(new Date().getFullYear());
  const [pendingBill,setPendingBill]=useState<{bill:ParsedUtilityBill;file:{name:string;mimeType:string;dataUrl:string}}|null>(null);
  const [confirmedBill,setConfirmedBill]=useState<ParsedUtilityBill|null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [exporting, setExporting] = useState<"docx"|"pdf"|null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [ocrMessage,setOcrMessage]=useState("");
  const [company,setCompany]=useState<CompanyBrand>(defaultCompany);
  const [inventory,setInventory]=useState<InventoryItem[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [additionalItems,setAdditionalItems]=useState<AdditionalItem[]>([]);
  const [projectImage,setProjectImage]=useState("");
  const [customerLogo,setCustomerLogo]=useState("");
  const [invoice,setInvoice]=useState<{name:string;mimeType:string;dataUrl:string}|null>(null);
  const [proposalText,setProposalText]=useState("Diseñamos esta solución para reducir el costo energético del cliente con equipos confiables, monitoreo incluido y acompañamiento técnico durante la implementación.");
  useEffect(()=>{fetch("/api/company").then(r=>r.ok?r.json():null).then(data=>{if(!data)return;setCompany({...defaultCompany,...data,coverImages:Array.isArray(data.coverImages)?data.coverImages:[]});setInputs(old=>({...old,itbisEnabled:data.itbisEnabled!==false,itbisRate:data.itbisRate == null ? 0.18 : Number(data.itbisRate)}))}).catch(()=>undefined)},[]);
  useEffect(()=>{fetch("/api/equipment").then(r=>r.ok?r.json():[]).then(data=>setInventory(Array.isArray(data)?data:[])).catch(()=>setInventory([]))},[]);
  useEffect(()=>{fetch("/api/customers").then(r=>r.ok?r.json():[]).then(data=>setCustomers(Array.isArray(data)?data:[])).catch(()=>setCustomers([]))},[]);
  useEffect(()=>{
    const proposalId = new URLSearchParams(window.location.search).get("proposal");
    if (!proposalId) return;
    fetch(`/api/proposals?id=${encodeURIComponent(proposalId)}`).then(async response=>{
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"No se pudo abrir la propuesta.");
      const savedInput=(data.calculationInput&&typeof data.calculationInput==="object"?data.calculationInput:{}) as Partial<Inputs>&{billedRecords?:BilledConsumption[];averageCount?:number;useAverage?:boolean;lastBilledMonth?:number;lastBilledYear?:number;utilityBill?:ParsedUtilityBill};
      setConfirmedBill(savedInput.utilityBill??null);
      setEditingId(data.id);setEditingNumber(data.number);
      setProjectImage(data.projectImageUrl||data.customer?.projectImageUrl||"");setCustomerLogo(data.customer?.logoUrl||"");setProposalText(data.notes||"");
      if(data.invoiceData)setInvoice({name:data.invoiceName||"factura.pdf",mimeType:data.invoiceMimeType||"application/pdf",dataUrl:data.invoiceData});
      setInputs(old=>({...old,...savedInput,client:data.customer?.name||old.client,nic:data.customer?.nic||"",address:data.customer?.address||"",city:(data.city||old.city) as Inputs["city"],utility:(data.utility||old.utility) as Utility,tariff:(data.tariff||old.tariff) as Tariff,systemType:data.systemType||old.systemType,exchangeRate:Number(data.exchangeRate)||old.exchangeRate}));
      const stored=Array.isArray(data.monthlyConsumption)?data.monthlyConsumption.map(Number):[];
      if(stored.length===12)setConsumption(stored);
      const records=Array.isArray(savedInput.billedRecords)?savedInput.billedRecords:stored.map((kwh:number,month:number)=>({month:month+1,year:new Date().getFullYear(),kwh})).filter((item:BilledConsumption)=>item.kwh>0);
      setBilledRecords(records);
      const latest=[...records].sort((a,b)=>(b.year-a.year)||(b.month-a.month))[0];
      setLastBilledMonth(Number(savedInput.lastBilledMonth)||latest?.month||new Date().getMonth()+1);
      setLastBilledYear(Number(savedInput.lastBilledYear)||latest?.year||new Date().getFullYear());
      if(savedInput.averageCount)setAverageCount(savedInput.averageCount);
      setUseAverage(Boolean(savedInput.useAverage));
      const extras=Array.isArray(data.quoteItems)?data.quoteItems.filter((item:{description?:string})=>item.description==="Adicional solicitado").map((item:{name:string;amountUsd:number},index:number)=>({id:Date.now()+index,name:item.name,amount:String(item.amountUsd)})):[];
      setAdditionalItems(extras);
      setSaveMessage(`Editando ${data.number}`);
    }).catch(error=>setSaveMessage(error instanceof Error?error.message:"No se pudo abrir la propuesta."));
  },[]);

  const effectiveConsumption = useMemo(() => {
    if (!useAverage) return consumption;
    const average = latestBilledAverage(billedRecords,averageCount);
    return Array(12).fill(average);
  }, [consumption,billedRecords, averageCount, useAverage]);
  const averagedPeriods = useMemo(()=>billedRecords.filter(record=>record.kwh>0).sort((a,b)=>(b.year-a.year)||(b.month-a.month)).slice(0,averageCount),[billedRecords,averageCount]);

  const result = useMemo(() => {
    try { return calculateSolar({ consumption: effectiveConsumption, hsp:HSP_BY_CITY[inputs.city], oversizingFactor:inputs.oversizingFactor, panelWatts:inputs.panelWatts, costPerWpUsd:inputs.costPerWpUsd, exchangeRate:inputs.exchangeRate, utility:inputs.utility, tariff:inputs.tariff,itbisEnabled:inputs.itbisEnabled,itbisRate:inputs.itbisRate,designMode:inputs.designMode,manualPanelCount:inputs.manualPanelCount }); }
    catch { return null; }
  }, [effectiveConsumption, inputs]);

  const chart = result ? MONTHS.map((month,index)=>({ month:month.slice(0,3), consumo:Math.round(effectiveConsumption[index]), generacion:Math.round(result.monthlyGeneration[index]) })) : [];
  const projection = result ? result.projection25Years.map((row)=>({ year:row.year, generacion:Math.round(row.generationKwh), ahorro:Math.round(row.accumulatedSavingsDop) })) : [];

  function set<K extends keyof Inputs>(key: K, value: Inputs[K]) { setInputs((old)=>({...old,[key]:value})); }
  function quoteItems() {
    const items = defaultQuote(result?.costUsd || 0, result?.panelCount || 0, inputs.panelWatts, inputs.inverter, inputs.systemType, inputs.battery);
    additionalItems.forEach((item) => {
      const amount = Number(item.amount);
      if (item.name.trim() && Number.isFinite(amount) && amount > 0) items.push({ name: item.name.trim(), description: "Adicional solicitado", amountUsd: amount });
    });
    return items;
  }
  function addAdditional() { setAdditionalItems((items) => [...items, { id: Date.now(), name: "", amount: "" }]); }
  function updateAdditional(id:number, field:"name"|"amount", value:string) { setAdditionalItems((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item)); }
  function quoteTotals() {
    const subtotalUsd = quoteItems().reduce((sum,item)=>sum+item.amountUsd,0);
    const taxUsd = inputs.itbisEnabled ? subtotalUsd * inputs.itbisRate : 0;
    return { subtotalUsd, taxUsd, totalUsd: subtotalUsd + taxUsd };
  }
  async function scan(file?: File) {
    if (!file) return;
    if(file.size>3*1024*1024){setOcrMessage("La factura debe pesar 3 MB o menos para guardarla e incluirla en la propuesta.");return;}
    setPendingBill(null);
    setOcrBusy(true);
    setOcrMessage("");
    try {
      const pendingFile={name:file.name,mimeType:file.type||"application/pdf",dataUrl:await fileToDataUrl(file)};
      const form = new FormData(); form.append("file",file);
      const response = await fetch("/api/ocr",{method:"POST",body:form});
      const errorData = response.ok ? null : await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorData?.error || "No fue posible leer la factura");
      const data = await response.json();
      setPendingBill({bill:data as ParsedUtilityBill,file:pendingFile});
    } catch (error) {
      setOcrMessage(error instanceof Error ? error.message : "No fue posible leer la factura.");
    } finally { setOcrBusy(false); }
  }
  function confirmInvoice(bill:ParsedUtilityBill) {
    if(!pendingBill)return;
    setInvoice(pendingBill.file);setConfirmedBill(bill);
    setInputs(old=>({...old,client:bill.customerName??old.client,nic:bill.nic??"",address:bill.address??"",tariff:bill.tariff&&bill.tariff in ELECTRICITY_RATES?bill.tariff as Tariff:old.tariff,utility:bill.utility!=="UNKNOWN"?bill.utility:old.utility}));
    const records=bill.consumptionHistory;
    if(records.length){const latest=records.at(-1)!;setBilledRecords(records);setLastBilledMonth(latest.month);setLastBilledYear(latest.year);setConsumption(MONTHS.map((_,i)=>records.findLast(row=>row.month===i+1)?.kwh??0));}
    setPendingBill(null);setOcrMessage(`Datos confirmados: ${records.length} meses. Complete los meses faltantes antes de calcular.`);
  }
  async function saveDraft() {
    if (!result) return;
    const selectedInverter=inventory.find((item)=>item.type==="INVERTER"&&equipmentLabel(item)===inputs.inverter);
    const selectedBattery=inventory.find((item)=>item.type==="BATTERY"&&equipmentLabel(item)===inputs.battery);
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/proposals", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          customerName: inputs.client || "Cliente de demostración",
          customerId: customers.find((customer)=>customer.name===inputs.client&&customer.nic===inputs.nic)?.id || null,
          customerNic: inputs.nic || null,
          customerAddress: inputs.address || null,
          customerLogo:customerLogo||null,
          customerProjectImage:projectImage||null,
          projectName: "Sistema Solar Fotovoltaico",
          systemType: inputs.systemType,
          city: inputs.city,
          utility: inputs.utility,
          tariff: inputs.tariff,
          monthlyConsumption: effectiveConsumption,
          calculationInput: { ...inputs, utilityBill:confirmedBill, batteryEquipmentId:selectedBattery?.id||null, hsp: HSP_BY_CITY[inputs.city], billedRecords, averageCount, useAverage,lastBilledMonth,lastBilledYear },
          calculationResult: result,
          quoteItems: quoteItems(),
          selectedInverterId: selectedInverter?.id || null,
          manualInverter: selectedInverter ? null : inputs.inverter || null,
          exchangeRate: inputs.exchangeRate,
          ...quoteTotals(),
          notes:proposalText||null,projectImageUrl:projectImage||null,invoiceName:invoice?.name||null,invoiceMimeType:invoice?.mimeType||null,invoiceData:invoice?.dataUrl||null,
        }),
      });
      const data = await response.json();
      if(response.ok&&!editingId){setEditingId(data.id);setEditingNumber(data.number);window.history.replaceState(null,"",`/dashboard/calculator?proposal=${encodeURIComponent(data.id)}`);}
      setSaveMessage(response.ok ? `${editingId ? "Cambios guardados" : "Borrador guardado"}: ${data.number}` : data.error || "No se pudo guardar.");
    } catch {
      setSaveMessage("Error de red al guardar el borrador.");
    } finally {
      setSaving(false);
    }
  }

  function proposalPayload() {
    if (!result) return null;
    const selectedInverter=inventory.find((item)=>item.type==="INVERTER"&&equipmentLabel(item)===inputs.inverter),selectedBattery=inventory.find((item)=>item.type==="BATTERY"&&equipmentLabel(item)===inputs.battery);
    return { company:{...company,logoBase64:company.logoUrl,coverImageBase64:projectImage||company.coverImageUrl||company.coverImages?.[0],backCoverImageBase64:company.backCoverImageUrl||company.coverImages?.[1]||company.coverImages?.[0],itbisEnabled:inputs.itbisEnabled,itbisRate:inputs.itbisRate}, customer:{name:inputs.client||"Cliente de demostración",nic:inputs.nic||"N/D",address:inputs.address||inputs.city,logoBase64:customerLogo||undefined}, project:{name:"Sistema Solar Fotovoltaico",city:inputs.city,utility:inputs.utility,tariff:inputs.tariff,systemType:inputs.systemType,panelWatts:inputs.panelWatts,inverter:inputs.inverter||"Por seleccionar",exchangeRate:inputs.exchangeRate},consumption:effectiveConsumption,result,quoteItems:quoteItems(),proposalText,invoice:invoice||undefined,selectedEquipmentIds:[inputs.panelEquipmentId,selectedInverter?.id,selectedBattery?.id].filter((id):id is string=>Boolean(id))};
  }
  async function exportProposal(format:"docx"|"pdf") {
    if (!result) return;
    setExporting(format);
    try {
      if (editingId) {
        const response = await fetch(`/api/proposals/${format}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({proposalId:editingId})});
        if (!response.ok) throw new Error(await response.text());
        const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`${(editingNumber||"propuesta").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.${format}`;a.click();URL.revokeObjectURL(url); return;
      }
      const fullPayload = proposalPayload();
      if (!fullPayload) return;
      let payload = fullPayload;
      if (JSON.stringify(payload).length > 3_000_000) {
        payload = { ...fullPayload, company: { ...fullPayload.company, logoBase64: undefined, coverImageBase64: undefined, backCoverImageBase64: undefined } };
        setSaveMessage("La propuesta es grande; se generará sin imágenes incrustadas para evitar el límite de Vercel.");
      }
      const response = await fetch(`/api/proposals/${format}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if (!response.ok) throw new Error(await response.text());
      const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`propuesta-${(inputs.client||"solar").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.${format}`;a.click();URL.revokeObjectURL(url);
    } catch (error) {
      setSaveMessage(error instanceof Error ? `Error al exportar ${format.toUpperCase()}: ${error.message}` : "No se pudo exportar la propuesta.");
    } finally { setExporting(null); }
  }

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">{editingId?`Editando ${editingNumber||"propuesta"}`:"Nueva propuesta"}</p><h1 className="text-3xl font-black tracking-tight">Dimensionamiento solar</h1><p className="mt-1 text-sm text-slate-500">Calcula, compara y exporta una propuesta comercial editable.</p></div><div className="flex flex-col items-end gap-1"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={saveDraft} disabled={!result||saving}>{saving?<Loader2 className="animate-spin" size={17}/>:<Save size={17}/>}{editingId?"Guardar cambios":"Guardar borrador"}</Button><Button variant="outline" onClick={()=>void exportProposal("pdf")} disabled={!result||Boolean(exporting)}>{exporting==="pdf"?<Loader2 className="animate-spin" size={17}/>:<Download size={17}/>}Exportar PDF</Button><Button onClick={()=>void exportProposal("docx")} disabled={!result||Boolean(exporting)}>{exporting==="docx"?<Loader2 className="animate-spin" size={17}/>:<Download size={17}/>}Exportar Word</Button></div>{saveMessage&&<p className="text-xs font-semibold text-primary">{saveMessage}</p>}</div></div>

    {pendingBill&&<InvoiceReview initial={pendingBill.bill} onConfirm={confirmInvoice} onCancel={()=>setPendingBill(null)}/>}
    <Card className="border-dashed border-primary/30 bg-primary/[.03]"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><FileScan size={20}/></div><div><p className="text-sm font-bold">Lectura inteligente de factura eléctrica</p><p className="text-xs text-slate-500">PDF, PNG o JPG de EDENORTE, EDESUR o EDEESTE. Los formatos no reconocidos permiten completar los datos manualmente.</p>{ocrMessage&&<p className="mt-1 text-xs font-semibold text-primary">{ocrMessage}</p>}</div></div><label className={`inline-flex h-10 items-center gap-2 rounded-md border bg-white px-4 text-sm font-semibold hover:bg-slate-50 ${ocrBusy?"cursor-wait opacity-60":"cursor-pointer"}`}><input type="file" accept="image/png,image/jpeg,.pdf" disabled={ocrBusy} className="hidden" onChange={e=>{const file=e.target.files?.[0];e.currentTarget.value="";void scan(file)}}/>{ocrBusy?<Loader2 size={17} className="animate-spin"/>:<Upload size={17}/>}Analizar factura</label></CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="space-y-6"><Card><CardHeader><CardTitle>Cliente y suministro</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente existente"><select className="field" value={customers.find((customer)=>customer.name===inputs.client&&customer.nic===inputs.nic)?.id||"new"} onChange={e=>{const customer=customers.find((item)=>item.id===e.target.value);if(!customer){setInputs(old=>({...old,client:"",nic:"",address:""}));setProjectImage("");setCustomerLogo("");return;}const validCity=customer.city&&customer.city in HSP_BY_CITY ? customer.city as Inputs["city"] : undefined;setProjectImage(customer.projectImageUrl||"");setCustomerLogo(customer.logoUrl||"");setInputs(old=>({...old,client:customer.name,nic:customer.nic||"",address:customer.address||"",city:validCity||old.city,utility:(customer.utility as Utility)||old.utility,tariff:(customer.tariff as Tariff)||old.tariff}))}}><option value="new">Nuevo cliente</option>{customers.map((customer)=><option key={customer.id} value={customer.id}>{customer.name}{customer.nic?` · ${customer.nic}`:""}</option>)}</select></Field><Field label="Cliente"><input className="field" value={inputs.client} onChange={e=>set("client",e.target.value)} placeholder="Nombre o razón social"/></Field><Field label="NIC"><input className="field" value={inputs.nic} onChange={e=>set("nic",e.target.value)} placeholder="Contrato energético"/></Field><Field label="Dirección" wide><input className="field" value={inputs.address} onChange={e=>set("address",e.target.value)} placeholder="Ubicación del proyecto"/></Field>
        <Field label="Provincia / ciudad"><select className="field" value={inputs.city} onChange={e=>set("city",e.target.value as Inputs["city"])}>{Object.keys(HSP_BY_CITY).map(v=><option key={v}>{v}</option>)}</select></Field><Field label="HSP"><input className="field bg-slate-50" readOnly value={HSP_BY_CITY[inputs.city].toFixed(2)}/></Field><Field label="Distribuidora"><select className="field" value={inputs.utility} onChange={e=>set("utility",e.target.value as Utility)}>{["EDENORTE","EDESUR","EDEESTE"].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Tarifa"><select className="field" value={inputs.tariff} onChange={e=>set("tariff",e.target.value as Tariff)}>{["BTS-1","BTS-2","BTD","BTH","MTD-1","MTD-2","MTH"].map(v=><option key={v}>{v}</option>)}</select></Field>
        <label className="rounded-xl border border-dashed p-3 sm:col-span-2"><span className="label">Imagen de portada del proyecto</span><span className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-500"><Upload size={17}/>{projectImage?"Cambiar imagen":"Usar imagen para esta propuesta"}<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)void imageToDataUrl(file,{maxWidth:1600,maxHeight:1000}).then(setProjectImage)}}/></span>{projectImage&&<img src={projectImage} alt="Portada" className="mt-3 h-32 w-full rounded-lg object-cover"/>}</label>
        <Field label="Texto editable para el cliente" wide><textarea className="field min-h-28 resize-y py-3" maxLength={700} value={proposalText} onChange={e=>setProposalText(e.target.value)} placeholder="Mensaje o descripción personalizada que aparecerá en la propuesta."/></Field>
        <div className="sm:col-span-2 rounded-lg border border-dashed p-3"><div className="mb-2 flex items-center justify-between"><span className="label">Adicionales económicos (opcional)</span><Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={addAdditional}><Plus size={14}/>Agregar adicional</Button></div>{additionalItems.map((item)=><div key={item.id} className="mb-2 grid grid-cols-[1fr_8rem_auto] gap-2"><input className="field" value={item.name} onChange={e=>updateAdditional(item.id,"name",e.target.value)} placeholder="Nombre del adicional"/><input className="field" type="number" min="0" step="0.01" value={item.amount} onChange={e=>updateAdditional(item.id,"amount",e.target.value)} placeholder="Monto USD"/><Button type="button" variant="ghost" className="px-2" onClick={()=>setAdditionalItems((items)=>items.filter((entry)=>entry.id!==item.id))} aria-label="Eliminar adicional">×</Button></div>)}{additionalItems.length===0&&<p className="text-xs text-slate-500">Agrega todos los adicionales que necesites; se reflejarán en PDF, Word y el total.</p>}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Configuración técnica</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Tipo de sistema"><select className="field" value={inputs.systemType} onChange={e=>set("systemType",e.target.value)}><option>On-Grid</option><option>Híbrido</option><option>Off-Grid</option></select></Field><Field label="Modo de diseño"><select className="field" value={inputs.designMode} onChange={e=>set("designMode",e.target.value as Inputs["designMode"])}><option value="automatic">Automático (según consumo)</option><option value="manual">Manual (cantidad de paneles)</option></select></Field>{inputs.designMode==="manual"&&<NumberField label="Cantidad de paneles" value={inputs.manualPanelCount} onChange={v=>set("manualPanelCount",v)}/>}<Field label="Panel del inventario"><select className="field" value={inputs.panelEquipmentId} onChange={e=>{const id=e.target.value,item=inventory.find(candidate=>candidate.id===id);setInputs(old=>({...old,panelEquipmentId:id,panelWatts:item?.powerWatts||old.panelWatts}))}}><option value="">Configuración manual</option>{inventory.filter(item=>item.type==="PANEL").map(item=><option key={item.id} value={item.id}>{equipmentLabel(item)}</option>)}</select></Field><NumberField label="Panel (W)" value={inputs.panelWatts} onChange={v=>set("panelWatts",v)}/><NumberField label="Sobredimensionamiento" value={inputs.oversizingFactor} step="0.05" onChange={v=>set("oversizingFactor",v)}/><NumberField label="Precio USD/kWp" value={inputs.costPerWpUsd*1000} step="10" onChange={v=>set("costPerWpUsd",v/1000)}/><NumberField label="Tasa RD$/USD" value={inputs.exchangeRate} step="0.01" onChange={v=>set("exchangeRate",v)}/><Field label="Aplicar ITBIS"><select className="field" value={inputs.itbisEnabled?"yes":"no"} onChange={e=>set("itbisEnabled",e.target.value==="yes")}><option value="yes">Sí</option><option value="no">No</option></select></Field><Field label="Tasa ITBIS (%)"><input className="field text-right disabled:cursor-not-allowed disabled:bg-slate-100" type="number" min="0" max="100" step="0.01" disabled={!inputs.itbisEnabled} value={inputs.itbisRate*100} onChange={e=>set("itbisRate",Number(e.target.value)/100)}/></Field><Field label="Inversor" wide><input className="field" list="tenant-inverters" value={inputs.inverter} onChange={e=>set("inverter",e.target.value)} placeholder="Selecciona del inventario o escribe una especificación"/><datalist id="tenant-inverters">{inventory.filter(item=>item.type==="INVERTER").map(item=><option key={item.id} value={equipmentLabel(item)}>{item.quantity} disponibles</option>)}</datalist><p className="mt-1 text-[11px] text-slate-500">No se asigna automáticamente. Puedes elegir un inversor activo del inventario o escribir cualquier modelo manualmente.</p></Field>{inputs.systemType!=="On-Grid"&&<Field label="Batería" wide><input className="field" list="tenant-batteries" value={inputs.battery} onChange={e=>set("battery",e.target.value)} placeholder="Selecciona del inventario o escribe la batería"/><datalist id="tenant-batteries">{inventory.filter(item=>item.type==="BATTERY").map(item=><option key={item.id} value={equipmentLabel(item)}>{item.quantity} disponibles</option>)}</datalist></Field>}</CardContent></Card></div>

      <div className="space-y-6"><Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Consumo facturado (kWh)</CardTitle><div className="flex flex-wrap items-center gap-2"><select className="h-8 rounded-md border bg-white px-2 text-xs" value={averageCount} onChange={e=>setAverageCount(Number(e.target.value))}>{Array.from({length:12},(_,index)=>index+1).map(v=><option key={v} value={v}>Últimos {v} facturados</option>)}</select><button onClick={()=>setUseAverage(v=>!v)} className={`h-8 rounded-md px-3 text-xs font-semibold ${useAverage?"bg-primary text-white":"border bg-white"}`}>Promediar</button></div></CardHeader><CardContent><div className="mb-4 grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_2fr]"><Field label="Último mes facturado"><select className="field bg-white" value={lastBilledMonth} onChange={e=>{const month=Number(e.target.value);setLastBilledMonth(month);setBilledRecords(manualBilledRecords(consumption,month,lastBilledYear))}}>{MONTHS.map((month,index)=><option key={month} value={index+1}>{month}</option>)}</select></Field><Field label="Año de ese mes"><input type="number" min="2000" max="2100" className="field bg-white" value={lastBilledYear} onChange={e=>{const year=Number(e.target.value);setLastBilledYear(year);if(year>=2000)setBilledRecords(manualBilledRecords(consumption,lastBilledMonth,year))}}/></Field><div className="flex items-center text-xs leading-5 text-slate-600">Indica el período de la factura más reciente. Los meses posteriores se asignan al año anterior automáticamente.</div></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{MONTHS.map((month,index)=><Field key={month} label={month.slice(0,3)}><input type="number" min="0" className="field text-right" value={consumption[index]||""} onChange={e=>{const kwh=Number(e.target.value);setConsumption(old=>{const next=old.map((v,i)=>i===index?kwh:v);setBilledRecords(manualBilledRecords(next,lastBilledMonth,lastBilledYear));return next})}}/></Field>)}</div>{useAverage&&<div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Info size={16} className="mt-0.5 shrink-0"/>El cálculo usa {averagedPeriods.length} período(s) realmente facturado(s): {averagedPeriods.map(record=>`${MONTHS[record.month-1].slice(0,3)} ${record.year}`).join(", ")||"ninguno"}. No toma automáticamente los últimos meses del calendario.</div>}</CardContent></Card>
      {result&&<><div className="rounded-xl border border-primary/20 bg-primary/[.06] p-4 text-sm font-medium text-slate-700"><span className="mr-2 inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white"><Calculator size={13} className="mr-1"/>Análisis</span>Según el promedio de <strong>{number.format(result.averageMonthlyConsumption)} kWh</strong>, el consumo requiere teóricamente <strong>{result.theoreticalPanelCount} paneles de {inputs.panelWatts} W</strong> para el 100% de cobertura.</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Sistema instalado" value={`${result.installedKwp.toFixed(2)} kWp`}/><Metric label="Paneles" value={String(result.panelCount)}/><Metric label="Cobertura" value={`${result.coveragePercent.toFixed(1)}%`}/><Metric label="Inversión" value={money.format(result.totalUsd)}/></div></>}
      </div>
    </div>

      {result&&<><div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Generación solar vs. consumo mensual</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip/><Legend/><Bar dataKey="consumo" name="Consumo" fill={company.primaryColor} radius={[4,4,0,0]}/><Bar dataKey="generacion" name="Generación" fill={company.accentColor} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>Resultado financiero</CardTitle></CardHeader><CardContent className="space-y-4"><ResultRow label="Ahorro mensual" value={`RD$ ${number.format(result.monthlySavingsDop)}`}/><ResultRow label="Ahorro anual" value={`RD$ ${number.format(result.annualSavingsDop)}`}/><ResultRow label="Retorno estimado" value={`${result.roiYears.toFixed(1)} años`}/><ResultRow label="CO2 evitado" value={`${result.co2AvoidedTons.toFixed(2)} t/año`}/><ResultRow label="Precio por kWp" value={money.format(result.pricePerWpUsd*1000)}/></CardContent></Card></div><Card><CardHeader><CardTitle>Proyección de generación a 25 años · degradación anual 0.6%</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={projection}><defs><linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={company.secondaryColor} stopOpacity={.3}/><stop offset="95%" stopColor={company.secondaryColor} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="year"/><YAxis/><Tooltip/><Area type="monotone" dataKey="generacion" name="Generación kWh" stroke={company.secondaryColor} fill="url(#solar)"/></AreaChart></ResponsiveContainer></CardContent></Card></>}
  </div>;
}

function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}) { return <label className={wide?"sm:col-span-2":""}><span className="label">{label}</span>{children}</label>; }
function NumberField({label,value,step="1",onChange}:{label:string;value:number;step?:string;onChange:(v:number)=>void}) { return <Field label={label}><input className="field text-right" type="number" min="0" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></Field>; }
function Metric({label,value}:{label:string;value:string}) { return <div className="metric"><p className="metric-value">{value}</p><p className="metric-label">{label}</p></div>; }
function ResultRow({label,value}:{label:string;value:string}) { return <div className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>; }
function equipmentLabel(item:InventoryItem){return `${item.brand} ${item.model}${item.powerWatts?` ${item.powerWatts} W`:""}`;}
function defaultQuote(total:number,panels:number,panelWatts:number,inverter:string,systemType:string,battery:string) { return [{name:"Sistema solar fotovoltaico",description:`${panels} paneles de ${panelWatts} W · ${systemType} · ${inverter||"inversor por seleccionar"}${battery?` · ${battery}`:""}`,amountUsd:total},{name:"Sistema de monitoreo",description:"Incluido sin costo",amountUsd:0},{name:"Revisiones técnicas",description:"Incluidas sin costo durante 2 años",amountUsd:0}]; }
