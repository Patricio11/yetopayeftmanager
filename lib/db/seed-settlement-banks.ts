import { db } from "./index";
import { settlementBanks } from "./schema";

const SA_BANKS = [
  { bankName: "ABSA", code: "absa", color: "#E30613", branchCode: "632005", displayOrder: 1 },
  { bankName: "African Bank", code: "african_bank", color: "#1B2A4A", branchCode: "430000", displayOrder: 2 },
  { bankName: "Bidvest Bank", code: "bidvest", color: "#2D1B69", branchCode: "462005", displayOrder: 3 },
  { bankName: "Capitec Bank", code: "capitec", color: "#0066B3", branchCode: "470010", displayOrder: 4 },
  { bankName: "Discovery Bank", code: "discovery", color: "#E87722", branchCode: "679000", displayOrder: 5 },
  { bankName: "First National Bank", code: "fnb", color: "#007DC5", branchCode: "250655", displayOrder: 6 },
  { bankName: "Investec", code: "investec", color: "#3D3D3D", branchCode: "580105", displayOrder: 7 },
  { bankName: "Nedbank", code: "nedbank", color: "#007A4D", branchCode: "198765", displayOrder: 8 },
  { bankName: "Standard Bank", code: "standardbank", color: "#0033A1", branchCode: "051001", displayOrder: 9 },
  { bankName: "TymeBank", code: "tymebank", color: "#FFD100", branchCode: "678910", displayOrder: 10 },
  { bankName: "Bank Zero", code: "bankzero", color: "#00D4AA", branchCode: "888000", displayOrder: 11 },
  { bankName: "Sasfin Bank", code: "sasfin", color: "#003366", branchCode: "683000", displayOrder: 12 },
  { bankName: "Grindrod Bank", code: "grindrod", color: "#004B87", branchCode: "584000", displayOrder: 13 },
  { bankName: "Old Mutual", code: "old_mutual", color: "#00685E", branchCode: "462005", displayOrder: 14 },
];

async function seedSettlementBanks() {
  console.log("🏦 Seeding settlement banks...");

  for (const bank of SA_BANKS) {
    await db
      .insert(settlementBanks)
      .values({ ...bank, enabled: true })
      .onConflictDoUpdate({
        target: settlementBanks.code,
        set: {
          bankName: bank.bankName,
          color: bank.color,
          branchCode: bank.branchCode,
          displayOrder: bank.displayOrder,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`✅ Seeded ${SA_BANKS.length} settlement banks`);
}

seedSettlementBanks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error seeding settlement banks:", err);
    process.exit(1);
  });
