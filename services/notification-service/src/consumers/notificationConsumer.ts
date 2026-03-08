import amqp from "amqplib"

export const startNotificationConsumer = async (): Promise<void> => {
    const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672"
    );
    const channel = await connection.createChannel();
    await channel.assertQueue("notification-queue", { durable: true });
    channel.prefetch(1);

    console.log("Notification service started listening");

    channel.consume("notification-queue", async (msg) => {
        if (!msg) return;

        const task = JSON.parse(msg.content.toString());
        console.log("Notification task taken", task);

        try {
            // SendGrid/Twilio call would be here IRL.
            await simulateSendEmail(task);
            channel.ack(msg);
            console.log(`Notification sent -> User: ${task.userId}`);
        } catch (error) {
            console.error("Notification couldn't send, requeuing")
            channel.nack(msg, false, true);
        }
    });
};

const simulateSendEmail = async (task: any): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Email sent -> ${task.userId}: Order has been placed (${task.orderId})`)
};