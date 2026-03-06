import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "order-service",
    brokers: ["localhost:9092"],
});

export const producer = kafka.producer();

export const connectProducer = async (): Promise<void> => {
    await producer.connect();
    console.log("Kafka producer connection established");
};

export default kafka;