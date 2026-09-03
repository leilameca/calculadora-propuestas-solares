import { MONTHS, type BilledConsumption } from "./solar-calculator";

const MONTH_ALIASES: Record<string,number> = {
  ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,
  jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,septiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12,
};
export interface InvoiceOcrResult { recognized:boolean; requiresManualEntry:boolean; customerName?:string; nic?:string; address?:string; tariff?:string; utility?:string; consumption:BilledConsumption[]; rawText:string }
export function parseElectricInvoice(text:string):InvoiceOcrResult {
  const normalized=text.replace(/\r/g,"").replace(/[ \t]+/g," "), upper=normalized.toUpperCase();
  const utility=["EDENORTE","EDESUR","EDEESTE"].find((name)=>upper.includes(name));
  if(utility!=="EDENORTE") return {recognized:false,requiresManualEntry:true,utility,consumption:[],rawText:text};
  const tariff=upper.match(/\b(BTS[- ]?1|BTS[- ]?2|BTD|BTH|MTD[- ]?1|MTD[- ]?2|MTH)\b/)?.[1]?.replace(" ","-");
  const nic=normalized.match(/(?:NIC|CONTRATO|SUMINISTRO)\s*[:#-]?\s*([A-Z0-9-]{5,20})/i)?.[1];
  const customerName=normalized.match(/NOMBRE\s+O\s+RAZ[ÓO]N\s+SOCIAL\s*[:#-]?\s*([^\n]{3,80})/i)?.[1]?.trim();
  const address=normalized.match(/(?:DIRECCI[ÓO]N|UBICACI[ÓO]N)\s*[:#-]?\s*([^\n]{5,120})/i)?.[1]?.trim();
  const currentYear=new Date().getFullYear(), consumption:BilledConsumption[]=[];
  for(const line of normalized.split("\n")){
    const monthName=Object.keys(MONTH_ALIASES).find((alias)=>new RegExp(`\\b${alias}\\b`,"i").test(line)); if(!monthName) continue;
    const year=Number(line.match(/\b(20\d{2})\b/)?.[1]||currentYear);
    const values=[...line.matchAll(/\b([\d.,]+)\s*(?:KWH)?\b/gi)].map((match)=>Number(match[1].replace(/,/g,""))).filter((v)=>Number.isFinite(v)&&v>0&&v!==year);
    const kwh=values.at(-1); if(kwh) consumption.push({month:MONTH_ALIASES[monthName],year,kwh});
  }
  const unique=[...new Map(consumption.map((item)=>[`${item.year}-${item.month}`,item])).values()];
  const recent=(unique.length>=13?unique.slice(1,13):unique.slice(-12)).sort((a,b)=>(a.year-b.year)||(a.month-b.month));
  return {recognized:true,requiresManualEntry:false,customerName,nic,address,tariff,utility,consumption:recent,rawText:text};
}
export function emptyConsumption(){ return MONTHS.map((_,index)=>({month:index+1,year:new Date().getFullYear(),kwh:0})); }
