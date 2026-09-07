import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionFromRequest } from "@/lib/auth";

const equipmentSelect = {
  id: true, type: true, brand: true, model: true, description: true, powerWatts: true,
  capacityKwh: true, unitCostUsd: true, quantity: true, warrantyYears: true, active: true,
  datasheetName: true, datasheetMimeType: true, certificateName: true, certificateMimeType: true,
} as const;

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "Falta tenant" }, { status: 401 });
  return NextResponse.json(await prisma.equipmentInventory.findMany({
    where: { companyId: session.companyId, active: true }, select: equipmentSelect,
    orderBy: [{ type: "asc" }, { brand: "asc" }],
  }));
}

export async function POST(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    if (!session?.companyId) return NextResponse.json({ error: "Falta tenant" }, { status: 401 });
    const body = await request.json();
    if (!body.type || !body.brand || !body.model || !Number.isFinite(Number(body.unitCostUsd))) {
      return NextResponse.json({ error: "Tipo, marca, modelo y costo son obligatorios." }, { status: 400 });
    }
    const equipment = await prisma.equipmentInventory.create({ data: {
      companyId: session.companyId, type: body.type, brand: String(body.brand).trim(), model: String(body.model).trim(),
      description: body.description ? String(body.description).trim() : null,
      powerWatts: body.powerWatts == null ? null : Number(body.powerWatts),
      capacityKwh: body.capacityKwh == null ? null : Number(body.capacityKwh),
      unitCostUsd: Number(body.unitCostUsd), quantity: Math.max(0, Number(body.quantity || 0)),
      warrantyYears: body.warrantyYears == null ? null : Number(body.warrantyYears),
    }, select: equipmentSelect });
    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el equipo." }, { status: 400 });
  }
}
