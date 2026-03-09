import amqp, { Channel, Message } from "amqplib";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 10000, 20000]; // 5s, 10s, 20s - exponential backoff

const setupQueues = async (channel: Channel): Promise<void> => {
    // Dead Letter Queue - messages that exceed max retries land here for manual inspection
    await channel.assertQueue("notification-dlq", { durable: true });

    // Retry queue - failed messages wait here until TTL expires, then return to main queue
    // x-dead-letter-routing-key routes the message back to notification-queue after TTL
    await channel.assertQueue("notification-retry", {
        durable: true,
        arguments: {
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": "notification-queue"
        }
    });

    // Main queue - if a message is permanently rejected, route it to DLQ
    await channel.assertQueue("notification-queue", {
        durable: true,
        arguments: {
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": "notification-dlq"
        }
    });
};

// Extract retry count from message headers, default to 0 on first attempt
const getRetryCount = (msg: Message): number => {
    return (msg.properties.headers?.["x-retry-count"] as number) || 0;
};

const requeueWithDelay = async (
    channel: Channel,
    msg: Message,
    retryCount: number
): Promise<void> => {
    const delay = RETRY_DELAYS[retryCount - 1] || 20000;

    console.log(`Retry ${retryCount}/${MAX_RETRIES} -> will retry in ${delay / 1000}s`);

    // Publish to retry queue with per-message TTL
    // Once TTL expires, RabbitMQ automatically moves it back to notification-queue
    channel.publish("", "notification-retry", msg.content, {
        persistent: true,
        expiration: delay.toString(),
        headers: {
            ...msg.properties.headers,
            "x-retry-count": retryCount
        }
    });
};

export const startNotificationConsumer = async (): Promise<void> => {
    const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672"
    );
    const channel = await connection.createChannel();

    await setupQueues(channel);

    // Process one message at a time to avoid memory overload
    channel.prefetch(1);

    console.log("Notification service started listening");

    // DLQ consumer - log dead messages for manual inspection or alerting
    channel.consume("notification-dlq", (msg) => {
        if (!msg) return;
        const task = JSON.parse(msg.content.toString());
        console.error(`[DLQ] Message failed after ${MAX_RETRIES} attempts, requires manual review:`, task);
        channel.ack(msg);
    });

    // Main consumer - processes incoming notification tasks
    channel.consume("notification-queue", async (msg) => {
        if (!msg) return;

        const task = JSON.parse(msg.content.toString());
        const retryCount = getRetryCount(msg);

        console.log(`Notification task received (attempt: ${retryCount + 1}/${MAX_RETRIES + 1})`, task);

        try {
            await simulateSendEmail(task);
            channel.ack(msg);
            console.log(`Notification sent -> User: ${task.userId}`);
        } catch (error) {
            // Ack first to remove from queue, then decide where to route
            channel.ack(msg);

            if (retryCount < MAX_RETRIES) {
                // Still within retry limit, send to retry queue with delay
                await requeueWithDelay(channel, msg, retryCount + 1);
            } else {
                // Exceeded max retries, route to DLQ for manual handling
                console.error(`[FAILED] All ${MAX_RETRIES} retries exhausted, routing to DLQ:`, task);
                channel.publish("", "notification-dlq", msg.content, {
                    persistent: true,
                    headers: { ...msg.properties.headers, "x-retry-count": retryCount }
                });
            }
        }
    });
};

const simulateSendEmail = async (task: any): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate 40% failure rate to test retry and DLQ behavior
    if (Math.random() < 0.40) {
        throw new Error("Email service unavailable");
    }

    console.log(`Email sent -> ${task.userId}: Order has been placed (${task.orderId})`);
};
