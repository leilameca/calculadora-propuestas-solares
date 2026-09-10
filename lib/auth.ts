import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { z } from "zod";
import type { NextRequest } from "next/server";
export type SessionPayload={userId:string;companyId?:string;role:string;email:string};
const secret=()=>{const value=process.env.AUTH_SECRET;if(!value&&process.env.NODE_ENV==="production")throw new Error("AUTH_SECRET es obligatorio en producción.");return new TextEncoder().encode(value||"development-only-secret-change-me");};
export async function createSessionToken(payload:SessionPayload){ return new SignJWT(payload).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(secret()); }
export async function verifySessionToken(token:string){ return z.object({userId:z.string().min(1),companyId:z.string().optional(),role:z.enum(["SUPERADMIN","COMPANY_ADMIN","SALES","ENGINEER","VIEWER"]),email:z.string()}).parse((await jwtVerify(token,secret(),{algorithms:["HS256"],requiredClaims:["exp","iat"]})).payload); }
export async function sessionFromRequest(request:NextRequest): Promise<SessionPayload | null> {
  const token=request.cookies.get("solar_session")?.value;
  if(!token)return null;
  let payload: SessionPayload;
  try { payload=await verifySessionToken(token); } catch { return null; }
  const user=await prisma.user.findUnique({where:{id:payload.userId},select:{id:true,email:true,role:true,active:true,companyId:true,company:{select:{active:true}}}});
  if(!user?.active || (user.role!=="SUPERADMIN"&&!user.company?.active))return null;
  if(user.companyId!== (payload.companyId ?? null) || user.role!==payload.role)return null;
  if(request.method!=="GET" && request.method!=="HEAD") {
    const origin=request.headers.get("origin");
    if(origin && origin!==request.nextUrl.origin)return null;
    if(user.role==="VIEWER" && !["/api/proposals/pdf","/api/proposals/docx"].includes(request.nextUrl.pathname))return null;
  }
  return {userId:user.id,email:user.email,role:user.role,companyId:user.companyId??undefined};
}
