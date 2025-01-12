import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log("⏳ Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("✅ Migrations completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  await sql.end();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
}); 