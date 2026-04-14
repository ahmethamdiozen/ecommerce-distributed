import { consumer } from "../config/kafka";
import { prisma } from "../config/database";

interface OrderEventPayload {
    event: string;
    orderId: string;
    userId: string;
    items?: { productId: string; quantity: number }[];
    productId?: string;
    quantity?: number;
}

export const startOrderConsumer = async (): Promise<void> => {
    await consumer.subscribe({ topic: "order-created", fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;

            const event = JSON.parse(message.value.toString()) as OrderEventPayload;
            console.log("New order event received", event);

            const items = event.items ?? (event.productId && event.quantity
                ? [{ productId: event.productId, quantity: event.quantity }]
                : []);

            try {
                for (const item of items) {
                    await prisma.orderEvent.create({
                        data: {
                            orderId: event.orderId,
                            userId: event.userId,
                            productId: item.productId,
                            quantity: item.quantity,
                            eventType: event.event,
                        },
                    });
                }
                console.log(`DB written -> Order: ${event.orderId}, ${items.length} item(s)`);
            } catch (err) {
                console.error("DB write error:", err);
            }
        },
    });
};
