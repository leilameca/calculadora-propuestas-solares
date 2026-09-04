import { mkdir, writeFile } from "node:fs/promises";
import { Packer } from "docx";
import { buildProposalDocument, type ProposalDocumentInput } from "../lib/docx-builder";
import { buildProposalPdf } from "../lib/pdf-builder";
import { calculateSolar } from "../lib/solar-calculator";

const consumption = [61_800, 64_200, 51_000, 68_400, 73_800, 76_200, 72_600, 81_000, 56_400, 58_800, 61_200, 60_000];
const result = calculateSolar({
  consumption,
  hsp: 4.11,
  oversizingFactor: 1.2,
  panelWatts: 590,
  costPerWpUsd: 0.95,
  exchangeRate: 60,
  utility: "EDENORTE",
  tariff: "MTD-1",
  itbisEnabled: true,
  itbisRate: 0.18,
});

const payload: ProposalDocumentInput = {
  company: {
    name: "EILEN Electric Service",
    rnc: "1-31-00000-1",
    phone: "809-555-0147",
    email: "propuestas@eilen.do",
    website: "www.eilen.do",
    address: "Santiago, República Dominicana",
    slogan: "Ingeniería que transforma energía",
    primaryColor: "#0F4C5C",
    secondaryColor: "#2F7D32",
    accentColor: "#F2A900",
    proposalValidityDays: 15,
    itbisEnabled: true,
    itbisRate: 0.18,
  },
  customer: {
    name: "CCA CIBAO CENTRAL DE ALMACENAMIENTO SRL",
    nic: "7471365",
    address: "Av. Padre Las Casas 1, Urb. El Molino",
  },
  project: {
    name: "Sistema Solar Fotovoltaico",
    city: "Santiago",
    utility: "EDENORTE",
    tariff: "MTD-1",
    systemType: "On-Grid",
    panelWatts: 590,
    inverter: "Por seleccionar desde inventario",
  },
  consumption,
  result,
  quoteItems: [
    { name: "Módulos bifaciales", description: `${result.panelCount} módulos de 590 W`, amountUsd: result.costUsd * 0.38 },
    { name: "Inversor", description: "Por seleccionar desde inventario", amountUsd: result.costUsd * 0.24 },
    { name: "Estructura galvanizada", description: "Sistema certificado", amountUsd: result.costUsd * 0.11 },
    { name: "Cableado y protecciones", description: "DC/AC y puesta a tierra", amountUsd: result.costUsd * 0.10 },
    { name: "Mano de obra e ingeniería", description: "Instalación y puesta en marcha", amountUsd: result.costUsd * 0.17 },
  ],
  proposalNumber: "QA-EDENORTE-2026",
  date: "4 de septiembre de 2026",
};

async function main() {
  await mkdir("output/pdf", { recursive: true });
  await mkdir("qa-docx", { recursive: true });
  const document = await buildProposalDocument(payload);
  await Promise.all([
    writeFile("qa-docx/propuesta-edenorte-verificacion.docx", await Packer.toBuffer(document)),
    writeFile("output/pdf/propuesta-edenorte-verificacion.pdf", await buildProposalPdf(payload)),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
