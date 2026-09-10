import type { PdfContext } from "../types";
import { PdfFlow } from "../components/flow";
import { formatNum } from "../components/primitives";
export function renderPage(ctx: PdfContext) {
  const { input, date } = ctx;
  const flow = new PdfFlow(ctx,"Descripción del Proyecto y Objetivos");
  flow.paragraph(`Titular: ${input.customer.name} | Cuenta: ${input.customer.nic || "N/D"} | Fecha: ${date}`);
  flow.paragraph(`Dirección: ${input.customer.address || input.project.city}`);
  const description = `El proyecto plantea una solución de abastecimiento energético para ${input.customer.name}, fundamentada en una generación estimada de ${formatNum(input.result.monthlyGenerationBase)} kWh/mes, equivalente a ${formatNum(input.result.annualGeneration)} kWh/año, mediante un sistema solar fotovoltaico de alta eficiencia diseñado a la medida por ${input.company.name}.`;
  flow.paragraph(description);
  if(input.proposalText)flow.paragraph(input.proposalText);
  flow.paragraph("OBJETIVOS DEL PROYECTO",true,12);
  flow.paragraph("Eficiencia energética: suministro eficiente y sostenible. Sostenibilidad: fuentes renovables. Ahorro: reducir costos energéticos. Independencia: disminuir exposición a las alzas tarifarias.");
  flow.paragraph("El cálculo de generación está basado en los consumos y parámetros declarados por el cliente.");
  flow.paragraph("MARCO REGULATORIO - INYECCIÓN A LA RED",true,12);
  const regulatory = `De acuerdo con la normativa vigente de la Superintendencia de Electricidad (SIE), los nuevos clientes de las categorías BTS-1 (residencial) y BTS-2 (comercial de baja demanda) están sujetos a un cargo equivalente a un porcentaje del valor de la tarifa eléctrica sobre la energía inyectada a la red, como contraprestación por el uso de la infraestructura de distribución. Este cargo aplica únicamente a la energía exportada — no a la energía autoconsumida en sitio. ${input.company.name} diseña cada sistema para maximizar el autoconsumo y minimizar el impacto de esta regulación.`;
  flow.paragraph(regulatory);
}
