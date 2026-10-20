const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicAdminKeyMissingError extends Error {}

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
  const apiKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!apiKey) {
    throw new AnthropicAdminKeyMissingError("ANTHROPIC_ADMIN_KEY is not set");
  }

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
