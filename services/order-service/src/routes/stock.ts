import { Router, Request, Response } from "express";
import { getStock, setStock } from "../services/orderService";

const router = Router();

// Get current stock from Redis
router.get("/:productId", async (req: Request, res: Response) => {
    const productId = req.params.productId as string;
    const result = await getStock(productId);
    res.status(200).json(result);
});

// Set stock in Redis (for testing purposes)
router.post("/:productId", async (req: Request, res: Response) => {
    const productId = req.params.productId as string;
    const { quantity } = req.body;
    const result = await setStock(productId, quantity);
    res.status(200).json(result);
});

export default router;