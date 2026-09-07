import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await sessionFromRequest(request);
  if (!session?.companyId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const proposals = await prisma.proposal.findMany({
    where: { companyId: session.companyId },
    select: { id: true, number: true, projectName: true, status: true, totalUsd: true, createdAt: true, calculationResult: true, customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const monthProposals = proposals.filter((proposal) => proposal.createdAt >= monthStart);
  const approved = proposals.filter((proposal) => proposal.status === "ACCEPTED");
  const activePipeline = proposals.filter((proposal) => !["REJECTED", "EXPIRED"].includes(proposal.status));
  const capacityKwp = proposals.reduce((sum, proposal) => {
    const result = proposal.calculationResult as { installedKwp?: number };
    return sum + (Number(result?.installedKwp) || 0);
  }, 0);

  return NextResponse.json({
    metrics: {
      proposalsThisMonth: monthProposals.length,
      capacityKwp,
      pipelineUsd: activePipeline.reduce((sum, proposal) => sum + Number(proposal.totalUsd), 0),
      approvalRate: proposals.length ? (approved.length / proposals.length) * 100 : 0,
      approvedCount: approved.length,
      totalProposals: proposals.length,
    },
    recent: proposals.slice(0, 5).map((proposal) => ({
      id: proposal.id,
      number: proposal.number,
      customer: proposal.customer.name,
      projectName: proposal.projectName,
      status: proposal.status,
      totalUsd: Number(proposal.totalUsd),
      installedKwp: Number((proposal.calculationResult as { installedKwp?: number })?.installedKwp) || 0,
    })),
  });
}
