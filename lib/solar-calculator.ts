export const HSP_BY_CITY = {
  Santiago: 4.11,
  "Santo Domingo": 4.0,
  "La Vega": 3.97,
  "San Francisco de Macoris": 3.97,
  Bonao: 3.97,
  Constanza: 3.97,
  Jarabacoa: 3.97,
  "Sabaneta de Yasica": 3.97,
  Salcedo: 4.11,
  Nagua: 4.11,
  Samana: 4.11,
  Cotui: 4.11,
  Moca: 4.11,
  "Hermanas Mirabal": 4.11,
  "Puerto Plata": 4.11,
  "Sabana Iglesia": 4.11,
  "Santiago Rodriguez": 4.23,
  Montecristi: 4.23,
  Mao: 4.23,
  Dajabon: 4.23,
  "Villa Vasquez": 4.23,
} as const;

export const ELECTRICITY_RATES = {
  "BTS-1": { EDESUR: 13.09, EDENORTE: 14.04, EDEESTE: 13.26 },
  "BTS-2": { EDESUR: 13.43, EDENORTE: 14.38, EDEESTE: 13.59 },
  BTD: { EDESUR: 9.02, EDENORTE: 9.83, EDEESTE: 9.07 },
  BTH: { EDESUR: 8.92, EDENORTE: 9.74, EDEESTE: 8.98 },
  "MTD-1": { EDESUR: 9.13, EDENORTE: 9.89, EDEESTE: 9.19 },
  "MTD-2": { EDESUR: 8.75, EDENORTE: 9.52, EDEESTE: 8.81 },
  MTH: { EDESUR: 8.64, EDENORTE: 9.42, EDEESTE: 8.7 },
} as const;

export const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"] as const;
export const SEASONAL_FACTORS = [0.95, 1, 1.05, 1.08, 1.1, 1.12, 1.15, 1.12, 1.08, 1.05, 1, 0.95] as const;
export const ANNUAL_DEGRADATION = 0.006;
export const CO2_TONS_PER_KWH = 0.0005;
export const ITBIS_RATE = 0.18;
// Compatibilidad con referencias heredadas; la regla comercial actual exige un 18% de ITBIS.
export const LEGACY_ITBIS_RATE = ITBIS_RATE;

export type Utility = "EDENORTE" | "EDESUR" | "EDEESTE";
export type Tariff = keyof typeof ELECTRICITY_RATES;

export interface BilledConsumption {
  month: number;
  year: number;
  kwh: number;
  billedAt?: string;
}

export interface SolarCalculationInput {
  consumption: number[];
  hsp: number;
  oversizingFactor: number;
  panelWatts: number;
  costPerWpUsd: number;
  exchangeRate: number;
  utility: Utility;
  tariff: Tariff;
  designMode?: "automatic" | "manual";
  manualPanelCount?: number;
  itbisEnabled?: boolean;
  itbisRate?: number;
}

export interface SolarCalculationResult {
  annualConsumption: number;
  averageMonthlyConsumption: number;
  requiredKwp: number;
  adjustedKwp: number;
  theoreticalPanelCount: number;
  panelCount: number;
  installedKwp: number;
  monthlyGenerationBase: number;
  annualGeneration: number;
  coveragePercent: number;
  co2AvoidedTons: number;
  monthlyGeneration: number[];
  monthlyCoverage: number[];
  costUsd: number;
  itbisUsd: number;
  totalUsd: number;
  totalDop: number;
  pricePerWpUsd: number;
  effectiveRate: number;
  monthlySavingsDop: number;
  annualSavingsDop: number;
  annualSavingsUsd: number;
  roiYears: number;
  projection25Years: Array<{ year: number; factor: number; generationKwh: number; savingsDop: number; accumulatedSavingsDop: number }>;
}

export function latestBilledAverage(records: BilledConsumption[], count: number): number {
  const recent = records
    .filter((r) => Number.isFinite(r.kwh) && r.kwh > 0)
    .map((r) => ({ ...r, month: Number(r.month), year: Number(r.year) }))
    .sort((a, b) => (b.year - a.year) || (b.month - a.month))
    .slice(0, 12);

  const windowSize = Math.min(Math.max(1, count), recent.length);
  const window = recent.slice(0, windowSize);
  if (!window.length) return 0;

  return window.reduce((sum, item) => sum + item.kwh, 0) / window.length;
}

