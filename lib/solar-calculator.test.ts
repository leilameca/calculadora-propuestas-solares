import { describe, expect, it } from "vitest";
import { calculateSolar, latestBilledAverage } from "./solar-calculator";

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
  });
});
