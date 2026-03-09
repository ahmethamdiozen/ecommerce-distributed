import { consumer } from "../config/kafka";
import { prisma } from "../config/database";

export const startOrderConsumer = async (): Promise<void> => {
    await consumer.subscribe({
        topic: "order-created",
        fromBeginning: true
    });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;

            const event = JSON.parse(message.value.toString());

            console.log("New order event received", event);

            try {
                await prisma.orderEvent.upsert({
                    where: { orderId: event.orderId },
                    update: {},
                    create: {
                        orderId: event.orderId,
                        userId: event.userId,
                        productId: event.productId,
                        quantity: event.quantity,
                        eventType: event.event
                    }
                });
                console.log(`DB written -> Order: ${event.orderId}, Product: ${event.productId}, Qty: ${event.quantity}`);
            } catch (err) {
                console.error("DB write error:", err);
            }
        },
    });
};
