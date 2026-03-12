import { Registry, collectDefaultMetrics, Counter, Histogram } from "prom-client";

export const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop lag etc.)
collectDefaultMetrics({ register });

// Total order attempts
export const orderCount = new Counter({
    name: "order_total",
    help: "Total number of order attempts",
    labelNames: ["status"], // status: success | failed
    registers: [register],
});

// Order processing duration
export const orderDuration = new Histogram({
    name: "order_duration_seconds",
    help: "Order processing duration in seconds",
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
    registers: [register],
});

// Active redis locks
export const redisLockCounter = new Counter({
    name: "redis_lock_total",
    help: "Total Redis lock acquisitions",
    labelNames: ["result"], // result: acquires | failed
    registers: [register],
});