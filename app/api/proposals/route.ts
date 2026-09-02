import { NextRequest,NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(request:NextRequest){const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});return NextResponse.json(await prisma.proposal.findMany({where:{companyId:session.companyId},include:{customer:true,createdBy:{select:{name:true}}},orderBy:{createdAt:"desc"}}));}
export async function POST(request:NextRequest){const session=await sessionFromRequest(request);if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});const body=await request.json();const proposal=await prisma.proposal.create({data:{...body,companyId:session.companyId,createdById:session.userId,monthlyConsumption:body.monthlyConsumption as Prisma.InputJsonValue,calculationInput:body.calculationInput as Prisma.InputJsonValue,calculationResult:body.calculationResult as Prisma.InputJsonValue,quoteItems:body.quoteItems as Prisma.InputJsonValue}});return NextResponse.json(proposal,{status:201});}
