import { NextRequest,NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request:NextRequest){
  const session=await sessionFromRequest(request);
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const user=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,name:true,email:true,role:true,companyId:true,company:{select:{name:true}}}});
  return user?NextResponse.json(user):NextResponse.json({error:"Usuario no encontrado"},{status:404});
}
