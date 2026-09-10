import { apiHandler } from "@/lib/api-handler";
import { NextRequest,NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function handleGET(request:NextRequest){
  const session=await sessionFromRequest(request);
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const user=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,name:true,email:true,role:true,companyId:true,company:{select:{name:true,primaryColor:true,secondaryColor:true,accentColor:true}}}});
  return user?NextResponse.json(user,{headers:{"Cache-Control":"private, max-age=60, stale-while-revalidate=300"}}):NextResponse.json({error:"Usuario no encontrado"},{status:404});
}

export const GET = apiHandler(handleGET);
