import type { PdfContext } from "../types";
import { PdfFlow } from "../components/flow";
import { CONTENT_W, formatUsd, formatDop, formatNum } from "../components/primitives";
export function renderPage(ctx: PdfContext) {
  const {input}=ctx;
  const flow=new PdfFlow(ctx,"Inversión y Cotización del Sistema");
  flow.paragraph(`Sistema de ${input.result.installedKwp.toFixed(2)} kWp; generación ${formatNum(input.result.annualGeneration)} kWh/año. ${input.result.panelCount} módulos de ${input.project.panelWatts} W. Inversor: ${input.project.inverter||"por seleccionar"}.`);
  flow.table(["CONCEPTO","DESCRIPCIÓN","MONTO USD"],input.quoteItems.map(item=>[item.name,item.description||"Incluido",formatUsd(item.amountUsd)]),[CONTENT_W*.26,CONTENT_W*.44,CONTENT_W*.30]);
  flow.table(["RESUMEN","MONTO"],[
    ["SUBTOTAL",formatUsd(ctx.quoteSubtotal)], ["ITBIS",formatUsd(ctx.quoteTax)], ["INVERSIÓN TOTAL",formatUsd(ctx.quoteTotal)], ["EQUIVALENTE RD$",formatDop(ctx.quoteTotalDop)], ["PRECIO POR Wp",formatUsd(ctx.quotePricePerWp)],
  ],[CONTENT_W*.65,CONTENT_W*.35]);
}
