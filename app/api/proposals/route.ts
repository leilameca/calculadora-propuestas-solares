import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(
    await prisma.proposal.findMany({
      where: { companyId: session.companyId },
      include: { customer: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();

  if (!body.customerName || !body.projectName || !body.calculationResult) {
    return NextResponse.json({ error: "Faltan datos obligatorios: cliente, proyecto o resultado." }, { status: 400 });
  }

  try {
    const proposal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Buscar o crear el cliente por NIC dentro del tenant
      let customer = body.customerNic
        ? await tx.customer.findUnique({ where: { companyId_nic: { companyId: session.companyId!, nic: String(body.customerNic) } } })
        : null;

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            companyId: session.companyId!,
            name: String(body.customerName).trim(),
            nic: body.customerNic ? String(body.customerNic).trim() : null,
            address: body.customerAddress ? String(body.customerAddress).trim() : null,
            city: body.city ? String(body.city).trim() : null,
            utility: body.utility ? String(body.utility).trim() : null,
            tariff: body.tariff ? String(body.tariff).trim() : null,
          },
        });
      }

      // Generar número secuencial PROP-YYYY-NNN
      const year = new Date().getFullYear();
      const count = await tx.proposal.count({ where: { companyId: session.companyId, createdAt: { gte: new Date(`${year}-01-01`) } } });
      const number = `PROP-${year}-${String(count + 1).padStart(3, "0")}`;

      return tx.proposal.create({
        data: {
          number,
          companyId: session.companyId!,
          customerId: customer.id,
          createdById: session.userId,
          status: body.status || "DRAFT",
          projectName: String(body.projectName).trim(),
          systemType: body.systemType || "On-Grid",
          city: body.city || "",
          utility: body.utility || "",
          tariff: body.tariff || "",
          monthlyConsumption: (body.monthlyConsumption || []) as Prisma.InputJsonValue,
          calculationInput: (body.calculationInput || {}) as Prisma.InputJsonValue,
          calculationResult: body.calculationResult as Prisma.InputJsonValue,
          quoteItems: (body.quoteItems || []) as Prisma.InputJsonValue,
          selectedInverterId: body.selectedInverterId || null,
          manualInverter: body.manualInverter || null,
          exchangeRate: body.exchangeRate ?? 0,
          subtotalUsd: body.subtotalUsd ?? 0,
          taxUsd: body.taxUsd ?? 0,
          totalUsd: body.totalUsd ?? 0,
          validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          notes: body.notes || null,
        },
      });
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la propuesta." }, { status: 400 });
  }
}