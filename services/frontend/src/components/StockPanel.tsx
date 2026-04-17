import { useEffect, useState } from "react";
import api from "../config/axios";
import { ORDER_URL } from "../config/api";

interface StockPanelProps {
    refresh: number;
}

const PRODUCTS = ["product-1", "product-2", "product-3"];

const StockPanel = ({ refresh }: StockPanelProps) => {
    const [stocks, setStocks] = useState<Record<string, number>>({});
    const [seedQty, setSeedQty] = useState(100);
    const [setValues, setSetValues] = useState<Record<string, string>>({});

    const fetchStocks = async () => {
        const results: Record<string, number> = {};
        for (const p of PRODUCTS) {
            const res = await api.get(`${ORDER_URL}/stock/${p}`);
            results[p] = res.data.stock;
        }
        setStocks(results);
    };

    const addStock = async (productId: string) => {
        const current = stocks[productId] || 0;
        const newQty = current + seedQty;
        await api.post(`${ORDER_URL}/stock/${productId}`, { quantity: newQty });
        fetchStocks();
    };

    const subtractStock = async (productId: string) => {
        const current = stocks[productId] || 0;
        const newQty = Math.max(0, current - seedQty);
        await api.post(`${ORDER_URL}/stock/${productId}`, { quantity: newQty });
        fetchStocks();
    };

    const setStockExact = async (productId: string) => {
        const raw = setValues[productId];
        if (raw === undefined || raw === "") return;
        const qty = Number(raw);
        await api.post(`${ORDER_URL}/stock/${productId}`, { quantity: qty });
        setSetValues(prev => ({ ...prev, [productId]: "" }));
        fetchStocks();
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchStocks(); }, [refresh]);

    const getStockColor = (stock: number) => {
        if (stock === 0) return "#ef4444";
        if (stock < 10) return "#f97316";
        return "#22c55e";
    };

    return (
        <div className="panel">
            <h2>Stock Levels</h2>

            <div className="seed-control">
                <label>Amount:</label>
                <input
                    type="number"
                    value={seedQty}
                    onChange={e => setSeedQty(Number(e.target.value))}
                    min={1}
                />
            </div>

            <div className="stock-list">
                {PRODUCTS.map(p => (
                    <div key={p} className="stock-item">
                        <div className="stock-info">
                            <span className="product-name">{p}</span>
                            <span className="stock-count" style={{ color: getStockColor(stocks[p] || 0) }}>
                                {stocks[p] ?? "---"}
                            </span>
                        </div>
                        <div className="stock-actions">
                            <button className="btn-subtract" onClick={() => subtractStock(p)}>-{seedQty}</button>
                            <button className="btn-add" onClick={() => addStock(p)}>+{seedQty}</button>
                        </div>
                        <div className="stock-set">
                            <input
                                type="number"
                                placeholder="Set exact"
                                min={0}
                                value={setValues[p] ?? ""}
                                onChange={e => setSetValues(prev => ({ ...prev, [p]: e.target.value }))}
                            />
                            <button className="btn-set" onClick={() => setStockExact(p)}>Set</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockPanel;
