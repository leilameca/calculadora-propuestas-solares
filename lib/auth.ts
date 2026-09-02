import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
export type SessionPayload={userId:string;companyId?:string;role:string;email:string};
const secret=()=>new TextEncoder().encode(process.env.AUTH_SECRET||"development-only-secret-change-me");
export async function createSessionToken(payload:SessionPayload){ return new SignJWT(payload).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(secret()); }
export async function verifySessionToken(token:string){ return (await jwtVerify(token,secret())).payload as unknown as SessionPayload; }
export async function sessionFromRequest(request:NextRequest){const token=request.cookies.get("solar_session")?.value;if(!token)return null;try{return await verifySessionToken(token)}catch{return null}}
