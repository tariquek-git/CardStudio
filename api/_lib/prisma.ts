import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Enable WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

let prisma: PrismaClient;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter } as any);
}

// Singleton: reuse across serverless invocations
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  const g = globalThis as any;
  if (!g.__prisma) g.__prisma = createPrismaClient();
  prisma = g.__prisma;
}

export { prisma };
