const pg = require("pg");
const fs = require("fs");

const envPath = "c:\\Users\\Ayush Karan\\OneDrive\\Desktop\\sheetmate_project\\.env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const firstEq = trimmed.indexOf("=");
      if (firstEq !== -1) {
        const key = trimmed.slice(0, firstEq).trim();
        const val = trimmed.slice(firstEq + 1).trim().replace(/^['"]|['"]$/g, "");
        process.env[key] = val;
      }
    }
  }
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function main() {
  const res = await pool.query('SELECT id, topic, score, "attemptsJson" FROM "GeneratedWorksheet" WHERE "id" = \'ea6dcaf2-7751-43ec-9c59-f72b8d18a44f\'');
  console.log("=== Sorting Materials attempts ===");
  for (const row of res.rows) {
    console.log("ID:", row.id);
    console.log("Topic:", row.topic);
    console.log("Score:", row.score);
    console.log("Attempts:", JSON.stringify(JSON.parse(row.attemptsJson), null, 2));
    console.log("-----------------");
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
