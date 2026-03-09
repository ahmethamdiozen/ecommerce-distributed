import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async (): Promise<void> => {
    const connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672"
    );
    channel = await connection.createChannel();
    // Order service only publishes, queue is owned and asserted by notification-service
    console.log("RabbitMQ connection established");
};

export const publishToQueue = async (queue: string, message: object): Promise<void> => {
    channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
    );
};
