import express from "express";
import cors from "cors"
import orderRouter from "./routes/order";
import stockRouter from "./routes/stock";
import { connectProducer } from "./config/kafka";
import { connectRabbitMQ } from "./config/rabbitmq";
import { register } from "./config/metrics"

const app = express();
const PORT = 3000;

app.use(cors())
app.use(express.json());
app.use("/orders", orderRouter);
app.use("/stock", stockRouter)

app.get("/health", (_req, res) => { res.json({ status: "ok", service: "order-service" }); });

app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

const start = async (): Promise<void> => {
    await connectProducer();
    await connectRabbitMQ();
    app.listen(PORT, () => {
        console.log(`Order service runs on ${PORT} port.`)
    });
};

start();
