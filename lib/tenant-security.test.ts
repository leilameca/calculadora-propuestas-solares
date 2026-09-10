import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() }, storedFile: { findFirst: vi.fn() },
  customer: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  equipmentInventory: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  proposal: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
}));
vi.mock("./prisma", () => ({ prisma: db }));
import { createSessionToken, sessionFromRequest } from "./auth";
import { ownedFile } from "./storage/files";
import { loadSavedProposalForExport } from "./proposal-export";
import { GET as customers } from "../app/api/customers/route";
import { GET as equipment } from "../app/api/equipment/route";
import { GET as proposals } from "../app/api/proposals/route";
import { GET as download } from "../app/api/files/[id]/route";
import { POST as login } from "../app/api/auth/login/route";
import bcrypt from "bcryptjs";
import { verifySessionToken } from "./auth";

const user = { id: "user-a", companyId: "tenant-a", email: "test@example.invalid", role: "SALES", active: true, company: { active: true } };
async function request(path: string, method = "GET", role = "SALES") {
  const token = await createSessionToken({ userId: user.id, companyId: user.companyId, email: user.email, role });
  return new NextRequest(`http://localhost${path}`, { method, headers: { cookie: `solar_session=${token}` } });
}
beforeEach(() => { vi.clearAllMocks(); db.user.findUnique.mockResolvedValue(user); db.storedFile.findFirst.mockResolvedValue(null); db.customer.findMany.mockResolvedValue([]); db.equipmentInventory.findMany.mockResolvedValue([]); db.proposal.findMany.mockResolvedValue([]); db.proposal.findFirst.mockResolvedValue(null); });
describe("tenant authorization", () => {
  it("authenticates with bcrypt and issues a valid HttpOnly tenant session", async () => {
    db.user.findUnique.mockResolvedValue({ ...user, passwordHash: await bcrypt.hash("Synthetic-password-2026", 4) });
    const attempt = (password: string) => login(new NextRequest("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password }) }), undefined);
    expect((await attempt("wrong-password")).status).toBe(401);
    const response = await attempt("Synthetic-password-2026");
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(await verifySessionToken(cookie.split(";")[0].split("=")[1])).toMatchObject({ userId: user.id, companyId: "tenant-a" });
  });
  it("denies unauthenticated APIs", async () => {
    const response = await download(new NextRequest("http://localhost/api/files/foreign"), { params: Promise.resolve({ id: "foreign" }) });
    expect(response.status).toBe(401); expect(db.storedFile.findFirst).not.toHaveBeenCalled();
  });
  it("revalidates disabled users and companies and role changes", async () => {
    for (const record of [{ ...user, active: false }, { ...user, company: { active: false } }, { ...user, role: "VIEWER" }]) {
      db.user.findUnique.mockResolvedValue(record);
      expect(await sessionFromRequest(await request("/api/equipment"))).toBeNull();
    }
  });
  it("denies viewer mutations and forged cross-origin writes", async () => {
    db.user.findUnique.mockResolvedValue({ ...user, role: "VIEWER" });
    expect(await sessionFromRequest(await request("/api/equipment", "POST", "VIEWER"))).toBeNull();
    db.user.findUnique.mockResolvedValue(user);
    const req = await request("/api/equipment", "POST"); req.headers.set("origin", "https://foreign.invalid");
    expect(await sessionFromRequest(req)).toBeNull();
  });
  it("ignores another companyId on customer and equipment lists", async () => {
    expect((await customers(await request("/api/customers?companyId=tenant-b"), undefined)).status).toBe(200);
    expect(db.customer.findMany.mock.calls[0][0].where.companyId).toBe("tenant-a");
    expect((await equipment(await request("/api/equipment?companyId=tenant-b"), undefined)).status).toBe(200);
    expect(db.equipmentInventory.findMany.mock.calls[0][0].where.companyId).toBe("tenant-a");
  });
  it("denies manipulated proposal and file IDs in reads and exports", async () => {
    expect((await proposals(await request("/api/proposals?id=foreign"), undefined)).status).toBe(404);
    expect(db.proposal.findFirst.mock.calls[0][0].where).toEqual({ id: "foreign", companyId: "tenant-a" });
    await expect(loadSavedProposalForExport("foreign", "tenant-a")).rejects.toThrow("no encontrada");
    await expect(ownedFile("/api/files/foreign", "tenant-a")).rejects.toThrow("no encontrado");
    expect(db.storedFile.findFirst.mock.calls[0][0].where).toEqual({ id: "foreign", companyId: "tenant-a" });
    expect((await download(await request("/api/files/foreign"), { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404);
  });
});
