import express from "express";
import orderRouter from "./routes/order";
import { connectProducer } from "./config/kafka";
import { connectRabbitMQ } from "./config/rabbitmq";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/orders", orderRouter);

const start = async (): Promise<void> => {
    await connectProducer();
    await connectRabbitMQ();
    app.listen(PORT, () => {
        console.log(`Order service runs on ${PORT} port.`)
    });
};

start();
