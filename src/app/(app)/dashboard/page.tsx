import Link from "next/link";
import { getUseCasesWithUsage, getUsersWithUsage } from "@/lib/data";
import { budgetLevel, levelClasses } from "@/lib/budget";
import BudgetBar from "@/components/BudgetBar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [users, useCases] = await Promise.all([getUsersWithUsage(), getUseCasesWithUsage()]);

  const totalBudget = users.reduce((sum, u) => sum + u.monthlyBudget, 0);
  const totalSpent = users.reduce((sum, u) => sum + u.spent, 0);

  const overBudget = users.filter((u) => budgetLevel(u.spent, u.monthlyBudget) === "danger");
  const nearLimit = users.filter((u) => budgetLevel(u.spent, u.monthlyBudget) === "warn");
  const blockedUsers = users.filter((u) => u.status === "blocked");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pilot overview</h1>
        <p className="text-sm text-slate-500">
          Monitor everyone using the pilot and catch budget issues before they happen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total budget" value={`$${totalBudget.toFixed(2)}`} />
        <SummaryCard label="Total spent" value={`$${totalSpent.toFixed(2)}`} />
        <SummaryCard
          label="Near limit (≥80%)"
          value={String(nearLimit.length)}
          tone={nearLimit.length > 0 ? "warn" : "ok"}
        />
        <SummaryCard
          label="Over budget"
          value={String(overBudget.length)}
          tone={overBudget.length > 0 ? "danger" : "ok"}
        />
      </div>

      {(overBudget.length > 0 || blockedUsers.length > 0) && (
        <div className="card space-y-2 border-red-200 bg-red-50">
          <h2 className="text-sm font-semibold text-red-800">Needs attention</h2>
          <ul className="space-y-1 text-sm text-red-700">
            {overBudget.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong> is over budget (${u.spent.toFixed(2)} of $
                {u.monthlyBudget.toFixed(2)}).
              </li>
            ))}
            {blockedUsers.map((u) => (
              <li key={u.id}>
                <strong>{u.name}</strong> is currently blocked.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Users</h2>
            <Link href="/users" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Manage users →
            </Link>
          </div>
          <div className="space-y-4">
            {users.length === 0 && <p className="text-sm text-slate-500">No users yet.</p>}
            {users.map((u) => (
              <div key={u.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{u.name}</span>
                  <StatusBadge status={u.status} />
                </div>
                <BudgetBar spent={u.spent} budget={u.monthlyBudget} />
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Use cases</h2>
            <Link href="/use-cases" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Manage use cases →
            </Link>
          </div>
          <div className="space-y-4">
            {useCases.length === 0 && <p className="text-sm text-slate-500">No use cases yet.</p>}
            {useCases.map((uc) => (
              <div key={uc.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{uc.name}</span>
                  <span className="text-xs text-slate-400">{uc.owner.name}</span>
                </div>
                <BudgetBar spent={uc.spent} budget={uc.budgetCap} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "danger";
}) {
  const classes = levelClasses(tone);
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "ok" ? "text-slate-900" : classes.text}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isBlocked = status === "blocked";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {isBlocked ? "Blocked" : "Active"}
    </span>
  );
}
