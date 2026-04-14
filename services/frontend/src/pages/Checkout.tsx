import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../config/axios";
import { ORDER_URL } from "../config/api";
import { useCart } from "../context/CartContext";

const Checkout = () => {
    const { items, total, clear } = useCart();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<string | null>(null);

    const submit = async () => {
        setError("");
        setSubmitting(true);
        try {
            const payload = {
                items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            };
            const res = await api.post(`${ORDER_URL}/orders`, payload);
            setSuccess(res.data.orderId || "ok");
            clear();
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || "Order failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="checkout-success">
                <h2>✅ Order placed</h2>
                <p>Order ID: <code>{success}</code></p>
                <Link to="/">Continue shopping</Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="checkout">
                <p>Cart is empty.</p>
                <Link to="/">Browse products</Link>
            </div>
        );
    }

    return (
        <div className="checkout">
            <h2>Checkout</h2>
            <ul className="checkout-items">
                {items.map(i => (
                    <li key={i.productId}>
                        {i.name} × {i.quantity} — ${(i.price * i.quantity).toFixed(2)}
                    </li>
                ))}
            </ul>
            <div className="total">Total: <strong>${total.toFixed(2)}</strong></div>
            {error && <div className="error">{error}</div>}
            <button className="primary" disabled={submitting} onClick={submit}>
                {submitting ? "Placing order..." : "Place Order"}
            </button>
        </div>
    );
};

export default Checkout;
