import { Router, Request, Response } from "express";
import { createOrder } from "../services/orderService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || !quantity) {
        res.status(400).json({ error: "userId, productId and quantity is required"});
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