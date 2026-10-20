import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AnthropicAdminKeyMissingError, fetchMonthToDateCostByWorkspace } from "@/lib/anthropic";

export async function POST() {
  let costsByWorkspace: Record<string, number>;
  try {
    costsByWorkspace = await fetchMonthToDateCostByWorkspace();
  } catch (err) {
    if (err instanceof AnthropicAdminKeyMissingError) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_ADMIN_KEY is not set. Add it as an environment variable (an Admin API key from your Anthropic Console) to enable syncing.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach the Anthropic API" },
      { status: 502 }
    );
  }

  const trackedUsers = await prisma.user.findMany({
    where: { anthropicWorkspaceId: { not: null } },
    select: { id: true, anthropicWorkspaceId: true },
  });

  if (trackedUsers.length === 0) {
    return NextResponse.json({
      updated: [],
      message: "No users have an Anthropic workspace ID set yet.",
    });
  }

  const now = new Date();
  const updated = await Promise.all(
    trackedUsers.map(async (u) => {
      const syncedSpend = costsByWorkspace[u.anthropicWorkspaceId!] ?? 0;
      const user = await prisma.user.update({
        where: { id: u.id },
        data: { syncedSpend, lastSyncedAt: now },
      });
      return { id: user.id, syncedSpend: user.syncedSpend, lastSyncedAt: user.lastSyncedAt };
    })
  );

  return NextResponse.json({ updated });
}
