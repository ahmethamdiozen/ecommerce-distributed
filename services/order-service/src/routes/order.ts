import { Router, Request, Response } from "express";
import { createOrder, getOrders } from "../services/orderService";

const router = Router();

// Get order history from PostgreSQL
router.get("/", async (req: Request, res: Response) => {
    const result = await getOrders();
    res.status(200).json(result);
});

// Create a new order
router.post("/", async (req: Request, res: Response) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || !quantity) {
        res.status(400).json({ error: "userId, productId and quantity is required" });
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