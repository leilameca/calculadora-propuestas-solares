import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const previousAppUrl=process.env.APP_URL;

afterEach(()=>{
  if(previousAppUrl===undefined)delete process.env.APP_URL;
  else process.env.APP_URL=previousAppUrl;
});

describe("canonical application URL",()=>{
  it("redirects alternate Vercel hosts before authentication and preserves the requested page",async()=>{
    process.env.APP_URL="https://calculadora-propuestas-solares.vercel.app";
    const response=await proxy(new NextRequest("https://temporary-deployment.vercel.app/dashboard/calculator?proposal=demo"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://calculadora-propuestas-solares.vercel.app/dashboard/calculator?proposal=demo");
  });

  it("allows the login page on the canonical host",async()=>{
    process.env.APP_URL="https://calculadora-propuestas-solares.vercel.app";
    const response=await proxy(new NextRequest("https://calculadora-propuestas-solares.vercel.app/login"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
