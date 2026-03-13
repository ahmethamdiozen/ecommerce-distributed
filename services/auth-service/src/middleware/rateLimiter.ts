import { Request, Response, NextFunction } from "express";
import { machine } from "node:os";
import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL || "redis://redis:6379" });
redis.connect();

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 5; 

export const authRateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Rate limit by IP + email combination to prevent brute force
    const ip = req.ip;
    const email = req.body.email || "unknown";
    const key = `ratelimit:auth${ip}:${email}`;

    const count = await redis.incr(key);

    if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_ATTEMPTS) {
        const ttl = await redis.ttl(key);
        res.status(429).json({
            error: "Too many login attempts, please try again later",
            retryAfter: ttl
        });
        return;
    }
    next();
};