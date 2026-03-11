import { Router, Request, Response } from "express";
import { createOrder, getOrders } from "../services/orderService";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Get order history from PostgreSQL
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    const result = await getOrders();
    res.status(200).json(result);
});

// Create a new order - userId comes from JWT token, not request body
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    const { productId, quantity } = req.body;
    const userId = req.user!.email; // Use email from token as userId

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