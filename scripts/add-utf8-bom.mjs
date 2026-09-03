import fs from "node:fs/promises";
import path from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error("Usage: node add-utf8-bom.mjs <input> <output>");

const source = await fs.readFile(path.resolve(inputArg));
const bom = Buffer.from([0xef, 0xbb, 0xbf]);
const content = source.subarray(0, 3).equals(bom) ? source : Buffer.concat([bom, source]);
await fs.mkdir(path.dirname(path.resolve(outputArg)), { recursive: true });
await fs.writeFile(path.resolve(outputArg), content);
