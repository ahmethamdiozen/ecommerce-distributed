import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_dev";

export interface AuthRequest extends Request {
    user?: { userId: number; email: string; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }
    try {
        req.user = jwt.verify(authHeader.split(" ")[1], ACCESS_SECRET) as AuthRequest["user"];
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
    authenticate(req, res, () => {
        if (req.user?.role !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        next();
    });
};
