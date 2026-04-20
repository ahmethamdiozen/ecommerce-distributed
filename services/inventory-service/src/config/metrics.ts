import { Registry, collectDefaultMetrics, Counter } from "prom-client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const inventoryEventCounter = new Counter({
    name: "inventory_events_total",
    help: "Total inventory events processed",
    labelNames: ["status"],
    registers: [register],
});

export const productOpsCounter = new Counter({
    name: "product_operations_total",
    help: "Product CRUD operations",
    labelNames: ["operation", "status"],
    registers: [register],
});
