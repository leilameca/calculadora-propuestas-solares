import { NextRequest, NextResponse } from "next/server";
import { verifyEdgeSession } from "@/lib/auth-edge";
export async function middleware(request:NextRequest){ if(process.env.NODE_ENV!=="production"&&process.env.ALLOW_DEV_DASHBOARD!=="false") return NextResponse.next(); const token=request.cookies.get("solar_session")?.value; if(!token||!(await verifyEdgeSession(token))) return NextResponse.redirect(new URL("/login",request.url)); return NextResponse.next(); }
export const config={matcher:["/dashboard/:path*"]};
