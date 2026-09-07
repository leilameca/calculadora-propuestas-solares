import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  const requestedCompanyId = new URL(request.url).searchParams.get("companyId");
  const companyId = session?.role === "SUPERADMIN" ? (requestedCompanyId || session.companyId) : session?.companyId;
  if (!companyId) return NextResponse.json({ error: "Selecciona una empresa para continuar." }, { status: 400 });
  if (session?.role === "SUPERADMIN") {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { active: true } });
    if (!company) return NextResponse.json({ error: "La empresa seleccionada no existe." }, { status: 404 });
  }
  const customers = await prisma.customer.findMany({
    where: { companyId },
    include: { _count: { select: { proposals: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const session = await sessionFromRequest(request);
  const body = await request.json();
  const companyId = session?.role === "SUPERADMIN" ? String(body.companyId || "") : session?.companyId;
  if (!companyId) return NextResponse.json({ error: "Selecciona una empresa para continuar." }, { status: 400 });
  if (!body.name) return NextResponse.json({ error: "El nombre del cliente es obligatorio." }, { status: 400 });
  try {
    if (session?.role === "SUPERADMIN") {
      const company = await prisma.company.findUnique({ where: { id: companyId }, select: { active: true } });
      if (!company) return NextResponse.json({ error: "La empresa seleccionada no existe." }, { status: 404 });
      if (!company.active) return NextResponse.json({ error: "La empresa seleccionada está inactiva." }, { status: 400 });
    }
    const customer = await prisma.customer.create({
      data: {
        companyId,
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

export async function PATCH(request: NextRequest) {
  const session = await sessionFromRequest(request);
  const body = await request.json();
  const companyId = session?.role === "SUPERADMIN" ? String(body.companyId || "") : session?.companyId;
  if (!companyId) return NextResponse.json({ error: "Selecciona una empresa para continuar." }, { status: 400 });
  if (!body.id || !body.name) return NextResponse.json({ error: "Cliente y nombre son obligatorios." }, { status: 400 });
  try {
    const existing = await prisma.customer.findFirst({ where: { id: String(body.id), companyId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    const customer = await prisma.customer.update({ where: { id: existing.id }, data: {
      name: String(body.name).trim(), nic: body.nic ? String(body.nic).trim() : null,
      rnc: body.rnc ? String(body.rnc).trim() : null, email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null, address: body.address ? String(body.address).trim() : null,
      city: body.city ? String(body.city).trim() : null, utility: body.utility ? String(body.utility).trim() : null,
      tariff: body.tariff ? String(body.tariff).trim() : null,
    } });
    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "Ya existe un cliente con ese NIC en esta empresa." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el cliente." }, { status: 400 });
  }
}