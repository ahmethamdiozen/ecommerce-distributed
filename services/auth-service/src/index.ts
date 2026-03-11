import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { initDB } from "./config/database";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

const start = async (): Promise<void> => {
    await initDB();
    app.listen(PORT, () => {
        console.log(`Auth service runs on ${PORT} port`);
    });
};

start();