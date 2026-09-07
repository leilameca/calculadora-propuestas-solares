import { prisma } from "./prisma";
import type { ProposalDocumentInput } from "./docx-builder";

export async function addTenantEquipmentAttachments(input: ProposalDocumentInput, companyId: string): Promise<ProposalDocumentInput> {
  const ids = [...new Set(input.selectedEquipmentIds || [])].filter(Boolean).slice(0, 3);
  if (!ids.length) return input;
  const equipment = await prisma.equipmentInventory.findMany({ where: { companyId, id: { in: ids }, active: true }, select: {
    brand: true, model: true, datasheetName: true, datasheetMimeType: true, datasheetData: true,
    certificateName: true, certificateMimeType: true, certificateData: true,
    type:true,warrantyYears:true,logoUrl:true,
  } });
  const attachments: NonNullable<ProposalDocumentInput["attachments"]> = [];
  for (const item of equipment) {
    const equipmentName = `${item.brand} ${item.model}`;
    if (item.datasheetData && item.datasheetName && item.datasheetMimeType) attachments.push({ equipmentName, kind: "DATASHEET", fileName: item.datasheetName, mimeType: item.datasheetMimeType, dataUrl: item.datasheetData });
    if (item.certificateData && item.certificateName && item.certificateMimeType) attachments.push({ equipmentName, kind: "CERTIFICATE", fileName: item.certificateName, mimeType: item.certificateMimeType, dataUrl: item.certificateData });
  }
  const selectedEquipment=equipment.map(item=>({name:`${item.brand} ${item.model}`,type:item.type,warrantyYears:item.warrantyYears,logoUrl:item.logoUrl}));
  return { ...input, attachments,selectedEquipment };
}
