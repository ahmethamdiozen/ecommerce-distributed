import { connectConsumer } from "./config/kafka";
import { startOrderConsumer } from "./consumers/orderConsumer";
import { initDB } from "./config/database";

const start = async (): Promise<void> => {
    await initDB();
    await connectConsumer();
    await startOrderConsumer();
    console.log("Inventory service started listening");
};

start();
