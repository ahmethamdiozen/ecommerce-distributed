import redis from "../config/redis";
import { producer } from "../config/kafka";
import { publishToQueue } from "../config/rabbitmq";
import { PrismaClient } from "@prisma/client";
import { orderCounter, orderDuration, redisLockCounter } from "../config/metrics";

const prisma = new PrismaClient();
const LOCK_TTL = 5000;

export const createOrder = async (
    userId: string,
    productId: string,
    quantity: number
): Promise<{ success: boolean; message: string; orderId?: string }> => {
    const end = orderDuration.startTimer();
    const lockKey = `lock:product:${productId}`;
    const orderId = `order:${userId}:${Date.now()}`;

    // 1. Idempotency check - prevent duplicate order processing
    const alreadyProcessed = await redis.get(`idempotency:${orderId}`);
    if (alreadyProcessed) {
        orderCounter.inc({ status: "duplicate" });
        end();
        return { success: false, message: "This order already processed" };
    }

    // 2. Acquire distributed lock to prevent race conditions
    const lock = await redis.set(lockKey, orderId, "PX", LOCK_TTL, "NX");
    if (!lock) {
        redisLockCounter.inc({ result: "failed" });
        orderCounter.inc({ status: "failed" });
        end();
        return { success: false, message: "The product is in process, try again" };
    }

    redisLockCounter.inc({ result: "acquired" });

    try {
        // 3. Check current stock level
        const stock = await redis.get(`stock:${productId}`);
        const stockCount = parseInt(stock || "0");

        if (stockCount < quantity) {
            orderCounter.inc({ status: "failed" });
            return { success: false, message: "Insufficient stock" };
        }

        // 4. Atomically reduce stock
        await redis.decrby(`stock:${productId}`, quantity);

        // 5. Publish OrderCreated event to Kafka for inventory service
        await producer.send({
            topic: "order-created",
            messages: [
                {
                    key: orderId,
                    value: JSON.stringify({
                        event: "OrderCreated",
                        orderId,
                        userId,
                        productId,
                        quantity,
                        timestamp: new Date().toISOString(),
                    }),
                },
            ],
        });

        // 6. Publish notification task to RabbitMQ
        await publishToQueue("notification-queue", {
            type: "ORDER_CONFIRMATION",
            userId,
            orderId,
            productId,
            quantity,
            timestamp: new Date().toISOString(),
        });

        // 7. Mark order as processed for idempotency (TTL: 24h)
        await redis.set(`idempotency:${orderId}`, "processed", "EX", 86400);

        orderCounter.inc({ status: "success" });
        return { success: true, message: "Order created", orderId };

    } finally {
        end();
        // 8. Always release lock, verify ownership before deleting
        const currentLock = await redis.get(lockKey);
        if (currentLock === orderId) {
            await redis.del(lockKey);
        }
    }
};

// Fetch all order events from PostgreSQL
export const getOrders = async () => {
    const orders = await prisma.orderEvent.findMany({
        orderBy: { createdAt: "desc" }
    });
    return { success: true, orders };
};

// Get current stock level from Redis
export const getStock = async (productId: string) => {
    const stock = await redis.get(`stock:${productId}`);
    return { success: true, productId, stock: parseInt(stock || "0") };
};

// Set stock level in Redis (used for testing and seeding)
export const setStock = async (productId: string, quantity: number) => {
    await redis.set(`stock:${productId}`, quantity);
    return { success: true, productId, stock: quantity };
};