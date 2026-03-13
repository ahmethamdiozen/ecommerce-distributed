import { Registry, collectDefaultMetrics, Counter } from "prom-client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const authCounter = new Counter({
    name: "auth_requests_total",
    help: "Total auth requests",
    labelNames: ["action", "status"],
    registers: [register],
});
