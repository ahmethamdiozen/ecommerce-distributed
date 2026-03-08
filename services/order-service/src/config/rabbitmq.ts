import amqp from "amqplib"


let channel: amqp.Channel;

export const connectRabbitMQ = async (): Promise<void> => {
    const connection = await amqp.connect("amqp://admin:admin123@localhost:5672");
    channel = await connection.createChannel();

    await channel.assertQueue("notification-queue", { durable: true });

    console.log("RabbitMQ connection established");
};

export const publishToQueue = async (queue: string, message: object): Promise<void> => {
    channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
    );
};