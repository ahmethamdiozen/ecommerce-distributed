import express from "express";
import { connectConsumer } from "./config/kafka";
import { startOrderConsumer } from "./consumers/orderConsumer";
import { initDB } from "./config/database";
import { register } from "./config/metrics";

const app = express();
const PORT = 3002;

// Prometheus scrape endpoint
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

app.listen(PORT, () => {
    console.log(`Inventory service metrics on ${PORT} port`);
});

const start = async (): Promise<void> => {
    await initDB();
    await connectConsumer();
    await startOrderConsumer();
    console.log("Inventory service started listening");
};

start();
