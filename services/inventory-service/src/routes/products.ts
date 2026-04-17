import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/auth";
import { uploadImage } from "../config/minio";
import {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
} from "../services/productService";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const parseTags = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
    if (typeof raw === "string" && raw.length > 0) {
        return raw.split(",").map(s => s.trim()).filter(Boolean);
    }
    return [];
};

const extOf = (mimetype: string, fallback = "bin") => {
    const map: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    };
    return map[mimetype] || fallback;
};

router.get("/", async (req: Request, res: Response) => {
    const products = await listProducts({
        tag: typeof req.query.tag === "string" ? req.query.tag : undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
    });
    res.json({ success: true, products });
});

router.get("/:id", async (req: Request, res: Response) => {
    const product = await getProduct(req.params.id as string);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    res.json({ success: true, product });
});

router.post("/", requireAdmin, upload.single("image"), async (req: Request, res: Response) => {
    try {
        const { name, description, price, stock, tags } = req.body;
        if (!name || price === undefined) {
            res.status(400).json({ error: "name and price are required" });
            return;
        }

        let imageUrl = "";
        if (req.file) {
            imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, extOf(req.file.mimetype));
        }

        const product = await createProduct({
            name,
            description,
            price: Number(price),
            stock: Number(stock || 0),
            imageUrl,
            tags: parseTags(tags),
        });
        res.status(201).json({ success: true, product });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Request failed";
        res.status(400).json({ error: msg });
    }
});

router.put("/:id", requireAdmin, upload.single("image"), async (req: Request, res: Response) => {
    try {
        const existing = await getProduct(req.params.id as string);
        if (!existing) {
            res.status(404).json({ error: "Product not found" });
            return;
        }

        const { name, description, price, stock, tags } = req.body;
        const data: Partial<{ name: string; description: string; price: number; stock: number; tags: string[]; imageUrl: string }> = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (price !== undefined) data.price = Number(price);
        if (stock !== undefined) data.stock = Number(stock);
        if (tags !== undefined) data.tags = parseTags(tags);

        let oldImage: string | undefined;
        if (req.file) {
            data.imageUrl = await uploadImage(req.file.buffer, req.file.mimetype, extOf(req.file.mimetype));
            oldImage = existing.imageUrl || undefined;
        }

        const product = await updateProduct(req.params.id as string, data, oldImage);
        res.json({ success: true, product });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Request failed";
        res.status(400).json({ error: msg });
    }
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
    const product = await deleteProduct(req.params.id as string);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    res.json({ success: true });
});

export default router;
