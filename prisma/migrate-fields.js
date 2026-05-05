// One-time migration: copy service → serviceSummary before dropping old columns
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if old columns still exist
  try {
    const suppliers = await prisma.$queryRaw`
      SELECT id, "service", "eventDate" FROM "Supplier"
      WHERE "service" IS NOT NULL OR "eventDate" IS NOT NULL
      LIMIT 1
    `;

    if (suppliers.length > 0) {
      console.log('Migrating service → serviceSummary...');
      await prisma.$executeRaw`
        UPDATE "Supplier"
        SET "serviceSummary" = "service"
        WHERE "service" IS NOT NULL AND ("serviceSummary" IS NULL OR "serviceSummary" = '')
      `;
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as n FROM "Supplier" WHERE "serviceSummary" IS NOT NULL
      `;
      console.log(`Migration done. ${count[0].n} suppliers with serviceSummary.`);
    } else {
      console.log('No data to migrate.');
    }
  } catch (e) {
    // Columns already dropped — nothing to do
    if (e.message.includes('column') && e.message.includes('does not exist')) {
      console.log('Old columns already removed, skipping migration.');
    } else {
      throw e;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error('Migration error:', e); process.exit(1); });
