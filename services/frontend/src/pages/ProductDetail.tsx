import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { INVENTORY_URL } from "../config/api";
import { useCart } from "../context/CartContext";
import type { Product } from "../types";

const ProductDetail = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const { add } = useCart();

    useEffect(() => {
        if (!id) return;
        axios.get(`${INVENTORY_URL}/products/${id}`)
            .then(res => setProduct(res.data.product))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!product) return <div>Product not found. <Link to="/">Back</Link></div>;

    return (
        <div className="product-detail">
            <Link to="/" className="back">← Back</Link>
            <div className="detail-grid">
                <div className="detail-image">
                    {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} />
                        : <div className="no-image">No image</div>}
                </div>
                <div className="detail-info">
                    <h1>{product.name}</h1>
                    <div className="tags">
                        {product.tags.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                    <p className="description">{product.description || "No description."}</p>
                    <div className="price">${product.price.toFixed(2)}</div>
                    <div className="stock">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</div>
                    <div className="qty-row">
                        <input
                            type="number"
                            min={1}
                            max={product.stock}
                            value={quantity}
                            onChange={e => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
                        />
                        <button
                            disabled={product.stock <= 0}
                            onClick={() => add(product, quantity)}
                        >Add to Cart</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
