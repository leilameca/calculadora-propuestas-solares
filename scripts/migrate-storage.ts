import { appendFile, mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { persistMedia } from "../lib/storage/files";

const fields = {
  Company: ["logoUrl", "coverImageUrl", "backCoverImageUrl", "coverImages"],
  Customer: ["logoUrl", "projectImageUrl"],
  EquipmentInventory: ["logoUrl", "datasheetData", "certificateData"],
  Proposal: ["projectImageUrl", "invoiceData"],
} as const;
type Table = keyof typeof fields;
interface Entry { table: Table; id: string; companyId: string; field: string; before: string | string[]; after: string | string[] }
const args = process.argv.slice(2);
const apply = args.includes("--apply"), rollback = args.includes("--rollback");
const option = (key: string) => args[args.indexOf(key) + 1];
const companyId = args.includes("--company") ? option("--company") : undefined;
const manifest = resolve(args.includes("--manifest") ? option("--manifest") : "tmp/storage-rollback.jsonl");

async function replace(entry: Entry, reverse = false) {
  if (!Object.hasOwn(fields, entry.table) || !(fields[entry.table] as readonly string[]).includes(entry.field)) throw new Error("Manifest inválido.");
  const tenant = entry.table === "Company" ? "id" : "companyId";
  const json = entry.field === "coverImages";
  const before = reverse ? entry.after : entry.before, after = reverse ? entry.before : entry.after;
  const count = await prisma.$executeRawUnsafe(
    `UPDATE "${entry.table}" SET "${entry.field}" = $1${json ? "::jsonb" : ""}, "updatedAt" = NOW() WHERE "id" = $2 AND "${tenant}" = $3 AND "${entry.field}" = $4${json ? "::jsonb" : ""}`,
    json ? JSON.stringify(after) : after, entry.id, entry.companyId, json ? JSON.stringify(before) : before,
  );
  if (count !== 1) console.warn("storage.migration_skipped_concurrent_or_already_applied", { table: entry.table, id: entry.id, field: entry.field });
}

async function main() {
  if (rollback) {
    const entries = (await readFile(manifest, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as Entry).reverse();
    for (const entry of entries) { if (!companyId || entry.companyId === companyId) await replace(entry, true); }
    return;
  }
  if (apply) { await mkdir(dirname(manifest), { recursive: true }); await appendFile(manifest, "", { mode: 0o600 }); }
  for (const table of Object.keys(fields) as Table[]) {
    let cursor = "";
    while (true) {
      const tenant = table === "Company" ? "id" : "companyId";
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown> & { id: string }>>(
        `SELECT "id", "${tenant}" AS "tenant", ${fields[table].map(field => `"${field}"`).join(", ")} FROM "${table}" WHERE "id" > $1 ${companyId ? `AND "${tenant}" = $2` : ""} ORDER BY "id" LIMIT 25`,
        cursor, ...(companyId ? [companyId] : []),
      );
      if (!rows.length) break;
      for (const row of rows) {
        for (const field of fields[table]) {
          const original = row[field];
          const values = typeof original === "string" ? [original] : Array.isArray(original) ? original.filter((v): v is string => typeof v === "string") : [];
          if (!values.some(value => value.startsWith("data:"))) continue;
          console.info("storage.migration_candidate", { table, id: row.id, field, encodedBytes: values.reduce((sum, v) => sum + v.length, 0), apply });
          if (!apply) continue;
          const migrated: string[] = [];
          for (const value of values) migrated.push(value.startsWith("data:") ? (await persistMedia(value, String(row.tenant), field, !["invoiceData", "datasheetData", "certificateData"].includes(field)))! : value);
          const entry: Entry = { table, id: row.id, companyId: String(row.tenant), field, before: typeof original === "string" ? original : values, after: typeof original === "string" ? migrated[0] : migrated };
          // Flush the rollback journal to disk BEFORE the compare-and-swap write.
          const journal = await open(manifest, "a", 0o600);
          try { await journal.writeFile(JSON.stringify(entry) + "\n"); await journal.sync(); } finally { await journal.close(); }
          await replace(entry);
        }
      }
      cursor = rows.at(-1)!.id;
    }
  }
}
main().catch(error => { console.error("storage.migration_failed", error instanceof Error ? error.name : "unknown"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
