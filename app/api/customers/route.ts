import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const customers = await prisma.customer.findMany({
    where: { companyId: session.companyId },
    include: { _count: { select: { proposals: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "El nombre del cliente es obligatorio." }, { status: 400 });
  try {
    const customer = await prisma.customer.create({
      data: {
        companyId: session.companyId,
        name: String(body.name).trim(),
        nic: body.nic ? String(body.nic).trim() : null,
        rnc: body.rnc ? String(body.rnc).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        city: body.city ? String(body.city).trim() : null,
        utility: body.utility ? String(body.utility).trim() : null,
        tariff: body.tariff ? String(body.tariff).trim() : null,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Ya existe un cliente con ese NIC en esta empresa." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el cliente." }, { status: 400 });
  }
}