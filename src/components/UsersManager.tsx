"use client";

import { useState } from "react";
import type { UserWithUsage } from "@/lib/data";
import BudgetBar from "@/components/BudgetBar";

export default function UsersManager({ initialUsers }: { initialUsers: UserWithUsage[] }) {
  const [users, setUsers] = useState(initialUsers);

  function upsert(user: UserWithUsage) {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
  }

  function remove(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  function addSpent(id: string, amount: number) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, spent: u.spent + amount } : u)));
  }

  return (
    <div className="space-y-6">
      <AddUserForm
        onCreated={(user) => setUsers((prev) => [...prev, { ...user, spent: 0, useCaseCount: 0 }])}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Log usage</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onUpdated={upsert}
                onDeleted={() => remove(user.id)}
                onUsageLogged={(amount) => addSpent(user.id, amount)}
              />
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No users yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddUserForm({
  onCreated,
}: {
  onCreated: (user: { id: string; name: string; email: string; team: string | null; monthlyBudget: number; status: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, team, monthlyBudget }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add user");
        return;
      }
      onCreated(data);
      setName("");
      setEmail("");
      setTeam("");
      setMonthlyBudget("100");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="mb-3 font-semibold text-slate-900">Add pilot user</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          className="input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Team (optional)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder="Monthly budget ($)"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
          required
        />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <button type="submit" className="btn mt-3" disabled={loading}>
        {loading ? "Adding..." : "Add user"}
      </button>
    </form>
  );
}

function UserRow({
  user,
  onUpdated,
  onDeleted,
  onUsageLogged,
}: {
  user: UserWithUsage;
  onUpdated: (user: UserWithUsage) => void;
  onDeleted: () => void;
  onUsageLogged: (amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(user.monthlyBudget));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveBudget() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyBudget: budgetInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update");
        return;
      }
      onUpdated({ ...user, monthlyBudget: data.monthlyBudget });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    setBusy(true);
    try {
      const nextStatus = user.status === "blocked" ? "active" : "blocked";
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) onUpdated({ ...user, status: data.status });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${user.name} from the pilot?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) onDeleted();
    } finally {
      setBusy(false);
    }
  }

  async function submitUsage(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to log usage");
        return;
      }
      onUsageLogged(Number(amount));
      setAmount("");
      setNote("");
      setLogging(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{user.name}</div>
        <div className="text-xs text-slate-400">{user.email}</div>
      </td>
      <td className="px-4 py-3 text-slate-600">{user.team || "—"}</td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              className="input w-28"
              type="number"
              min="0"
              step="0.01"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
            />
            <button className="btn-outline" onClick={saveBudget} disabled={busy}>
              Save
            </button>
            <button className="btn-outline" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="w-48 space-y-1">
            <BudgetBar spent={user.spent} budget={user.monthlyBudget} />
            <button className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setEditing(true)}>
              Edit budget
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={toggleStatus}
          disabled={busy}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            user.status === "blocked" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {user.status === "blocked" ? "Blocked" : "Active"}
        </button>
      </td>
      <td className="px-4 py-3">
        {logging ? (
          <form onSubmit={submitUsage} className="space-y-2">
            <input
              className="input w-28"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <input
              className="input w-40"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-outline" type="submit" disabled={busy}>
                Save
              </button>
              <button className="btn-outline" type="button" onClick={() => setLogging(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="btn-outline" onClick={() => setLogging(true)}>
            + Log usage
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button className="btn-danger" onClick={handleDelete} disabled={busy}>
          Remove
        </button>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
