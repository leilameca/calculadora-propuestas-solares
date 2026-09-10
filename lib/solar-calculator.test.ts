import { describe, expect, it } from "vitest";
import { calculateBilledAverage, calculateSolar, latestBilledAverage, type BilledConsumption } from "./solar-calculator";

describe("solar calculator", () => {
  it("aplica el ITBIS comercial del 18% sin conservar la tasa legacy", () => {
    const result = calculateSolar({
      consumption: Array(12).fill(1000), hsp: 4, oversizingFactor: 1.2,
      panelWatts: 500, costPerWpUsd: 1, exchangeRate: 60,
      utility: "EDESUR", tariff: "BTS-1",
    });
    expect(result.requiredKwp).toBeCloseTo(8.3333, 3);
    expect(result.panelCount).toBe(20);
    expect(result.installedKwp).toBe(10);
    expect(result.itbisUsd).toBe(1800);
    expect(result.totalUsd).toBe(11800);
    expect(result.projection25Years[1].factor).toBeCloseTo(0.994, 5);
  });

  it("permite desactivar el ITBIS y usar un valor personalizado por empresa", () => {
    const noTax = calculateSolar({
      consumption: Array(12).fill(1000), hsp: 4, oversizingFactor: 1.2,
      panelWatts: 500, costPerWpUsd: 1, exchangeRate: 60,
      utility: "EDESUR", tariff: "BTS-1", itbisEnabled: false,
    });
    expect(noTax.itbisUsd).toBe(0);
    expect(noTax.totalUsd).toBe(10000);

    const customTax = calculateSolar({
      consumption: Array(12).fill(1000), hsp: 4, oversizingFactor: 1.2,
      panelWatts: 500, costPerWpUsd: 1, exchangeRate: 60,
      utility: "EDESUR", tariff: "BTS-1", itbisEnabled: true, itbisRate: 0.12,
    });
    expect(customTax.itbisUsd).toBe(1200);
    expect(customTax.totalUsd).toBe(11200);
  });

  it("descarta el mes base del año anterior y promedia solo los últimos meses facturados", () => {
    const records = [
      { month: 8, year: 2026, kwh: 270 },
      { month: 7, year: 2026, kwh: 280 },
      { month: 6, year: 2026, kwh: 290 },
      { month: 5, year: 2026, kwh: 310 },
      { month: 4, year: 2026, kwh: 320 },
      { month: 3, year: 2026, kwh: 330 },
      { month: 2, year: 2026, kwh: 340 },
      { month: 1, year: 2026, kwh: 350 },
      { month: 12, year: 2025, kwh: 300 },
      { month: 11, year: 2025, kwh: 260 },
      { month: 10, year: 2025, kwh: 250 },
      { month: 9, year: 2025, kwh: 200 },
      { month: 8, year: 2025, kwh: 180 },
    ];
    expect(latestBilledAverage(records, 3)).toBe(280);
    expect(latestBilledAverage(records, 4)).toBe(287.5);
  });

  it("ignora meses repetidos al formar la ventana de facturación", () => {
    const records = [
      { month: 2, year: 2026, kwh: 300 },
      { month: 2, year: 2026, kwh: 300 },
      { month: 1, year: 2026, kwh: 200 },
      { month: 12, year: 2025, kwh: 100 },
    ];
    expect(latestBilledAverage(records, 3)).toBe(200);
  });
});

describe("promedio de períodos facturados", () => {
  it("promedia seis períodos del mismo año", () => {
    const records = [500, 550, 600, 650, 700, 793.02].map((kwh, index) => ({ month: index + 1, year: 2026, kwh }));
    const result = calculateBilledAverage(records, 6, 6, 2026);

    expect(result.averageConsumption).toBeCloseTo(632.17, 2);
    expect(result.validPeriodCount).toBe(6);
  });

  it("cruza al año anterior según el último mes facturado", () => {
    const records = [
      { month: 10, year: 2025, kwh: 400 },
      { month: 11, year: 2025, kwh: 500 },
      { month: 12, year: 2025, kwh: 600 },
      { month: 1, year: 2026, kwh: 700 },
      { month: 2, year: 2026, kwh: 800 },
      { month: 3, year: 2026, kwh: 900 },
    ];
    const result = calculateBilledAverage(records, 6, 3, 2026);

    expect(result.averageConsumption).toBe(650);
    expect(result.periods.map(({ month, year }) => `${month}-${year}`)).toEqual([
      "10-2025", "11-2025", "12-2025", "1-2026", "2-2026", "3-2026",
    ]);
  });

  it("acepta los doce períodos completos", () => {
    const records = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, year: 2026, kwh: (index + 1) * 100 }));
    expect(calculateBilledAverage(records, 12, 12, 2026).averageConsumption).toBe(650);
  });

  it("no calcula si falta un valor seleccionado", () => {
    const records = Array.from({ length: 5 }, (_, index) => ({ month: index + 1, year: 2026, kwh: 500 }));
    const result = calculateBilledAverage(records, 6, 6, 2026);

    expect(result.averageConsumption).toBeNull();
    expect(result.validPeriodCount).toBe(5);
    expect(result.missingPeriods).toEqual([{ month: 6, year: 2026 }]);
  });

  it("conserva la precisión de valores decimales", () => {
    const records = [
      { month: 1, year: 2026, kwh: 100.25 },
      { month: 2, year: 2026, kwh: 200.75 },
    ];
    expect(calculateBilledAverage(records, 2, 2, 2026).averageConsumption).toBe(150.5);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rechaza el consumo inválido %s", (kwh) => {
    const result = calculateBilledAverage([{ month: 1, year: 2026, kwh }], 1, 1, 2026);

    expect(result.averageConsumption).toBeNull();
    expect(result.invalidPeriods).toHaveLength(1);
  });

  it("recalcula después de editar sin mutar ni reemplazar los consumos mensuales", () => {
    const records: BilledConsumption[] = Array.from({ length: 6 }, (_, index) => ({ month: index + 1, year: 2026, kwh: 500 }));
    const originalRecords = structuredClone(records);
    expect(calculateBilledAverage(records, 6, 6, 2026).averageConsumption).toBe(500);
    expect(records).toEqual(originalRecords);

    const editedRecords = records.map((record) => record.month === 6 ? { ...record, kwh: 800 } : record);
    expect(calculateBilledAverage(editedRecords, 6, 6, 2026).averageConsumption).toBe(550);
    expect(records).toEqual(originalRecords);

    const monthlyConsumption = [500, 500, 500, 500, 500, 800, 0, 0, 0, 0, 0, 0];
    const originalConsumption = [...monthlyConsumption];
    const calculation = calculateSolar({
      consumption: monthlyConsumption,
      averageConsumption: 550,
      hsp: 4,
      oversizingFactor: 1.2,
      panelWatts: 500,
      costPerWpUsd: 1,
      exchangeRate: 60,
      utility: "EDENORTE",
      tariff: "BTS-1",
    });

    expect(calculation.averageMonthlyConsumption).toBe(550);
    expect(monthlyConsumption).toEqual(originalConsumption);
    expect(monthlyConsumption).not.toEqual(Array(12).fill(550));
  });
});
