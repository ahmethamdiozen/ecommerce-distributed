import { startNotificationConsumer } from "./consumers/notificationConsumer";

const start = async(): Promise<void> => {
    await startNotificationConsumer();
};

start();

