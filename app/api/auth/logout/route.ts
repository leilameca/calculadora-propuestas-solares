import { apiHandler } from "@/lib/api-handler";
import { NextResponse } from "next/server";
async function handlePOST(){const response=NextResponse.json({ok:true});response.cookies.set("solar_session","",{httpOnly:true,path:"/",maxAge:0});return response;}

export const POST = apiHandler(handlePOST);
