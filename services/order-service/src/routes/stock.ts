import { Router, Response } from "express";
import { getStock } from "../services/orderService";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Read-only. Stock is owned by inventory-service; mutate it there.
router.get("/:productId", authenticate, async (req: AuthRequest, res: Response) => {
    const result = await getStock(req.params.productId);
    res.status(200).json(result);
});

export default router;
