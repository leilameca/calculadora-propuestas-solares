import { prisma } from "../lib/prisma";
import { loadSavedProposalForExport } from "../lib/proposal-export";
import { addTenantEquipmentAttachments } from "../lib/equipment-attachments";
import { prepareProposalAssets } from "../lib/proposal-assets";
import { buildProposalPdf } from "../lib/pdf-builder";
import { buildProposalDocument } from "../lib/docx-builder";
import { Packer } from "docx";
import { ZodError } from "zod";

async function main() {
  // Read-only smoke check: never persist or print client/proposal content.
  const records = await prisma.proposal.findMany({ select: { id: true, companyId: true }, take: 20, orderBy: { id: "asc" } });
  let passed = 0;
  for (const record of records) {
    try {
      const input = await prepareProposalAssets(await addTenantEquipmentAttachments(await loadSavedProposalForExport(record.id, record.companyId), record.companyId), record.companyId);
      const pdf = await buildProposalPdf(input);
      const docx = await Packer.toBuffer(await buildProposalDocument(input));
      if (!pdf.length || !docx.length) throw new Error("empty_export");
      passed++;
    } catch (error) {
      console.error("existing_export_failed", { type: error instanceof Error ? error.name : "unknown", fields: error instanceof ZodError ? error.issues.map(issue => issue.path.join(".")) : [] });
    }
  }
  console.info(JSON.stringify({ inspected: records.length, exportedPdfAndDocx: passed, persistedFiles: 0 }));
  if (passed !== records.length) process.exitCode = 1;
}
main().catch(error => { console.error("existing_export_check_failed", { type: error instanceof Error ? error.name : "unknown" }); process.exitCode = 1; }).finally(() => prisma.$disconnect());
