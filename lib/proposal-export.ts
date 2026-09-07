import { prisma } from "./prisma";
import type { ProposalDocumentInput } from "./docx-builder";

export async function loadSavedProposalForExport(proposalId:string,companyId:string):Promise<ProposalDocumentInput>{
  const record=await prisma.proposal.findFirst({where:{id:proposalId,companyId},include:{customer:true,company:true}});
  if(!record)throw new Error("Propuesta no encontrada.");
  const proposal=JSON.parse(JSON.stringify(record)) as Record<string,any>;
  const company=proposal.company as Record<string,any>;
  const customer=proposal.customer as Record<string,any>;
  const input=(proposal.calculationInput&&typeof proposal.calculationInput==="object"?proposal.calculationInput:{}) as Record<string,unknown>;
  const coverImages=Array.isArray(company.coverImages)?company.coverImages:[];
  return {
    company:{name:String(company.name),rnc:company.rnc,address:company.address,phone:company.phone,email:company.email,website:company.website,slogan:company.slogan,primaryColor:String(company.primaryColor||"#0F4C5C"),secondaryColor:String(company.secondaryColor||"#2F7D32"),accentColor:String(company.accentColor||"#F2A900"),proposalValidityDays:Number(company.proposalValidityDays)||15,itbisEnabled:company.itbisEnabled!==false,logoBase64:company.logoUrl,coverImageBase64:proposal.projectImageUrl||company.coverImageUrl||coverImages[0],backCoverImageBase64:company.backCoverImageUrl||coverImages[1]||coverImages[0],itbisRate:company.itbisRate==null?undefined:Number(company.itbisRate)},
    customer:{name:String(customer.name),nic:customer.nic,address:customer.address,logoBase64:customer.logoUrl},
    project:{name:String(proposal.projectName),city:String(proposal.city),utility:String(proposal.utility),tariff:String(proposal.tariff),systemType:String(proposal.systemType),panelWatts:Number(input.panelWatts)||0,inverter:String(input.inverter||proposal.manualInverter||"Por seleccionar"),exchangeRate:Number(proposal.exchangeRate)||0},
    consumption:Array.isArray(proposal.monthlyConsumption)?proposal.monthlyConsumption.map(Number):[],
    result:proposal.calculationResult,
    quoteItems:Array.isArray(proposal.quoteItems)?proposal.quoteItems:[],
    proposalText:proposal.notes||undefined,
    invoice:proposal.invoiceData?{name:proposal.invoiceName||"factura.pdf",mimeType:proposal.invoiceMimeType||"application/pdf",dataUrl:proposal.invoiceData}:undefined,
    proposalNumber:String(proposal.number),
    date:new Intl.DateTimeFormat("es-DO",{dateStyle:"long"}).format(new Date(proposal.createdAt)),
    selectedEquipmentIds:[input.panelEquipmentId,proposal.selectedInverterId,input.batteryEquipmentId].filter((id):id is string=>typeof id==="string"&&Boolean(id)),
  };
}
