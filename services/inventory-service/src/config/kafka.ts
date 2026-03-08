import { Kafka } from "kafkajs"

const kafka = new Kafka({
    clientId: "inventory-service",
    brokers: ["localhost:9092"]
});

export const consumer = kafka.consumer({ groupId: "inventory-group" });

export const connectConsumer = async (): Promise<void> => {
    await consumer.connect();
    console.log("Kafka consumer connection established");
};

export default kafka;