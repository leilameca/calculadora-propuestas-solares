import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderPdfPages } from "../lib/pdf-images";
import sharp from "sharp";

async function main() {
  const [source, directory] = process.argv.slice(2);
  if (!source || !directory) throw new Error("Uso: npx tsx scripts/render-verification.ts archivo.pdf directorio");
  await mkdir(directory, { recursive: true });
  const pages = await renderPdfPages(new Uint8Array(await readFile(source)), 80, 1.3);
  for (let i = 0; i < pages.length; i++) await writeFile(join(directory, `page-${i + 1}.png`), pages[i]);
  const tiles = await Promise.all(pages.map(buffer => sharp(buffer).resize(459, 594, { fit: "contain", background: "white" }).png().toBuffer()));
  const contact = await sharp({ create: { width: 918, height: Math.ceil(pages.length / 2) * 594, channels: 3, background: "#eeeeee" } }).composite(tiles.map((input, i) => ({ input, left: (i % 2) * 459, top: Math.floor(i / 2) * 594 }))).png().toBuffer();
  await writeFile(join(directory, "contact.png"), contact);
  console.info(JSON.stringify({ pages: pages.length, directory }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
