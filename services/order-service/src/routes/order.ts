import { Router, Response } from "express";
import { createOrder, getOrders } from "../services/orderService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Get order history from postgre
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const result = await getOrders();
    res.status(200).json(result);
});

// Create order - authenticate first, then rate limit 
// userId comes from JWT token, not request body
router.post("/", authenticate, rateLimiter, async (req: AuthRequest, res: Response) => {
    const { productId, quantity } = req.body;
    const userId = req.user!.email;

    if (!productId || !quantity) {
        res.status(400).json({ error: "productId and quantity are required" });
        return;
    }

    const result = await createOrder(userId, productId, quantity);

    if (result.success) {
        res.status(201).json(result);
    } else {
        res.status(400).json(result);
    }
});

export default router;