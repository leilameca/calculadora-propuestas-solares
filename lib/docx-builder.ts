import {
  AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, PageBreak, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { MONTHS, type SolarCalculationResult } from "./solar-calculator";

const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 1417; // 2.5 cm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CELL_MARGINS = { top: 160, bottom: 160, left: 200, right: 200 };
const white = "FFFFFF", ink = "172033", gray = "F3F4F6", muted = "64748B";

export interface ProposalDocumentInput {
  company: { name:string; rnc?:string; address?:string; phone?:string; email?:string; website?:string; slogan?:string; logoBase64?:string; coverImageBase64?:string; backCoverImageBase64?:string; primaryColor:string; secondaryColor:string; accentColor:string; proposalValidityDays?:number };
  customer: { name:string; nic?:string; address?:string };
  project: { name:string; city:string; utility:string; tariff:string; systemType:string; panelWatts:number; inverter?:string };
  consumption: number[];
  result: SolarCalculationResult;
  quoteItems: Array<{ name:string; description?:string; quantity?:number; amountUsd:number }>;
  proposalNumber?: string;
  date?: string;
}

const cleanHex = (value:string|undefined,fallback:string) => (value||"").replace("#","").match(/^[0-9A-Fa-f]{6}$/)?.[0].toUpperCase() || fallback;
const usd = (v:number)=>`US$ ${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dop = (v:number)=>`RD$ ${Math.round(v).toLocaleString("es-DO")}`;
const num = (v:number)=>Math.round(v).toLocaleString("es-DO");
type RunOptions={bold?:boolean;color?:string;size?:number;italic?:boolean};
const run = (text:string, options:RunOptions={}) => new TextRun({ text, font:"Arial", color:ink, size:20, ...options });
const p = (text:string, options:{bold?:boolean;color?:string;size?:number;align?:typeof AlignmentType[keyof typeof AlignmentType];before?:number;after?:number}={}) => new Paragraph({ alignment:options.align, spacing:{before:options.before??0,after:options.after??120,line:276}, children:[run(text,{bold:options.bold,color:options.color,size:options.size})] });
const empty = (after=80)=>new Paragraph({spacing:{after},children:[]});
const borders = (color="D9DEE7",size=4)=>({top:{style:BorderStyle.SINGLE,color,size},bottom:{style:BorderStyle.SINGLE,color,size},left:{style:BorderStyle.SINGLE,color,size},right:{style:BorderStyle.SINGLE,color,size}});

function cell(children:(Paragraph|Table)[], width:number, opts:{fill?:string;align?:typeof AlignmentType[keyof typeof AlignmentType];borderColor?:string;colSpan?:number}={}) {
  return new TableCell({ children, width:{size:width,type:WidthType.DXA}, columnSpan:opts.colSpan, verticalAlign:VerticalAlign.CENTER, margins:CELL_MARGINS, shading:opts.fill?{type:ShadingType.CLEAR,fill:opts.fill}:undefined, borders:borders(opts.borderColor) });
}
function table(rows:TableRow[], widths:number[], opts:{borderColor?:string}={}) {
  return new Table({ rows, width:{size:CONTENT_WIDTH,type:WidthType.DXA}, columnWidths:widths, layout:"fixed" as never, borders:borders(opts.borderColor) });
}
function sectionHeading(index:number,title:string,primary:string,secondary:string) {
  return new Paragraph({ spacing:{before:0,after:200}, border:{bottom:{style:BorderStyle.SINGLE,color:secondary,size:14,space:6}}, children:[run(`${index}. ${title.toUpperCase()}`,{bold:true,size:26,color:primary})] });
}
function metricCard(label:string,value:string,width:number,fill:string,textColor=ink) {
  return cell([new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:50},children:[run(value,{bold:true,size:26,color:textColor})]}),new Paragraph({alignment:AlignmentType.CENTER,children:[run(label.toUpperCase(),{bold:true,size:16,color:textColor})]})],width,{fill,align:AlignmentType.CENTER,borderColor:fill});
}
function pageBreak(){ return new Paragraph({children:[new PageBreak()]}); }
function photoBlock(base64:string|undefined,label:string,primary:string,heightLabel="FOTOGRAFÍA AÉREA / PROYECTO") {
  if(base64){
    const data=Buffer.from(base64.replace(/^data:image\/[a-zA-Z+]+;base64,/,""),"base64");
    return table([new TableRow({children:[cell([new Paragraph({alignment:AlignmentType.CENTER,children:[new ImageRun({data,transformation:{width:622,height:235},type:"jpg"})]})],CONTENT_WIDTH,{borderColor:primary})]})],[CONTENT_WIDTH],{borderColor:primary});
  }
  return table([new TableRow({children:[cell([empty(400),p(heightLabel,{bold:true,color:white,size:18,align:AlignmentType.CENTER}),p(label,{color:white,size:18,align:AlignmentType.CENTER}),empty(400)],CONTENT_WIDTH,{fill:primary,borderColor:primary})]})],[CONTENT_WIDTH],{borderColor:primary});
}
function header(input:ProposalDocumentInput,primary:string){
  const left=input.company.logoBase64
    ? new Paragraph({children:[new ImageRun({data:Buffer.from(input.company.logoBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/,""),"base64"),transformation:{width:105,height:38},type:"png"})]})
    : p(input.company.name,{bold:true,color:primary,size:18});
  return new Header({children:[table([new TableRow({children:[cell([left],Math.round(CONTENT_WIDTH*.48),{borderColor:white}),cell([p([input.company.phone,input.company.email].filter(Boolean).join("  |  "),{size:15,color:muted,align:AlignmentType.RIGHT})],Math.round(CONTENT_WIDTH*.52),{borderColor:white})]})],[Math.round(CONTENT_WIDTH*.48),Math.round(CONTENT_WIDTH*.52)],{borderColor:white}),new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,color:primary,size:8}},children:[]})]});
}
function footer(input:ProposalDocumentInput,secondary:string){
  return new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,color:secondary,size:6,space:5}},spacing:{before:80},children:[run(`RNC ${input.company.rnc||"N/D"}  |  Esta propuesta tiene ${input.company.proposalValidityDays||15} días de vigencia`,{size:15,color:muted}),run("                                      ",{size:15}),run("Página ",{size:15,color:muted}),new TextRun({children:[PageNumber.CURRENT],font:"Arial",size:15,color:muted})]})]});
}

export function buildProposalDocument(input:ProposalDocumentInput): Document {
  if(input.consumption.length!==12) throw new Error("La propuesta requiere 12 consumos mensuales.");
  const primary=cleanHex(input.company.primaryColor,"0F4C5C"), secondary=cleanHex(input.company.secondaryColor,"2F7D32"), accent=cleanHex(input.company.accentColor,"F2A900");
  const date=input.date||new Intl.DateTimeFormat("es-DO",{dateStyle:"long"}).format(new Date());
  const quoteSubtotal=input.quoteItems.reduce((sum,item)=>sum+item.amountUsd,0);
  const children:(Paragraph|Table)[]=[];

  // 1. Portada - proposal_centerpiece adapted to dynamic brand identity.
  children.push(photoBlock(input.company.coverImageBase64,input.project.city,primary),empty(160),p(input.company.name.toUpperCase(),{bold:true,color:secondary,size:20,align:AlignmentType.CENTER}),p("PROPUESTA ENERGÉTICA",{bold:true,color:primary,size:38,align:AlignmentType.CENTER,after:80}),p(input.project.name,{color:muted,size:20,align:AlignmentType.CENTER,after:220}));
  children.push(table([new TableRow({children:[cell([p("PREPARADO PARA",{bold:true,color:secondary,size:16}),p(input.customer.name,{bold:true,size:27}),p(input.customer.address||input.project.city,{color:muted,size:18})],Math.round(CONTENT_WIDTH*.55),{fill:gray,borderColor:white}),cell([p(`Sistema: ${input.result.installedKwp.toFixed(2)} kWp`,{bold:true,size:18}),p(`NIC: ${input.customer.nic||"N/D"}`,{size:18}),p(`Fecha: ${date}`,{size:18})],Math.round(CONTENT_WIDTH*.45),{fill:gray,borderColor:white})]})],[Math.round(CONTENT_WIDTH*.55),Math.round(CONTENT_WIDTH*.45)],{borderColor:white}),empty(160),table([new TableRow({children:[metricCard("Generación anual",`${num(input.result.annualGeneration)} kWh`,Math.floor(CONTENT_WIDTH/2),primary,white),metricCard("Vida útil", "25+ años",Math.ceil(CONTENT_WIDTH/2),accent,ink)]})],[Math.floor(CONTENT_WIDTH/2),Math.ceil(CONTENT_WIDTH/2)]));

  // 2. Descripción y regulación.
  children.push(pageBreak(),sectionHeading(1,"Descripción y regulación",primary,secondary),p(`La presente propuesta contempla el diseño, suministro, instalación y puesta en marcha de un sistema solar fotovoltaico ${input.project.systemType} de ${input.result.installedKwp.toFixed(2)} kWp para ${input.customer.name}. La solución se dimensionó con las horas solares pico de ${input.project.city} y el historial de consumo disponible.`,{after:180}),p("OBJETIVOS DEL PROYECTO",{bold:true,color:primary,size:22}),p("Reducir el costo energético, estabilizar el gasto operativo y disminuir la huella de carbono mediante generación distribuida confiable y monitoreable."),empty(80));
  children.push(table([new TableRow({children:[cell([p("PROMEDIO DE CONSUMO",{bold:true,color:primary,size:17}),p(`${num(input.result.averageMonthlyConsumption)} kWh/mes`,{bold:true,size:26}),p(`Cobertura estimada: ${input.result.coveragePercent.toFixed(1)}%`,{color:muted,size:18})],CONTENT_WIDTH,{fill:gray,borderColor:secondary})]})],[CONTENT_WIDTH],{borderColor:secondary}),empty(160),p("NOTA REGULATORIA SIE",{bold:true,color:primary,size:22}),p(`Para clientes en tarifas BTS-1 y BTS-2 de EDENORTE, EDESUR o EDEESTE, la energía inyectada a la red está sujeta al cargo regulatorio aplicable del 25%. La valorización final dependerá del esquema de medición, los acuerdos de interconexión y la regulación vigente al momento de aprobación.`,{after:160}),p("El ahorro mostrado es una estimación técnica basada en la tarifa efectiva incorporada al prototipo. La factura final puede incluir cargos fijos, demanda, potencia, impuestos y ajustes no compensables.",{color:muted,size:18}));

  // 3. Cotización detallada.
  children.push(pageBreak(),sectionHeading(2,"Cotización detallada",primary,secondary),p(`Resumen: ${input.result.panelCount} módulos bifaciales de ${input.project.panelWatts} W, inversor ${input.project.inverter||"por seleccionar"}, monitoreo, estructura, protecciones, instalación, ingeniería y soporte.`,{after:160}));
  const quoteWidths=[Math.round(CONTENT_WIDTH*.26),Math.round(CONTENT_WIDTH*.44),Math.round(CONTENT_WIDTH*.3)];
  const quoteRows=[new TableRow({tableHeader:true,children:[cell([p("COMPONENTE",{bold:true,color:white,size:17})],quoteWidths[0],{fill:primary,borderColor:primary}),cell([p("DESCRIPCIÓN",{bold:true,color:white,size:17})],quoteWidths[1],{fill:primary,borderColor:primary}),cell([p("MONTO USD",{bold:true,color:white,size:17,align:AlignmentType.RIGHT})],quoteWidths[2],{fill:primary,align:AlignmentType.RIGHT,borderColor:primary})]})];
  input.quoteItems.forEach((item,index)=>quoteRows.push(new TableRow({children:[cell([p(item.name,{bold:true,size:17})],quoteWidths[0],{fill:index%2?gray:white}),cell([p(item.description||"Incluido",{size:17})],quoteWidths[1],{fill:index%2?gray:white}),cell([p(usd(item.amountUsd),{bold:true,size:17,align:AlignmentType.RIGHT})],quoteWidths[2],{fill:index%2?gray:white,align:AlignmentType.RIGHT})]})));
  quoteRows.push(new TableRow({children:[cell([p("SUB-TOTAL",{bold:true,size:18})],quoteWidths[0]+quoteWidths[1],{colSpan:2,fill:gray}),cell([p(usd(quoteSubtotal),{bold:true,size:18,align:AlignmentType.RIGHT})],quoteWidths[2],{fill:gray,align:AlignmentType.RIGHT})]}),new TableRow({children:[cell([p("ITBIS",{bold:true,size:18})],quoteWidths[0]+quoteWidths[1],{colSpan:2}),cell([p(usd(input.result.itbisUsd),{bold:true,size:18,align:AlignmentType.RIGHT})],quoteWidths[2],{align:AlignmentType.RIGHT})]}),new TableRow({children:[cell([p("INVERSIÓN TOTAL",{bold:true,color:white,size:22})],quoteWidths[0]+quoteWidths[1],{colSpan:2,fill:primary,borderColor:primary}),cell([p(usd(input.result.totalUsd),{bold:true,color:white,size:22,align:AlignmentType.RIGHT})],quoteWidths[2],{fill:primary,align:AlignmentType.RIGHT,borderColor:primary})]}),new TableRow({children:[cell([p("PRECIO POR Wp",{bold:true,size:18})],quoteWidths[0]+quoteWidths[1],{colSpan:2,fill:gray}),cell([p(usd(input.result.pricePerWpUsd),{bold:true,size:18,align:AlignmentType.RIGHT})],quoteWidths[2],{fill:gray,align:AlignmentType.RIGHT})]}));
  children.push(table(quoteRows,quoteWidths,{borderColor:primary}));

  // 4. Análisis.
  children.push(pageBreak(),sectionHeading(3,"Análisis de consumo y producción",primary,secondary),table([new TableRow({children:[metricCard("Ahorro anual",dop(input.result.annualSavingsDop),Math.floor(CONTENT_WIDTH/3),primary,white),metricCard("Generación anual",`${num(input.result.annualGeneration)} kWh`,Math.floor(CONTENT_WIDTH/3),secondary,white),metricCard("CO2 evitado",`${input.result.co2AvoidedTons.toFixed(2)} t`,CONTENT_WIDTH-2*Math.floor(CONTENT_WIDTH/3),accent,ink)]})],[Math.floor(CONTENT_WIDTH/3),Math.floor(CONTENT_WIDTH/3),CONTENT_WIDTH-2*Math.floor(CONTENT_WIDTH/3)]),empty(180));
  const analysisWidths=[Math.round(CONTENT_WIDTH*.22),Math.round(CONTENT_WIDTH*.29),Math.round(CONTENT_WIDTH*.29),Math.round(CONTENT_WIDTH*.2)];
  const analysisRows=[new TableRow({tableHeader:true,children:["MES","CONSUMO KWh","GENERACIÓN KWh","COBERTURA"].map((label,i)=>cell([p(label,{bold:true,color:white,size:16,align:i?AlignmentType.RIGHT:AlignmentType.LEFT})],analysisWidths[i],{fill:primary,align:i?AlignmentType.RIGHT:AlignmentType.LEFT,borderColor:primary}))})];
  MONTHS.forEach((month,index)=>analysisRows.push(new TableRow({children:[cell([p(month,{size:16})],analysisWidths[0],{fill:index%2?gray:white}),cell([p(num(input.consumption[index]),{size:16,align:AlignmentType.RIGHT})],analysisWidths[1],{fill:index%2?gray:white,align:AlignmentType.RIGHT}),cell([p(num(input.result.monthlyGeneration[index]),{size:16,align:AlignmentType.RIGHT})],analysisWidths[2],{fill:index%2?gray:white,align:AlignmentType.RIGHT}),cell([p(`${input.result.monthlyCoverage[index].toFixed(1)}%`,{bold:true,size:16,align:AlignmentType.RIGHT,color:input.result.monthlyCoverage[index]>=100?secondary:ink})],analysisWidths[3],{fill:index%2?gray:white,align:AlignmentType.RIGHT})]})));
  children.push(table(analysisRows,analysisWidths,{borderColor:primary}));

  // 5. Condiciones.
  children.push(pageBreak(),sectionHeading(4,"Condiciones generales",primary,secondary));
  const conditions=["Los valores en pesos dominicanos se calculan con la tasa de cambio indicada en la propuesta. La facturación en USD o su equivalente en RD$ usará la tasa de venta del Banco Central de la República Dominicana o la acordada al momento del pago.","Los inversores interconectados se desconectan automáticamente ante fallas de la red pública; un sistema On-Grid sin almacenamiento no mantiene cargas durante una interrupción.","La producción depende de irradiancia, temperatura, sombras, suciedad, disponibilidad de red y tolerancias de los equipos. Las cifras presentadas son estimaciones de ingeniería.","La propuesta no incluye obras civiles, adecuaciones extraordinarias, refuerzos de techo, permisos o cargos de terceros que no estén expresamente descritos.","El cronograma inicia después del anticipo, la aprobación técnica y la disponibilidad de equipos. Cualquier cambio de alcance será cotizado por escrito."];
  conditions.forEach((text,index)=>children.push(table([new TableRow({children:[cell([p(String(index+1).padStart(2,"0"),{bold:true,color:white,size:22,align:AlignmentType.CENTER})],800,{fill:index%2?secondary:primary,borderColor:white}),cell([p(text,{size:19})],CONTENT_WIDTH-800,{fill:index%2?gray:white,borderColor:white})]})],[800,CONTENT_WIDTH-800],{borderColor:white}),empty(80)));

  // 6. Garantías.
  children.push(pageBreak(),sectionHeading(5,"Garantías del sistema",primary,secondary));
  const warranties=[["PANELES","Garantía de producto según fabricante y garantía lineal de rendimiento de hasta 25 años. Incluye documentación técnica y trazabilidad de los módulos."],["INVERSORES",`Garantía del fabricante aplicable al modelo ${input.project.inverter||"seleccionado"}. La cobertura requiere instalación, protecciones y condiciones ambientales conforme a ficha técnica.`],["SOPORTE TÉCNICO",`${input.company.name} brinda acompañamiento en puesta en marcha, configuración de monitoreo, orientación operativa y gestión de garantías conforme al alcance contratado.`]];
  warranties.forEach(([title,text],index)=>children.push(table([new TableRow({children:[cell([p(title,{bold:true,color:white,size:22,align:AlignmentType.CENTER})],2200,{fill:[primary,secondary,accent][index],borderColor:white}),cell([p(text,{size:19})],CONTENT_WIDTH-2200,{fill:index===1?gray:white,borderColor:white})]})],[2200,CONTENT_WIDTH-2200],{borderColor:white}),empty(160)));
  children.push(table([new TableRow({children:[cell([p("IMPORTANTE",{bold:true,color:primary,size:18}),p("Las garantías cubren defectos de fabricación; no cubren uso indebido, intervenciones no autorizadas, eventos atmosféricos extremos ni incumplimientos de mantenimiento.",{size:18})],CONTENT_WIDTH,{fill:gray,borderColor:secondary})]})],[CONTENT_WIDTH],{borderColor:secondary}));

  // 7. Fases.
  children.push(pageBreak(),sectionHeading(6,"Fases del proyecto",primary,secondary),p("Ruta de ejecución e interconexión",{bold:true,size:22,color:primary,after:180}));
  const phases=["Aprobación distribuidora","Instalación del sistema","Visita de supervisión","Acuerdos de interconexión","Carta para medidor","Instalación del medidor","Arranque y monitoreo"];
  phases.forEach((phase,index)=>children.push(table([new TableRow({children:[cell([p(String(index+1),{bold:true,color:index===6?ink:white,size:24,align:AlignmentType.CENTER})],700,{fill:index===6?accent:primary,borderColor:white}),cell([p(phase,{bold:true,size:19})],CONTENT_WIDTH-700,{fill:index%2?gray:white,borderColor:white})]})],[700,CONTENT_WIDTH-700],{borderColor:white}),empty(45)));
  children.push(empty(100),table([new TableRow({children:[cell([p("GESTIÓN INSTITUCIONAL",{bold:true,color:secondary,size:18}),p(`${input.company.name} acompaña el expediente y las gestiones aplicables ante la CNE, la empresa distribuidora y la DGII, sujeto al alcance contratado y a los tiempos de respuesta de cada institución.`,{size:18})],CONTENT_WIDTH,{fill:gray,borderColor:secondary})]})],[CONTENT_WIDTH],{borderColor:secondary}));

  // 8. Contraportada.
  children.push(pageBreak(),photoBlock(input.company.backCoverImageBase64||input.company.coverImageBase64,input.project.city,secondary,"PROYECTO SOLAR"),empty(280),p("ENERGÍA LIMPIA. RESULTADOS MEDIBLES.",{bold:true,color:primary,size:30,align:AlignmentType.CENTER}),p(input.company.slogan||"Ingeniería que transforma energía",{color:secondary,size:22,align:AlignmentType.CENTER,after:260}),table([new TableRow({children:[cell([p(input.company.name,{bold:true,color:white,size:24,align:AlignmentType.CENTER}),p([input.company.phone,input.company.email,input.company.website].filter(Boolean).join("  |  "),{color:white,size:18,align:AlignmentType.CENTER}),p(input.company.address||"República Dominicana",{color:white,size:18,align:AlignmentType.CENTER})],CONTENT_WIDTH,{fill:primary,borderColor:primary})]})],[CONTENT_WIDTH],{borderColor:primary}));

  return new Document({
    creator:input.company.name,title:`Propuesta energética - ${input.customer.name}`,description:"Propuesta solar editable generada por HelioPro",
    styles:{default:{document:{run:{font:"Arial",size:20,color:ink},paragraph:{spacing:{after:120,line:276}}}},paragraphStyles:[{id:"Title",name:"Title",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:"Arial",size:38,bold:true,color:primary},paragraph:{spacing:{after:160}}},{id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:"Arial",size:26,bold:true,color:primary},paragraph:{spacing:{before:100,after:160}}}]},
    sections:[{properties:{page:{size:{width:PAGE_WIDTH,height:PAGE_HEIGHT},margin:{top:MARGIN,right:MARGIN,bottom:MARGIN,left:MARGIN,header:500,footer:500}}},headers:{default:header(input,primary)},footers:{default:footer(input,secondary)},children}],
  });
}
