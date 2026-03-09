import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const initDB = async (): Promise<void> => {
    await prisma.$connect();
    console.log("DB connected via Prisma");
};
