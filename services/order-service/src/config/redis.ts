import Redis from "ioredis";

const redis = new Redis({
    host: "localhost",
    port: 6379,
});

redis.on("connect", () => {
    console.log("Redis connection established ");
    redis.get('stock:product-1').then(val => {
    console.log('Test - stock:product-1:', val);
  });
});

redis.on("error", (err) => {
    console.error("Redis connection error", err)
});

export default redis;