import { useState } from "react";
import axios from "axios";

interface OrderFormProps {
    onOrderCreated: () => void;
}

const PRODUCTS = ["product-1", "product-2", "product-3"];

const OrderForm = ({ onOrderCreated }: OrderFormProps) => {
    const [userId, setUserId] = useState("");
    const [productId, setProductId] = useState("product-1");
    const [quantity, setQuantity] = useState(1);
    const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!userId) return;
        setLoading(true);
        setStatus(null);

        try {
            const res = await axios.post("http://localhost:3000/orders", {
                userId,
                productId,
                quantity
            });
            setStatus({ success: true, message: res.data.message });
            onOrderCreated();
        } catch (err: any) {
            setStatus({ success: false, message: err.response?.data?.error || "Order failed" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel">
            <h2>🧾 Create Order</h2>
            <div className="form">
                <div className="field">
                    <label>User ID</label>
                    <input
                        type="text"
                        placeholder="e.g. ahmet"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                    />
                </div>
                <div className="field">
                    <label>Product</label>
                    <select value={productId} onChange={e => setProductId(e.target.value)}>
                        {PRODUCTS.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label>Quantity</label>
                    <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                    />
                </div>
                <button onClick={handleSubmit} disabled={loading} className="submit-btn">
                    {loading ? "Processing..." : "Place Order"}
                </button>
                {status && (
                    <div className={`status ${status.success ? "success" : "error"}`}>
                        {status.success ? "✅" : "❌"} {status.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderForm;
