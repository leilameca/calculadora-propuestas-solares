import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { parseKwh, parseUtilityBill } from "./parser";
import { edenorteFixture } from "./fixtures";
import { extractPdfTextLayers, groupItemsIntoLines } from "../pdf-text";
import { readUtilityBill } from "./pipeline";

describe("normalized utility bill parser", () => {
  it("extracts all Edenorte fields without confusing NIC and contract", () => {
    const bill = parseUtilityBill(edenorteFixture);
    expect(bill).toMatchObject({ utility: "EDENORTE", nic: "9000001", contractNumber: "9000099", currentConsumptionKwh: 1234.5, billingPeriod: { month: 8, year: 2026 }, customerName: "Cliente Ficticio Solar SRL" });
    expect(bill.consumptionHistory).toHaveLength(12);
    expect(bill.confidence).toBe(1);
  });
  it("sorts disordered rows and reconstructs XY independently of stream order", () => {
    const bill = parseUtilityBill("EDENORTE\nMar 2026 400 kWh\nEne 2026 300 kWh\nFeb 2026 350 kWh");
    expect(bill.consumptionHistory.map(row => row.month)).toEqual([1, 2, 3]);
    const item = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });
    expect(groupItemsIntoLines([item("350", 200, 10), item("Feb", 10, 10), item("EDENORTE", 0, 40), item("2026", 100, 10)])).toEqual(["EDENORTE", "Feb 2026 350"]);
  });
  it("marks incomplete history without inventing missing years", () => {
    const bill = parseUtilityBill("EDENORTE\nHISTORICO DE CONSUMOS\nEne 200\nFeb 300");
    expect(bill.consumptionHistory).toEqual([]);
    expect(bill.warnings.join()).toContain("Año ausente");
  });
  it("deduplicates identical rows and rejects conflicting duplicate months", () => {
    const bill = parseUtilityBill("EDENORTE\nEne 2026 200 kWh\nEne 2026 200 kWh\nFeb 2026 300 kWh\nFeb 2026 500 kWh");
    expect(bill.consumptionHistory).toEqual([{ month: 1, year: 2026, kwh: 200 }]);
    expect(bill.warnings.join()).toContain("conflicto");
  });
  it("handles PDF without text, without detaching caller bytes, and falls back to OCR", async () => {
    const pdf = await PDFDocument.create(); pdf.addPage();
    const bytes = await pdf.save();
    const result = await extractPdfTextLayers(bytes);
    expect(result.text).toBe(""); expect(bytes.length).toBeGreaterThan(0);
    const ocr = vi.fn(async () => edenorteFixture);
    const bill = await readUtilityBill({ textLayers: async () => result, ocr });
    expect(ocr).toHaveBeenCalledOnce(); expect(bill.source).toBe("ocr");
  });
  it("keeps generic supported utilities and rejects unknown documents", () => {
    expect(parseUtilityBill(edenorteFixture.replace("EDENORTE", "EDESUR")).warnings.join()).toContain("genérica");
    expect(parseUtilityBill(edenorteFixture.replace("EDENORTE", "OTRA")).consumptionHistory).toEqual([]);
  });
  it("rejects invalid month, year, negative and zero consumption", () => {
    const bill = parseUtilityBill("EDENORTE\nHISTORICO DE CONSUMOS\n13/2026 300\n01/1990 300\nEne 2026 -300\nFeb 2026 0\nMar 2026 10000001");
    expect(bill.consumptionHistory).toEqual([]); expect(bill.warnings.join()).toContain("inválido");
  });
  it.each([["1.234", 1234], ["1,234", 1234], ["1.234,50", 1234.5], ["1,234.50", 1234.5], ["1234.50", 1234.5]])("parses separators %s", (text, value) => { expect(parseKwh(text)).toBe(value); });
  it("does not spend OCR when layout is sufficient", async () => {
    const ocr = vi.fn();
    const bill = await readUtilityBill({ textLayers: async () => ({ text: "EDENORTE", layoutText: edenorteFixture }), ocr });
    expect(bill.source).toBe("layout"); expect(ocr).not.toHaveBeenCalled();
  });
  it("rejects invalid future structured output", async () => {
    const bill = await readUtilityBill({ textLayers: async () => ({ text: "", layoutText: "" }), ocr: async () => "", structured: { extract: async () => ({ utility: "EDENORTE", consumptionHistory: "invented" }) } });
    expect(bill.consumptionHistory).toEqual([]); expect(bill.warnings.join()).toContain("estructurada inválida");
  });
});
