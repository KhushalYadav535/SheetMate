import prisma from './src/lib/db';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  const ws = await prisma.generatedWorksheet.findUnique({
    where: { id: 'ea6dcaf2-7751-43ec-9c59-f72b8d18a44f' }
  });
  if (!ws) {
    console.error("Worksheet not found!");
    return;
  }
  console.log("Worksheet Subject:", ws.subject);
  console.log("Worksheet Topic:", ws.topic);
  console.log("Worksheet Score:", ws.score);
  console.log("Attempts History:");
  console.log(ws.attemptsJson);
}

inspect().finally(() => prisma.$disconnect());
