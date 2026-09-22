import { prisma } from "@/lib/db";

export async function getUsersWithUsage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      usageEntries: { select: { amount: true } },
      useCases: { select: { id: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    team: u.team,
    monthlyBudget: u.monthlyBudget,
    status: u.status,
    useCaseCount: u.useCases.length,
    spent: u.usageEntries.reduce((sum, e) => sum + e.amount, 0),
  }));
}

export type UserWithUsage = Awaited<ReturnType<typeof getUsersWithUsage>>[number];

export async function getUseCasesWithUsage() {
  const useCases = await prisma.useCase.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      usageEntries: { select: { amount: true } },
      owner: { select: { id: true, name: true } },
    },
  });
  return useCases.map((uc) => ({
    id: uc.id,
    name: uc.name,
    description: uc.description,
    budgetCap: uc.budgetCap,
    status: uc.status,
    owner: uc.owner,
    spent: uc.usageEntries.reduce((sum, e) => sum + e.amount, 0),
  }));
}

export type UseCaseWithUsage = Awaited<ReturnType<typeof getUseCasesWithUsage>>[number];
