import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.team === "string") data.team = body.team.trim() || null;
  if (body.monthlyBudget !== undefined) {
    const budget = Number(body.monthlyBudget);
    if (Number.isFinite(budget) && budget >= 0) data.monthlyBudget = budget;
  }
  if (typeof body.status === "string" && ["active", "blocked"].includes(body.status)) {
    data.status = body.status;
  }

  const user = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
