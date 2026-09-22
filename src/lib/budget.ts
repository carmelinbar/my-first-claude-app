export type BudgetLevel = "ok" | "warn" | "danger";

export const WARN_THRESHOLD = 0.8;

export function budgetLevel(spent: number, budget: number): BudgetLevel {
  if (budget <= 0) return spent > 0 ? "danger" : "ok";
  const ratio = spent / budget;
  if (ratio >= 1) return "danger";
  if (ratio >= WARN_THRESHOLD) return "warn";
  return "ok";
}

export function budgetPercent(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return Math.min(100, Math.round((spent / budget) * 100));
}

export function levelClasses(level: BudgetLevel) {
  switch (level) {
    case "danger":
      return { bar: "bg-danger", text: "text-danger", badge: "bg-red-100 text-red-700" };
    case "warn":
      return { bar: "bg-warn", text: "text-warn", badge: "bg-amber-100 text-amber-700" };
    default:
      return { bar: "bg-ok", text: "text-ok", badge: "bg-green-100 text-green-700" };
  }
}
