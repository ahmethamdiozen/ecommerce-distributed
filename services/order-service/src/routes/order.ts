import { Router, Request, Response } from "express";
import { createOrder, getOrders, getStock, setStock } from "../services/orderService";
import { get } from "node:http";

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

// Get order history from PostgreSQL 
router.get("/", async (req: Request, res: Response) => {
    const result = await getOrders();
    res.status(200).json(result);
})

// Get current stock from Redis
router.get("/stock/:productId", async (req: Request, res: Response) => {
    const productId = req.params.productId as string;
    const result = await getStock(productId);
    res.status(200).json(result);
})

// Set stock in Redis (for testing purposes)
router.post("/stock/productId", async (req: Request, res: Response) => {
    const productId = req.params.productId as string;
    const { quantity } = req.body;
    const result = await setStock(productId, quantity);
    res.status(200).json(result);
})


export default router;