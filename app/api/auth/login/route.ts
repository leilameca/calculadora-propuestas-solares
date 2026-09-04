import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
export async function POST(request:NextRequest){ const {email,password}=await request.json(); const user=await prisma.user.findUnique({where:{email:String(email).toLowerCase()},include:{company:{select:{active:true}}}}); if(!user||!user.active||(user.role!=="SUPERADMIN"&&!user.company?.active)||!(await bcrypt.compare(String(password),user.passwordHash))) return NextResponse.json({error:"Credenciales inválidas o empresa inactiva"},{status:401}); const token=await createSessionToken({userId:user.id,companyId:user.companyId||undefined,role:user.role,email:user.email}); const response=NextResponse.json({ok:true,role:user.role}); response.cookies.set("solar_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*8}); return response; }
