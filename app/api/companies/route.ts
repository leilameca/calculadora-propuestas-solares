import { NextRequest,NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessionFromRequest } from "@/lib/auth";
export async function POST(request:NextRequest){const session=await sessionFromRequest(request);if(session?.role!=="SUPERADMIN")return NextResponse.json({error:"Acceso exclusivo de SuperAdmin"},{status:403});const body=await request.json(),passwordHash=await bcrypt.hash(body.adminPassword,12);const company=await prisma.$transaction(async (tx:Prisma.TransactionClient)=>{const tenant=await tx.company.create({data:{name:body.name,slug:body.slug,rnc:body.rnc,email:body.email,phone:body.phone}});await tx.user.create({data:{companyId:tenant.id,name:body.adminName,email:String(body.adminEmail).toLowerCase(),passwordHash,role:"COMPANY_ADMIN"}});return tenant;});return NextResponse.json(company,{status:201});}
