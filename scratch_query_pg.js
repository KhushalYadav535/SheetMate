const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables manually
const dotenvPath = "./.env";
if (fs.existsSync(dotenvPath)) {
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
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
});

async function run() {
  console.log("Connecting to PostgreSQL...");
  const res = await pool.query(
    'SELECT * FROM "GeneratedWorksheet" WHERE id = $1',
    ['ea6dcaf2-7751-43ec-9c59-f72b8d18a44f']
  );
  if (res.rows.length === 0) {
    console.error("Worksheet not found in Database!");
    return;
  }
  const ws = res.rows[0];
  console.log("=== WORKSHEET DETAILS ===");
  console.log("Subject:", ws.subject);
  console.log("Topic:", ws.topic);
  console.log("Score:", ws.score);
  console.log("\n=== CONTENT JSON ===");
  console.log(JSON.stringify(JSON.parse(ws.contentJson), null, 2));
}

run()
  .catch(err => console.error("Database query failed:", err))
  .finally(() => pool.end());
