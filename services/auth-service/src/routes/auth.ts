import { Router, Request, Response } from "express";
import { register, login, refresh, logout } from "../services/authService";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required"});
        return;
    }
    
    try {
        const result = await register(email, password);
        res.status(201).json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message});
    }
});

router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }

    try {
        const result = await login(email, password);
        res.status(200).json(result);
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
});

router.post("/refresh", async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        res.status(400).json({ error: "Refresh token is required" });
        return;
    }

    try {
        const result = await refresh(refreshToken);
        res.status(200).json(result);
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
});

router.post("/logout", async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        res.status(400).json({ error: "Refresh token is required" });
        return;
    }

    try {
        await logout(refreshToken);
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;