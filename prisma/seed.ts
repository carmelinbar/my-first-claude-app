import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("Database already has data — skipping seed.");
    return;
  }

  const alice = await prisma.user.create({
    data: { name: "Alice Cohen", email: "alice@example.com", team: "Data", monthlyBudget: 100 },
  });
  const ben = await prisma.user.create({
    data: { name: "Ben Levi", email: "ben@example.com", team: "Engineering", monthlyBudget: 150 },
  });

  const summarizer = await prisma.useCase.create({
    data: {
      name: "Doc summarizer",
      description: "Summarizing internal reports",
      budgetCap: 60,
      ownerId: alice.id,
    },
  });
  const codeAssist = await prisma.useCase.create({
    data: {
      name: "Code assistant",
      description: "Pair-programming on internal tools",
      budgetCap: 120,
      ownerId: ben.id,
    },
  });

  await prisma.usageEntry.createMany({
    data: [
      { userId: alice.id, useCaseId: summarizer.id, amount: 42.5, note: "Weekly report batch" },
      { userId: ben.id, useCaseId: codeAssist.id, amount: 138, note: "Large refactor session" },
    ],
  });

  console.log("Seeded example users and use cases.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
