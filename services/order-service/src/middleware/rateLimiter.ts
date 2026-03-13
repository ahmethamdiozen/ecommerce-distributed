import { Response, NextFunction } from "express";
import redis from "../config/redis";
import { AuthRequest } from "./auth";
import { maxHeaderSize } from "node:http";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export const rateLimiter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> =>{
    // Use userId from JWT token as the rate limit key
    const userId = req.user?.userId;

    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const key = `ratelimit:${userId}`;

    // Increment request count
    const count = await redis.incr(key);

    // Set TTL only on first request in the window
    if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
    }

    // Attach rate limit headers so client knows their status
    const ttl = await redis.ttl(key);
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - count));
    res.setHeader("X-RateLimit-Reset", ttl);

    if (count > MAX_REQUESTS) {
        res.status(429).json({
            error: "Too many requests, please try again later",
            retryAfter: ttl
        });
        return;
    }
    next();
};

