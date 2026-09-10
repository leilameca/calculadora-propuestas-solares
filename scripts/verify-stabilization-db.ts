import { prisma } from "../lib/prisma";

async function main() {
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const counts = { companies: await tx.company.count(), customers: await tx.customer.count(), equipment: await tx.equipmentInventory.count(), proposals: await tx.proposal.count() };
    const blobs = await tx.$queryRaw<Array<{ source: string; records: bigint; bytes: bigint | null }>>`
      SELECT 'equipment_documents' AS source, COUNT(*) AS records, SUM(octet_length(COALESCE("datasheetData", '')) + octet_length(COALESCE("certificateData", ''))) AS bytes FROM "EquipmentInventory" WHERE "datasheetData" LIKE 'data:%' OR "certificateData" LIKE 'data:%'
      UNION ALL SELECT 'invoices', COUNT(*), SUM(octet_length("invoiceData")) FROM "Proposal" WHERE "invoiceData" LIKE 'data:%'
      UNION ALL SELECT 'company_images', COUNT(*), SUM(octet_length(COALESCE("logoUrl", '')) + octet_length(COALESCE("coverImageUrl", '')) + octet_length(COALESCE("backCoverImageUrl", '')) + octet_length(COALESCE("coverImages"::text, ''))) FROM "Company" WHERE "logoUrl" LIKE 'data:%' OR "coverImageUrl" LIKE 'data:%' OR "backCoverImageUrl" LIKE 'data:%' OR "coverImages"::text LIKE '%data:%'
      UNION ALL SELECT 'customer_images', COUNT(*), SUM(octet_length(COALESCE("logoUrl", '')) + octet_length(COALESCE("projectImageUrl", ''))) FROM "Customer" WHERE "logoUrl" LIKE 'data:%' OR "projectImageUrl" LIKE 'data:%'
      UNION ALL SELECT 'proposal_images', COUNT(*), SUM(octet_length("projectImageUrl")) FROM "Proposal" WHERE "projectImageUrl" LIKE 'data:%'
      UNION ALL SELECT 'equipment_images', COUNT(*), SUM(octet_length("logoUrl")) FROM "EquipmentInventory" WHERE "logoUrl" LIKE 'data:%'
    `;
    const inconsistencies = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) FROM "Proposal" p JOIN "Customer" c ON p."customerId" = c.id WHERE p."companyId" <> c."companyId"`;
    const storageTable = await tx.$queryRaw<Array<{ present: boolean }>>`SELECT to_regclass('public."StoredFile"') IS NOT NULL AS present`;
    return { connected: true, counts, blobs: blobs.map(row => ({ source: row.source, records: Number(row.records), encodedBytes: Number(row.bytes ?? 0) })), inconsistentCustomerTenants: Number(inconsistencies[0].count), storageTablePresent: storageTable[0].present };
  }, { timeout: 20000 });
  console.info(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ connected: false, errorType: error instanceof Error ? error.name : "unknown" })); process.exitCode = 1; }).finally(() => prisma.$disconnect());
