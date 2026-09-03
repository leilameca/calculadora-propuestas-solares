import { describe,expect,it } from "vitest";
import { parseElectricInvoice } from "./ocr";

describe("parser OCR EDENORTE",()=>{
  it("usa exclusivamente NOMBRE O RAZON SOCIAL e ignora TITULAR DE PAGO",()=>{
    const text=`EDENORTE\nTITULAR DE PAGO: Tercero Incorrecto\nNOMBRE O RAZON SOCIAL: Cliente Correcto SRL\nNIC: 78995956\nTARIFA: BTS-1\nAgo 2025 180 kWh\nSep 2025 200 kWh\nOct 2025 210 kWh\nNov 2025 220 kWh\nDic 2025 230 kWh\nEne 2026 240 kWh\nFeb 2026 250 kWh\nMar 2026 260 kWh\nAbr 2026 270 kWh\nMay 2026 280 kWh\nJun 2026 290 kWh\nJul 2026 300 kWh\nAgo 2026 310 kWh`;
    const result=parseElectricInvoice(text);
    expect(result.customerName).toBe("Cliente Correcto SRL");
    expect(result.consumption).toHaveLength(12);
    expect(result.consumption.some((item)=>item.year===2025&&item.month===8)).toBe(false);
    expect(result.consumption.at(-1)?.kwh).toBe(310);
  });
  it("deriva EDESUR y EDEESTE a ingreso manual",()=>{
    const result=parseElectricInvoice("EDESUR\nNOMBRE O RAZON SOCIAL: Cliente");
    expect(result.recognized).toBe(false);
    expect(result.requiresManualEntry).toBe(true);
    expect(result.consumption).toEqual([]);
  });
});
