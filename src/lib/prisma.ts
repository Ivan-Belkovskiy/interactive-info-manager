import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { writeFile, writeFileSync } from "fs";
import path from "path";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClientSingleton = () => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const adapter = new PrismaPg(pool);

    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;