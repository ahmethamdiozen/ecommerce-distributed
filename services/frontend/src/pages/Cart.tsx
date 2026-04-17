import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart";

const Cart = () => {
    const { items, remove, setQuantity, total, clear } = useCart();
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="cart empty">
                <h2>Your cart is empty</h2>
                <Link to="/">Browse products</Link>
            </div>
        );
    }

    return (
        <div className="cart">
            <h2>Cart</h2>
            <ul className="cart-items">
                {items.map(i => (
                    <li key={i.productId} className="cart-item">
                        {i.imageUrl && <img src={i.imageUrl} alt={i.name} />}
                        <div className="cart-item-info">
                            <Link to={`/product/${i.productId}`}><strong>{i.name}</strong></Link>
                            <div>${i.price.toFixed(2)}</div>
                        </div>
                        <input
                            type="number"
                            min={1}
                            max={i.stock}
                            value={i.quantity}
                            onChange={e => setQuantity(i.productId, Number(e.target.value))}
                        />
                        <div className="line-total">${(i.price * i.quantity).toFixed(2)}</div>
                        <button onClick={() => remove(i.productId)}>Remove</button>
                    </li>
                ))}
            </ul>
            <div className="cart-summary">
                <div>Total: <strong>${total.toFixed(2)}</strong></div>
                <div className="cart-actions">
                    <button onClick={clear}>Clear</button>
                    <button className="primary" onClick={() => navigate("/checkout")}>Checkout</button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
