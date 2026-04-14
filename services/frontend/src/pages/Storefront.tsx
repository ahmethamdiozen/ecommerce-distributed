import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { INVENTORY_URL } from "../config/api";
import { useCart } from "../context/CartContext";
import type { Product } from "../types";

const Storefront = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const { add } = useCart();

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${INVENTORY_URL}/products`, {
                params: { search: search || undefined, tag: activeTag || undefined },
            });
            setProducts(res.data.products || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [activeTag]);

    const allTags = useMemo(() => {
        const set = new Set<string>();
        products.forEach(p => p.tags.forEach(t => set.add(t)));
        return Array.from(set).sort();
    }, [products]);

    return (
        <div className="storefront">
            <div className="filters">
                <input
                    type="search"
                    placeholder="Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && load()}
                />
                <button onClick={load}>Search</button>
                <div className="tags">
                    <button
                        className={!activeTag ? "tag active" : "tag"}
                        onClick={() => setActiveTag(null)}
                    >All</button>
                    {allTags.map(t => (
                        <button
                            key={t}
                            className={activeTag === t ? "tag active" : "tag"}
                            onClick={() => setActiveTag(t)}
                        >{t}</button>
                    ))}
                </div>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="product-grid">
                    {products.length === 0 && <p>No products found.</p>}
                    {products.map(p => (
                        <div key={p.id} className="product-card">
                            <Link to={`/product/${p.id}`}>
                                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <div className="no-image">No image</div>}
                                <h3>{p.name}</h3>
                            </Link>
                            <div className="price">${p.price.toFixed(2)}</div>
                            <div className="stock">{p.stock > 0 ? `In stock: ${p.stock}` : "Out of stock"}</div>
                            <button
                                disabled={p.stock <= 0}
                                onClick={() => add(p, 1)}
                            >Add to Cart</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Storefront;
