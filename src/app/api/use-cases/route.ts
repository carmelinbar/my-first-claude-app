import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const useCases = await prisma.useCase.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(useCases);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const ownerId = String(body.ownerId ?? "").trim();
  const description = body.description ? String(body.description).trim() : null;
  const budgetCap = Number(body.budgetCap ?? 0);

  if (!name || !ownerId) {
    return NextResponse.json({ error: "Name and owner are required" }, { status: 400 });
  }

  const useCase = await prisma.useCase.create({
    data: {
      name,
      ownerId,
      description,
      budgetCap: Number.isFinite(budgetCap) ? budgetCap : 0,
    },
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json(useCase, { status: 201 });
}
