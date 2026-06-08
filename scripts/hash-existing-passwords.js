const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');
const process = require('process');

// Load environment variables from .env using Node.js built-in env loader
try {
  process.loadEnvFile();
} catch (err) {
  console.log("Note: Could not load .env file via process.loadEnvFile(). Environment variables must already be set.");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Connecting to PostgreSQL database...");
  console.log("Fetching student profiles...");
  
  const profiles = await prisma.studentProfile.findMany({});
  
  console.log(`Found ${profiles.length} student profile(s) in the database.`);
  
  let hashedCount = 0;
  
  for (const profile of profiles) {
    const isHashed = profile.password && (profile.password.startsWith("$2a$") || profile.password.startsWith("$2b$"));
    
    if (isHashed) {
      console.log(`- Profile "${profile.username || profile.name}" is already hashed. Skipping.`);
      continue;
    }
    
    console.log(`- Hashing password for profile "${profile.username || profile.name}"...`);
    const hashedPassword = await bcrypt.hash(profile.password || "", 10);
    
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        password: hashedPassword
      }
    });
    
    hashedCount++;
  }
  
  console.log(`Successfully completed! ${hashedCount} profile(s) were migrated to hashed passwords.`);

  // Cleanup connections
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error("Error executing script:", err);
  process.exit(1);
});
