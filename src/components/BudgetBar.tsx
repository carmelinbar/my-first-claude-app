import { budgetLevel, budgetPercent, levelClasses } from "@/lib/budget";

export default function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const level = budgetLevel(spent, budget);
  const percent = budgetPercent(spent, budget);
  const classes = levelClasses(level);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>
          ${spent.toFixed(2)} / ${budget.toFixed(2)}
        </span>
        <span className={classes.text}>{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${classes.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
