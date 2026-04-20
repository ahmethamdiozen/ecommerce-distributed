import express from "express";
import cors from "cors";
import { connectConsumer } from "./config/kafka";
import { startOrderConsumer } from "./consumers/orderConsumer";
import { initDB } from "./config/database";
import { initBucket } from "./config/minio";
import { register } from "./config/metrics";
import productsRouter from "./routes/products";

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use("/products", productsRouter);

app.get("/health", (_req, res) => { res.json({ status: "ok", service: "inventory-service" }); });

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

const start = async (): Promise<void> => {
    await initDB();
    await initBucket();
    app.listen(PORT, () => {
        console.log(`Inventory service runs on ${PORT} port`);
    });
    await connectConsumer();
    await startOrderConsumer();
    console.log("Inventory service started listening");
};

start();
