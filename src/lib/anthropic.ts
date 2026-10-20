const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicAdminKeyMissingError extends Error {}

function getAdminApiKey(): string {
  const apiKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!apiKey) {
    throw new AnthropicAdminKeyMissingError("ANTHROPIC_ADMIN_KEY is not set");
  }
  return apiKey;
}

async function anthropicAdminGet(
  path: string,
  params: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const apiKey = getAdminApiKey();
  const url = new URL(`https://api.anthropic.com${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic Admin API error ${res.status}: ${body.slice(0, 500)}`);
  }

  return res.json();
}

function startOfMonthUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

type CostReportResponse = {
  data: { results: { workspace_id: string | null; amount: string }[] }[];
  has_more: boolean;
  next_page: string | null;
};

/**
 * Month-to-date USD spend per Anthropic Console workspace, from the Cost
 * Admin API. The cost endpoint can only be grouped by workspace_id (or
 * description) — not by API key — so per-user attribution requires one
 * Anthropic workspace per pilot user.
 */
export async function fetchMonthToDateCostByWorkspace(): Promise<Record<string, number>> {
  const apiKey = getAdminApiKey();

  const startingAt = startOfMonthUTC().toISOString();
  const endingAt = new Date().toISOString();
  const costsByWorkspace: Record<string, number> = {};
  let page: string | undefined;

  do {
    const params = new URLSearchParams({
      starting_at: startingAt,
      ending_at: endingAt,
      bucket_width: "1d",
      limit: "31",
    });
    params.append("group_by[]", "workspace_id");
    if (page) params.set("page", page);

    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/cost_report?${params.toString()}`,
      {
        headers: {
          "anthropic-version": ANTHROPIC_VERSION,
          "x-api-key": apiKey,
        },
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic Cost API error ${res.status}: ${body.slice(0, 500)}`);
    }

    const json = (await res.json()) as CostReportResponse;
    for (const bucket of json.data ?? []) {
      for (const result of bucket.results ?? []) {
        if (!result.workspace_id) continue;
        const cents = Number.parseFloat(result.amount ?? "0");
        if (!Number.isFinite(cents)) continue;
        costsByWorkspace[result.workspace_id] =
          (costsByWorkspace[result.workspace_id] ?? 0) + cents / 100;
      }
    }

    page = json.has_more ? (json.next_page ?? undefined) : undefined;
  } while (page);

  return costsByWorkspace;
}

export type OrgMember = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type OrgMembersResponse = {
  data: { id: string; email: string; name: string; role: string }[];
  has_more: boolean;
  last_id: string | null;
};

/** Every member of the Anthropic organization, from the Admin API (cursor-paginated). */
export async function listOrganizationMembers(): Promise<OrgMember[]> {
  const members: OrgMember[] = [];
  let afterId: string | undefined;

  do {
    const json = (await anthropicAdminGet("/v1/organizations/users", {
      limit: "1000",
      ...(afterId ? { after_id: afterId } : {}),
    })) as OrgMembersResponse;

    for (const u of json.data ?? []) {
      if (u.email) members.push({ id: u.id, email: u.email, name: u.name, role: u.role });
    }

    afterId = json.has_more ? (json.last_id ?? undefined) : undefined;
  } while (afterId);

  return members;
}

type OrgWorkspacesResponse = {
  data: { id: string; name: string }[];
  has_more: boolean;
  last_id: string | null;
};

async function listWorkspaceIds(): Promise<string[]> {
  const ids: string[] = [];
  let afterId: string | undefined;

  do {
    const json = (await anthropicAdminGet("/v1/organizations/workspaces", {
      limit: "1000",
      ...(afterId ? { after_id: afterId } : {}),
    })) as OrgWorkspacesResponse;

    for (const w of json.data ?? []) ids.push(w.id);

    afterId = json.has_more ? (json.last_id ?? undefined) : undefined;
  } while (afterId);

  return ids;
}

type WorkspaceMembersResponse = {
  data: { user_id: string }[];
  has_more: boolean;
  last_id: string | null;
};

async function listWorkspaceMemberUserIds(workspaceId: string): Promise<string[]> {
  const userIds: string[] = [];
  let afterId: string | undefined;

  do {
    const json = (await anthropicAdminGet(`/v1/organizations/workspaces/${workspaceId}/members`, {
      limit: "1000",
      ...(afterId ? { after_id: afterId } : {}),
    })) as WorkspaceMembersResponse;

    for (const m of json.data ?? []) userIds.push(m.user_id);

    afterId = json.has_more ? (json.last_id ?? undefined) : undefined;
  } while (afterId);

  return userIds;
}

/**
 * Maps each org member's ID to the one non-default, non-archived workspace
 * they belong to — only when that's unambiguous (exactly one such
 * workspace). A member in zero or several workspaces is left out, since we
 * can't guess which one is "their" pilot workspace.
 */
export async function buildMemberToWorkspaceMap(): Promise<Map<string, string>> {
  const workspaceIds = await listWorkspaceIds();
  const membership = new Map<string, string[]>();

  for (const workspaceId of workspaceIds) {
    const userIds = await listWorkspaceMemberUserIds(workspaceId);
    for (const userId of userIds) {
      const list = membership.get(userId) ?? [];
      list.push(workspaceId);
      membership.set(userId, list);
    }
  }

  const result = new Map<string, string>();
  for (const [userId, workspaceIds] of membership) {
    if (workspaceIds.length === 1) result.set(userId, workspaceIds[0]);
  }
  return result;
}
