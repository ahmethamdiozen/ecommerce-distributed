import Redis from "ioredis";

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: 6379,
});

redis.on("connect", () => {
    console.log("Redis connection established ");
});

redis.on("error", (err) => {
    console.error("Redis connection error", err)
});

export default redis;