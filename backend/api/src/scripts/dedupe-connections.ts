import { prisma } from "../database/index.js";

async function run() {
  console.log("Starting connection deduplication migration...");
  
  // Find all pairs that have duplicates (A, B) and (B, A)
  const connections = await prisma.connection.findMany();
  
  const groups = new Map<string, typeof connections>();
  for (const conn of connections) {
    const [id1, id2] = conn.actor1Id < conn.actor2Id 
      ? [conn.actor1Id, conn.actor2Id]
      : [conn.actor2Id, conn.actor1Id];
      
    const key = `${id1}:${id2}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(conn);
  }
  
  let deletedCount = 0;
  
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(`Found duplicate connections for pair ${key}. Total: ${group.length}`);
      
      // Keep the oldest one based on createdAt
      const sorted = group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`Keeping connection ${toKeep.id} (Status: ${toKeep.status})`);
      
      for (const conn of toDelete) {
        console.log(`Deleting duplicate connection ${conn.id} (Status: ${conn.status})`);
        await prisma.connection.delete({ where: { id: conn.id } });
        deletedCount++;
      }
    }
  }
  
  console.log(`Migration complete. Deleted ${deletedCount} duplicate connection rows.`);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
