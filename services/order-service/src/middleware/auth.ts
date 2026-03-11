import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_dev";

export interface AuthRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: string;
    };
}

// Verify JWT access token on every protected route
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    // Token must be in "Bearer <token>" format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, ACCESS_SECRET) as AuthRequest["user"];
        req.user = payload;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};