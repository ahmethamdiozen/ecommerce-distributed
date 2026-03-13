import { Registry, collectDefaultMetrics, Counter } from "prom-client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const inventoryEventCounter = new Counter({
    name: "inventory_events_total",
    help: "Total inventory events processed",
    labelNames: ["status"], // status: success | failed
    registers: [register],
});
