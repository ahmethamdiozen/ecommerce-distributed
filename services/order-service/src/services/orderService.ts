import redis from "../config/redis";
import { producer } from "../config/kafka";
import { publishToQueue } from "../config/rabbitmq";
import { PrismaClient } from "@prisma/client";
import { orderCounter, orderDuration, redisLockCounter } from "../config/metrics";

const prisma = new PrismaClient();
const LOCK_TTL = 5000;

export interface OrderItem {
    productId: string;
    quantity: number;
}

interface OrderResult {
    success: boolean;
    message: string;
    orderId?: string;
}

const releaseLocks = async (locks: { key: string; token: string }[]) => {
    for (const { key, token } of locks) {
        const cur = await redis.get(key);
        if (cur === token) await redis.del(key);
    }
};

export const createOrder = async (
    userId: string,
    items: OrderItem[]
): Promise<OrderResult> => {
    const end = orderDuration.startTimer();
    const orderId = `order:${userId}:${Date.now()}`;

    if (!items.length) {
        end();
        return { success: false, message: "No items in order" };
    }

    const already = await redis.get(`idempotency:${orderId}`);
    if (already) {
        orderCounter.inc({ status: "duplicate" });
        end();
        return { success: false, message: "This order already processed" };
    }

    // Sort by productId for consistent lock order — avoids deadlocks when two
    // orders touch overlapping product sets.
    const sorted = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
    const acquired: { key: string; token: string }[] = [];

    try {
        for (const item of sorted) {
            const key = `lock:product:${item.productId}`;
            const lock = await redis.set(key, orderId, "PX", LOCK_TTL, "NX");
            if (!lock) {
                redisLockCounter.inc({ result: "failed" });
                orderCounter.inc({ status: "failed" });
                return { success: false, message: `Product ${item.productId} is being processed, try again` };
            }
            redisLockCounter.inc({ result: "acquired" });
            acquired.push({ key, token: orderId });
        }

        for (const item of sorted) {
            const stock = parseInt((await redis.get(`stock:${item.productId}`)) || "0");
            if (stock < item.quantity) {
                orderCounter.inc({ status: "failed" });
                return { success: false, message: `Insufficient stock for ${item.productId}` };
            }
        }

        for (const item of sorted) {
            await redis.decrby(`stock:${item.productId}`, item.quantity);
        }

        await producer.send({
            topic: "order-created",
            messages: [{
                key: orderId,
                value: JSON.stringify({
                    event: "OrderCreated",
                    orderId,
                    userId,
                    items: sorted,
                    timestamp: new Date().toISOString(),
                }),
            }],
        });

        await publishToQueue("notification-queue", {
            type: "ORDER_CONFIRMATION",
            userId,
            orderId,
            items: sorted,
            timestamp: new Date().toISOString(),
        });

        await redis.set(`idempotency:${orderId}`, "processed", "EX", 86400);
        orderCounter.inc({ status: "success" });
        return { success: true, message: "Order created", orderId };

    } finally {
        end();
        await releaseLocks(acquired);
    }
};

export const getOrders = async () => {
    const orders = await prisma.orderEvent.findMany({ orderBy: { createdAt: "desc" } });
    return { success: true, orders };
};

export const getStock = async (productId: string) => {
    const stock = await redis.get(`stock:${productId}`);
    return { success: true, productId, stock: parseInt(stock || "0") };
};
