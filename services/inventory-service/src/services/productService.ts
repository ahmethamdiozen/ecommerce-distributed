import { prisma } from "../config/database";
import redis from "../config/redis";
import { deleteImageByUrl } from "../config/minio";

const stockKey = (id: string) => `stock:${id}`;

export const listProducts = async (opts: { tag?: string; search?: string }) => {
    const where: any = {};
    if (opts.tag) where.tags = { has: opts.tag };
    if (opts.search) where.name = { contains: opts.search, mode: "insensitive" };
    return prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
};

export const getProduct = (id: string) => prisma.product.findUnique({ where: { id } });

export const createProduct = async (data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    tags?: string[];
}) => {
    const product = await prisma.product.create({
        data: {
            name: data.name,
            description: data.description ?? "",
            price: data.price,
            stock: data.stock,
            imageUrl: data.imageUrl ?? "",
            tags: data.tags ?? [],
        },
    });
    await redis.set(stockKey(product.id), product.stock);
    return product;
};

export const updateProduct = async (
    id: string,
    data: Partial<{ name: string; description: string; price: number; stock: number; imageUrl: string; tags: string[] }>,
    oldImageToReplace?: string,
) => {
    const product = await prisma.product.update({ where: { id }, data });
    if (data.stock !== undefined) {
        await redis.set(stockKey(product.id), product.stock);
    }
    if (oldImageToReplace) {
        await deleteImageByUrl(oldImageToReplace);
    }
    return product;
};

export const deleteProduct = async (id: string) => {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return null;
    await prisma.product.delete({ where: { id } });
    await redis.del(stockKey(id));
    if (product.imageUrl) await deleteImageByUrl(product.imageUrl);
    return product;
};
