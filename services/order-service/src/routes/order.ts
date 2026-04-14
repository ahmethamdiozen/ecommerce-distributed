import { Router, Response } from "express";
import { createOrder, getOrders, OrderItem } from "../services/orderService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
    const result = await getOrders();
    res.status(200).json(result);
});

// userId comes from JWT, items[] from body: [{ productId, quantity }, ...]
router.post("/", authenticate, rateLimiter, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.email;
    const { items, productId, quantity } = req.body;

    let normalized: OrderItem[] = [];
    if (Array.isArray(items)) {
        normalized = items
            .filter(i => i && i.productId && i.quantity)
            .map(i => ({ productId: String(i.productId), quantity: Number(i.quantity) }));
    } else if (productId && quantity) {
        normalized = [{ productId: String(productId), quantity: Number(quantity) }];
    }

    if (!normalized.length) {
        res.status(400).json({ error: "items[] (or productId+quantity) required" });
        return;
    }

    const result = await createOrder(userId, normalized);
    res.status(result.success ? 201 : 400).json(result);
});

export default router;
