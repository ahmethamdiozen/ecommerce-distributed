import express from "express";
import { startNotificationConsumer } from "./consumers/notificationConsumer";
import { register } from "./config/metrics";

const app = express();
const PORT = 3003;

app.get("/health", (_req, res) => { res.json({ status: "ok", service: "notification-service" }); });

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

app.listen(PORT, () => {
    console.log(`Notification service metrics on ${PORT} port`);
});

const start = async(): Promise<void> => {
    await startNotificationConsumer();
};

start();
