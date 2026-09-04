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
  it("interpreta la tabla real de histórico de una factura MTD1N de EDENORTE",()=>{
    const text=`Edenorte Dominicana, S.A.
CONTRATO : 7471365
TITULAR DE PAGO............: CCA CIBAO CENTRAL DE, ALMACENAMIENTO SRL
DIRECCION SUMINISTRO......: AVDA PADRE LAS CASAS 1 ENCF: E310000846224
NOMBRE O RAZON SOCIAL: CCA CIBAO CENTRAL DE, ALMACENAMIENTO SRL Itiner: 0002
TARIFA..............: MTD1N
HISTORICO DE CONSUMOS
Mes Csmo Pot. kWh
Ago 2025 51600 166.200
Sep 56400 162.000
Oct 58800 134.400
Nov 61200 135.000
Dic 60000 147.600
Ene 61800 168.000
Feb 64200 111.600
Mar 51000 151.800
Abr 68400 240.000
May 73800 225.000
Jun 76200 220.800
Jul 72600 222.000
Ago 2026 81000 258.000
PAGUE ANTES DE 04/09/2026`;
    const result=parseElectricInvoice(text);
    expect(result.recognized).toBe(true);
    expect(result.customerName).toBe("CCA CIBAO CENTRAL DE, ALMACENAMIENTO SRL");
    expect(result.nic).toBe("7471365");
    expect(result.address).toBe("AVDA PADRE LAS CASAS 1");
    expect(result.tariff).toBe("MTD-1");
    expect(result.consumption).toHaveLength(12);
    expect(result.consumption[0]).toEqual({month:9,year:2025,kwh:56400});
    expect(result.consumption.at(-1)).toEqual({month:8,year:2026,kwh:81000});
  });
});
