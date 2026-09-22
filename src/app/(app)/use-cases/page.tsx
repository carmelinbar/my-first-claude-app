import { getUseCasesWithUsage, getUsersWithUsage } from "@/lib/data";
import UseCasesManager from "@/components/UseCasesManager";

export const dynamic = "force-dynamic";

export default async function UseCasesPage() {
  const [useCases, users] = await Promise.all([getUseCasesWithUsage(), getUsersWithUsage()]);
  const owners = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Use cases</h1>
        <p className="text-sm text-slate-500">
          Track what each pilot use case is being used for, who owns it, and its budget cap.
        </p>
      </div>
      <UseCasesManager initialUseCases={useCases} owners={owners} />
    </div>
  );
}