export function calculateSolar(input: SolarCalculationInput): SolarCalculationResult {
  if (input.consumption.length !== 12) throw new Error("Se requieren exactamente 12 valores mensuales.");
  const numeric = [input.hsp, input.oversizingFactor, input.panelWatts, input.costPerWpUsd, input.exchangeRate];
  if (numeric.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Los parámetros solares deben ser mayores que cero.");

  const consumption = input.consumption.map((value) => Math.max(0, Number(value) || 0));
  const annualConsumption = consumption.reduce((sum, value) => sum + value, 0);
  if (annualConsumption <= 0) throw new Error("Debe existir al menos un consumo facturado.");

  const averageMonthlyConsumption = annualConsumption / 12;
  const requiredKwp = (averageMonthlyConsumption / 30) / input.hsp;
  const adjustedKwp = requiredKwp * input.oversizingFactor;
  const theoreticalPanelCount = Math.ceil((requiredKwp * 1000) / input.panelWatts);
  const automaticPanelCount = Math.ceil((adjustedKwp * 1000) / input.panelWatts);
  const panelCount = input.designMode === "manual" && input.manualPanelCount
    ? Math.max(1, Math.floor(input.manualPanelCount))
    : automaticPanelCount;
  const installedKwp = (panelCount * input.panelWatts) / 1000;
  const monthlyGenerationBase = installedKwp * input.hsp * 30;
  const annualGeneration = monthlyGenerationBase * 12;
  const coveragePercent = (annualGeneration / annualConsumption) * 100;
  const co2AvoidedTons = annualGeneration * CO2_TONS_PER_KWH;
  const monthlyGeneration = SEASONAL_FACTORS.map((factor) => installedKwp * input.hsp * 30 * factor);
  const monthlyCoverage = consumption.map((value, index) => value > 0 ? (monthlyGeneration[index] / value) * 100 : 0);

  const costUsd = installedKwp * 1000 * input.costPerWpUsd;
  const effectiveItbisRate = input.itbisEnabled === false ? 0 : (Number.isFinite(input.itbisRate) && input.itbisRate! > 0 ? input.itbisRate! : ITBIS_RATE);
  const itbisUsd = costUsd * effectiveItbisRate;
  const totalUsd = costUsd + itbisUsd;
  const totalDop = totalUsd * input.exchangeRate;
  const pricePerWpUsd = totalUsd / (installedKwp * 1000);
  const effectiveRate = ELECTRICITY_RATES[input.tariff][input.utility];
  const monthlySavingsDop = monthlyGenerationBase * effectiveRate;
  const annualSavingsDop = monthlySavingsDop * 12;
  const annualSavingsUsd = annualSavingsDop / input.exchangeRate;
  const roiYears = annualSavingsUsd > 0 ? totalUsd / annualSavingsUsd : Number.POSITIVE_INFINITY;

  let accumulatedSavingsDop = 0;
  const projection25Years = Array.from({ length: 25 }, (_, index) => {
    const factor = Math.pow(1 - ANNUAL_DEGRADATION, index);
    const generationKwh = annualGeneration * factor;
    const savingsDop = annualSavingsDop * factor;
    accumulatedSavingsDop += savingsDop;
    return { year: index + 1, factor, generationKwh, savingsDop, accumulatedSavingsDop };
  });

  return { annualConsumption, averageMonthlyConsumption, requiredKwp, adjustedKwp, theoreticalPanelCount, panelCount, installedKwp, monthlyGenerationBase, annualGeneration, coveragePercent, co2AvoidedTons, monthlyGeneration, monthlyCoverage, costUsd, itbisUsd, totalUsd, totalDop, pricePerWpUsd, effectiveRate, monthlySavingsDop, annualSavingsDop, annualSavingsUsd, roiYears, projection25Years };
}
