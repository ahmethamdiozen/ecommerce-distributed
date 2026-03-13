import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { initDB } from "./config/database";
import { register } from "./config/metrics";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

// Prometheus scrape endpoint
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

const start = async (): Promise<void> => {
    await initDB();
    app.listen(PORT, () => {
        console.log(`Auth service runs on ${PORT} port`);
    });
};

start();