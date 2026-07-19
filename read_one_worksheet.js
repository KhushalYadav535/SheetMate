const fs = require("fs");

// Load .env
const dotenvPath = "c:\\Users\\Ayush Karan\\OneDrive\\Desktop\\sheetmate_project\\.env";
const envContent = fs.readFileSync(dotenvPath, "utf8");
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const firstEq = trimmed.indexOf("=");
    if (firstEq !== -1) {
      const key = trimmed.slice(0, firstEq).trim();
      const val = trimmed.slice(firstEq + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  }
});

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const w = await prisma.generatedWorksheet.findUnique({
    where: { id: 'f5e113a9-980e-41b5-aae4-809446dc7822' }
  });
  console.log(JSON.stringify(w, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect().then(() => pool.end()));
