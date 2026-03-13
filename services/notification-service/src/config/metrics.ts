import { Registry, collectDefaultMetrics, Counter } from "prom-client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const notificationCounter = new Counter({
    name: "notifications_total",
    help: "Total notification attempts",
    labelNames: ["status"], // status: success | failed | dead
    registers: [register],
});
