import redis from "../config/redis"
import { producer } from "../config/kafka"

const LOCK_TTL = 5000;

export const createOrder = async (
    userId: string,
    productId: string,
    quantity: number
): Promise<{ success: boolean; message: string; orderId?: string}> => {
    const lockKey = `lock:product:${productId}`;
    const orderId = `order:${userId}:${Date.now()}`;

    // 1. Idempotency check
    const alreadyProcessed = await redis.get(`idempotency:${orderId}`);
    if (alreadyProcessed) {
        return { success: false, message: "This order already processed"};
    }

    // 2. Get distributed lock
    const lock = await redis.set(lockKey, orderId, "PX", LOCK_TTL, "NX");
    if (!lock) {
        return { success: false, message: "The product is in process, try again"};
    }

    try {
        // 3. Stock check 
        const stock = await redis.get(`stock:${productId}`);
        const stockCount = parseInt(stock || "0");

        console.log('Stock:', stock);
        console.log('StockCount:', stockCount);
        console.log('QuantityCount:', quantity);
        console.log('ProductId:', productId);

        if (stockCount < quantity) {
            return { success: false, message: "Insufficent stock"}
        }

        // 4. Reduce stock
        await redis.decrby(`stock:${productId}`, quantity);

        // 5.  Send event to Kafka
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
        await redis.set(`idempotency:${orderId}`, "processed", "EX", 86400);
        
        return { success: true, message: "Order created", orderId};

    } finally {
        // 7. Release lock every situation
        const currentLock = await redis.get(lockKey);
        if (currentLock === orderId) {
            await redis.del(lockKey);
        }
    }
};