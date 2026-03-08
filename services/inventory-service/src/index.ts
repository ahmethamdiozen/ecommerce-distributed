import { connectConsumer } from "./config/kafka";
import { startOrderConsumer } from "./consumers/orderConsumer";

const start = async (): Promise<void> => {
    await connectConsumer();
    await startOrderConsumer();
    console.log(" Inventory service started listening");
};

start();