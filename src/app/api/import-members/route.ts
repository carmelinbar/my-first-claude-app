import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  AnthropicAdminKeyMissingError,
  buildMemberToWorkspaceMap,
  listOrganizationMembers,
} from "@/lib/anthropic";

export async function POST() {
  let members: Awaited<ReturnType<typeof listOrganizationMembers>>;
  let workspaceByMemberId: Map<string, string>;
  try {
    [members, workspaceByMemberId] = await Promise.all([
      listOrganizationMembers(),
      buildMemberToWorkspaceMap(),
    ]);
  } catch (err) {
    if (err instanceof AnthropicAdminKeyMissingError) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_ADMIN_KEY is not set. Add it as an environment variable (an Admin API key from your Anthropic Console) to enable importing.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach the Anthropic API" },
      { status: 502 }
    );
  }

  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true, anthropicWorkspaceId: true },
  });
  const existingByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));

  const created: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  const linked: { id: string; anthropicWorkspaceId: string }[] = [];

  for (const member of members) {
    const email = member.email.toLowerCase();
    const workspaceId = workspaceByMemberId.get(member.id) ?? null;
    const existing = existingByEmail.get(email);

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          name: member.name || member.email,
          email: member.email,
          monthlyBudget: 0,
          anthropicWorkspaceId: workspaceId,
        },
      });
      created.push(user);
    } else if (!existing.anthropicWorkspaceId && workspaceId) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { anthropicWorkspaceId: workspaceId },
      });
      linked.push({ id: user.id, anthropicWorkspaceId: user.anthropicWorkspaceId! });
    }
  }

  return NextResponse.json({
    created,
    linked,
    message: `Imported ${created.length} new user${created.length === 1 ? "" : "s"}, linked ${linked.length} existing user${linked.length === 1 ? "" : "s"} to a workspace.`,
  });
}
