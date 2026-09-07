import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

export async function POST(request:NextRequest){
  const startedAt=performance.now();
  const {email,password}=await request.json();
  const normalizedEmail=String(email||"").trim().toLowerCase();
  if(!normalizedEmail||!password)return NextResponse.json({error:"Credenciales inválidas"},{status:401});
  const databaseStartedAt=performance.now();
  const user=await prisma.user.findUnique({where:{email:normalizedEmail},select:{id:true,companyId:true,email:true,passwordHash:true,role:true,active:true,company:{select:{active:true}}}});
  const databaseDuration=performance.now()-databaseStartedAt;
  const passwordStartedAt=performance.now();
  const passwordMatches=user?await bcrypt.compare(String(password),user.passwordHash):false;
  const passwordDuration=performance.now()-passwordStartedAt;
  const timing=`db;dur=${databaseDuration.toFixed(1)}, password;dur=${passwordDuration.toFixed(1)}, total;dur=${(performance.now()-startedAt).toFixed(1)}`;
  if(!user||!user.active||(user.role!=="SUPERADMIN"&&!user.company?.active)||!passwordMatches)return NextResponse.json({error:"Credenciales inválidas o empresa inactiva"},{status:401,headers:{"Cache-Control":"no-store","Server-Timing":timing}});
  const token=await createSessionToken({userId:user.id,companyId:user.companyId||undefined,role:user.role,email:user.email});
  const response=NextResponse.json({ok:true,role:user.role},{headers:{"Cache-Control":"no-store","Server-Timing":timing}});
  response.cookies.set("solar_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*8});
  return response;
}
