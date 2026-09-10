import { NextRequest, NextResponse } from "next/server";
import { verifyEdgeSession } from "@/lib/auth-edge";

export async function proxy(request:NextRequest){
  const configuredAppUrl=process.env.APP_URL?.trim();
  if(configuredAppUrl){
    try{
      const canonical=new URL(configuredAppUrl);
      if(request.nextUrl.origin!==canonical.origin){
        const destination=new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`,canonical);
        return NextResponse.redirect(destination);
      }
    }catch{
      console.error("auth.invalid_app_url");
    }
  }
  if(request.nextUrl.pathname==="/"||request.nextUrl.pathname==="/login")return NextResponse.next();
  if(process.env.NODE_ENV!=="production"&&process.env.ALLOW_DEV_DASHBOARD==="true") return NextResponse.next();
  const token=request.cookies.get("solar_session")?.value;
  if(!token||!(await verifyEdgeSession(token))) return NextResponse.redirect(new URL("/login",request.url));
  return NextResponse.next();
}

export const config={matcher:["/","/login","/dashboard/:path*"]};
