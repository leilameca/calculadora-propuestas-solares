import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const proposal = await prisma.proposal.findFirst({
      where: { id, companyId: session.companyId },
      include: { customer: true, createdBy: { select: { name: true } } },
    });
    return proposal
      ? NextResponse.json(proposal)
      : NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
  }
  return NextResponse.json(
    await prisma.proposal.findMany({
      where: { companyId: session.companyId },
      omit: { invoiceData: true },
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
      const company = await tx.company.findUnique({ where: { id: session.companyId! }, select: { proposalValidityDays: true } });
      let customer = body.customerId
        ? await tx.customer.findFirst({ where: { id: String(body.customerId), companyId: session.companyId! } })
        : body.customerNic
        ? await tx.customer.findUnique({ where: { companyId_nic: { companyId: session.companyId!, nic: String(body.customerNic) } } })
        : null;

      if (body.customerId && !customer) {
        throw new Error("El cliente seleccionado no pertenece a esta empresa.");
      }

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
            logoUrl:body.customerLogo||null,
            projectImageUrl:body.customerProjectImage||null,
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
          validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + (company?.proposalValidityDays || 15) * 24 * 60 * 60 * 1000),
          notes: body.notes || null,
          projectImageUrl:body.projectImageUrl||null,
          invoiceName:body.invoiceName||null,
          invoiceMimeType:body.invoiceMimeType||null,
          invoiceData:body.invoiceData||null,
        },
      });
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la propuesta." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  const allowedStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
  if (!body.id) return NextResponse.json({ error: "La propuesta es obligatoria." }, { status: 400 });
  if (body.status && !allowedStatuses.includes(body.status)) return NextResponse.json({ error: "Estado de propuesta inválido." }, { status: 400 });
  const version = Number(body.version);
  if (body.version != null && (!Number.isInteger(version) || version < 1)) return NextResponse.json({ error: "La versión debe ser un número entero mayor que cero." }, { status: 400 });
  try {
    const existing = await prisma.proposal.findFirst({ where: { id: String(body.id), companyId: session.companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    const proposal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (body.customerName != null) {
        const current = await tx.proposal.findUnique({ where: { id: existing.id }, select: { customerId: true } });
        if (current) await tx.customer.update({
          where: { id: current.customerId },
          data: {
            name: String(body.customerName).trim(),
            nic: body.customerNic == null ? undefined : String(body.customerNic).trim() || null,
            address: body.customerAddress == null ? undefined : String(body.customerAddress).trim() || null,
            city: body.city == null ? undefined : String(body.city),
            utility: body.utility == null ? undefined : String(body.utility),
            tariff: body.tariff == null ? undefined : String(body.tariff),
            logoUrl:body.customerLogo===undefined?undefined:body.customerLogo||null,
            projectImageUrl:body.customerProjectImage===undefined?undefined:body.customerProjectImage||null,
          },
        });
      }
      return tx.proposal.update({ where: { id: existing.id }, data: {
        status: body.status, version: body.version == null ? undefined : version,
        projectName: body.projectName == null ? undefined : String(body.projectName).trim(),
        systemType: body.systemType == null ? undefined : String(body.systemType),
        city: body.city == null ? undefined : String(body.city),
        utility: body.utility == null ? undefined : String(body.utility),
        tariff: body.tariff == null ? undefined : String(body.tariff),
        monthlyConsumption: body.monthlyConsumption == null ? undefined : body.monthlyConsumption as Prisma.InputJsonValue,
        calculationInput: body.calculationInput == null ? undefined : body.calculationInput as Prisma.InputJsonValue,
        calculationResult: body.calculationResult == null ? undefined : body.calculationResult as Prisma.InputJsonValue,
        quoteItems: body.quoteItems == null ? undefined : body.quoteItems as Prisma.InputJsonValue,
        selectedInverterId: body.selectedInverterId === undefined ? undefined : body.selectedInverterId || null,
        manualInverter: body.manualInverter === undefined ? undefined : body.manualInverter || null,
        exchangeRate: body.exchangeRate == null ? undefined : body.exchangeRate,
        subtotalUsd: body.subtotalUsd == null ? undefined : body.subtotalUsd,
        taxUsd: body.taxUsd == null ? undefined : body.taxUsd,
        totalUsd: body.totalUsd == null ? undefined : body.totalUsd,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        notes: body.notes == null ? undefined : String(body.notes).trim() || null,
        projectImageUrl:body.projectImageUrl===undefined?undefined:body.projectImageUrl||null,
        invoiceName:body.invoiceName===undefined?undefined:body.invoiceName||null,
        invoiceMimeType:body.invoiceMimeType===undefined?undefined:body.invoiceMimeType||null,
        invoiceData:body.invoiceData===undefined?undefined:body.invoiceData||null,
      }, include: { customer: true, createdBy: { select: { name: true } } } });
    });
    return NextResponse.json(proposal);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la propuesta." }, { status: 400 });
  }
}
