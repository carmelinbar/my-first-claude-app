import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim() || null;
  if (body.budgetCap !== undefined) {
    const cap = Number(body.budgetCap);
    if (Number.isFinite(cap) && cap >= 0) data.budgetCap = cap;
  }
  if (typeof body.status === "string" && ["active", "paused"].includes(body.status)) {
    data.status = body.status;
  }

  const useCase = await prisma.useCase.update({ where: { id: params.id }, data });
  return NextResponse.json(useCase);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.useCase.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
