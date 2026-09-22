"use client";

import { useState } from "react";
import type { UseCaseWithUsage } from "@/lib/data";
import BudgetBar from "@/components/BudgetBar";

type OwnerOption = { id: string; name: string };

export default function UseCasesManager({
  initialUseCases,
  owners,
}: {
  initialUseCases: UseCaseWithUsage[];
  owners: OwnerOption[];
}) {
  const [useCases, setUseCases] = useState(initialUseCases);

  function upsert(useCase: UseCaseWithUsage) {
    setUseCases((prev) => prev.map((uc) => (uc.id === useCase.id ? useCase : uc)));
  }

  function remove(id: string) {
    setUseCases((prev) => prev.filter((uc) => uc.id !== id));
  }

  function addSpent(id: string, amount: number) {
    setUseCases((prev) => prev.map((uc) => (uc.id === id ? { ...uc, spent: uc.spent + amount } : uc)));
  }

  return (
    <div className="space-y-6">
      <AddUseCaseForm
        owners={owners}
        onCreated={(uc) => setUseCases((prev) => [...prev, { ...uc, spent: 0 }])}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Use case</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Log usage</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {useCases.map((uc) => (
              <UseCaseRow
                key={uc.id}
                useCase={uc}
                owners={owners}
                onUpdated={upsert}
                onDeleted={() => remove(uc.id)}
                onUsageLogged={(amount) => addSpent(uc.id, amount)}
              />
            ))}
            {useCases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No use cases yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddUseCaseForm({
  owners,
  onCreated,
}: {
  owners: OwnerOption[];
  onCreated: (useCase: {
    id: string;
    name: string;
    description: string | null;
    budgetCap: number;
    status: string;
    owner: OwnerOption;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [budgetCap, setBudgetCap] = useState("50");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      setError("Add a user first — every use case needs an owner");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, ownerId, budgetCap }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add use case");
        return;
      }
      onCreated(data);
      setName("");
      setDescription("");
      setBudgetCap("50");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="mb-3 font-semibold text-slate-900">Add use case</h2>
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
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          {owners.length === 0 && <option value="">No users yet</option>}
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          placeholder="Budget cap ($)"
          value={budgetCap}
          onChange={(e) => setBudgetCap(e.target.value)}
          required
        />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <button type="submit" className="btn mt-3" disabled={loading}>
        {loading ? "Adding..." : "Add use case"}
      </button>
    </form>
  );
}

function UseCaseRow({
  useCase,
  owners,
  onUpdated,
  onDeleted,
  onUsageLogged,
}: {
  useCase: UseCaseWithUsage;
  owners: OwnerOption[];
  onUpdated: (useCase: UseCaseWithUsage) => void;
  onDeleted: () => void;
  onUsageLogged: (amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(useCase.budgetCap));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveBudget() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/use-cases/${useCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetCap: budgetInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update");
        return;
      }
      onUpdated({ ...useCase, budgetCap: data.budgetCap });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    setBusy(true);
    try {
      const nextStatus = useCase.status === "paused" ? "active" : "paused";
      const res = await fetch(`/api/use-cases/${useCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) onUpdated({ ...useCase, status: data.status });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove use case "${useCase.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/use-cases/${useCase.id}`, { method: "DELETE" });
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
        body: JSON.stringify({ userId: useCase.owner.id, useCaseId: useCase.id, amount, note }),
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
        <div className="font-medium text-slate-800">{useCase.name}</div>
        {useCase.description && <div className="text-xs text-slate-400">{useCase.description}</div>}
      </td>
      <td className="px-4 py-3 text-slate-600">
        {owners.find((o) => o.id === useCase.owner.id)?.name ?? useCase.owner.name}
      </td>
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
            <BudgetBar spent={useCase.spent} budget={useCase.budgetCap} />
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
            useCase.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
          }`}
        >
          {useCase.status === "paused" ? "Paused" : "Active"}
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
