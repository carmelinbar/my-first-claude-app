import { getUsersWithUsage } from "@/lib/data";
import UsersManager from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsersWithUsage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">
          Add pilot participants, set their monthly budget, and block anyone who needs to pause.
        </p>
      </div>
      <UsersManager initialUsers={users} />
    </div>
  );
}
