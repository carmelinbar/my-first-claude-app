import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  const useCaseId = body.useCaseId ? String(body.useCaseId) : null;
  const amount = Number(body.amount);
  const note = body.note ? String(body.note).trim() : null;

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "A user and a positive amount are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.usageEntry.create({
    data: { userId, useCaseId, amount, note },
  });
  return NextResponse.json(entry, { status: 201 });
}
