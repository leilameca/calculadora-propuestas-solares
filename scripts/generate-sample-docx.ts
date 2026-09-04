import { mkdir, writeFile } from "node:fs/promises";
import { Packer } from "docx";
import { buildProposalDocument } from "../lib/docx-builder";
import { calculateSolar } from "../lib/solar-calculator";

const consumption=[1060,980,1015,1100,1180,1240,1320,1290,1190,1110,1040,1025];
const result=calculateSolar({consumption,hsp:4.11,oversizingFactor:1.2,panelWatts:590,costPerWpUsd:.95,exchangeRate:60,utility:"EDENORTE",tariff:"BTS-1"});
const quoteItems=[
  {name:"Módulos bifaciales",description:`${result.panelCount} módulos de 590 W`,amountUsd:result.costUsd*.38},
  {name:"Inversor",description:"Solis S6 10 kW",amountUsd:result.costUsd*.24},
  {name:"Estructura galvanizada",description:"Sistema certificado",amountUsd:result.costUsd*.11},
  {name:"Cableado y protecciones",description:"DC/AC y puesta a tierra",amountUsd:result.costUsd*.10},
  {name:"Mano de obra e ingeniería",description:"Instalación y puesta en marcha",amountUsd:result.costUsd*.17},
];
async function main(){const document=await buildProposalDocument({company:{name:"EILEN Electric Service",rnc:"1-31-00000-1",phone:"809-555-0147",email:"propuestas@eilen.do",address:"Santiago, República Dominicana",slogan:"Ingeniería que transforma energía",primaryColor:"#0F4C5C",secondaryColor:"#2F7D32",accentColor:"#F2A900",proposalValidityDays:15},customer:{name:"Grupo Herrera",nic:"78995956",address:"Av. Circunvalación, Santiago"},project:{name:"Sistema Solar Fotovoltaico",city:"Santiago",utility:"EDENORTE",tariff:"BTS-1",systemType:"On-Grid",panelWatts:590,inverter:"Solis S6 10 kW"},consumption,result,quoteItems,proposalNumber:"PROP-2026-012"});await mkdir("qa-docx",{recursive:true});await writeFile("qa-docx/sample-proposal.docx",await Packer.toBuffer(document));}
main().catch((error)=>{console.error(error);process.exitCode=1});
