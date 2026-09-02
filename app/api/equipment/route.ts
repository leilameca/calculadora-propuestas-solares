import { NextRequest,NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionFromRequest } from "@/lib/auth";
export async function GET(request:NextRequest){const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"Falta tenant"},{status:401});return NextResponse.json(await prisma.equipmentInventory.findMany({where:{companyId:session.companyId,active:true},orderBy:[{type:"asc"},{brand:"asc"}]}));}
export async function POST(request:NextRequest){const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"Falta tenant"},{status:401});const body=await request.json();return NextResponse.json(await prisma.equipmentInventory.create({data:{...body,companyId:session.companyId}}),{status:201});}
