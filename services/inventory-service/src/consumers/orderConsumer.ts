import { consumer } from "../config/kafka";

export const startOrderConsumer = async (): Promise<void> => {
    await consumer.subscribe({
        topic: "order-created",
        fromBeginning: true
    });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;

            const event = JSON.parse(message.value.toString());
    
            console.log(" New order placed", event);
            console.log(` Stock updating -> Product: ${event.productId}, Quantity: ${event.quantity}`)
        },
    });
};