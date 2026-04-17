/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem, Product } from "../types";

const STORAGE_KEY = "cart";

interface CartContextType {
    items: CartItem[];
    add: (product: Product, quantity?: number) => void;
    remove: (productId: string) => void;
    setQuantity: (productId: string, quantity: number) => void;
    clear: () => void;
    total: number;
    count: number;
}

export const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as CartItem[]) : [];
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    const add = (product: Product, quantity = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                const newQty = Math.min(existing.quantity + quantity, product.stock);
                return prev.map(i => i.productId === product.id ? { ...i, quantity: newQty, stock: product.stock } : i);
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: Math.min(quantity, product.stock),
                stock: product.stock,
            }];
        });
    };

    const remove = (productId: string) => {
        setItems(prev => prev.filter(i => i.productId !== productId));
    };

    const setQuantity = (productId: string, quantity: number) => {
        setItems(prev => prev.map(i => {
            if (i.productId !== productId) return i;
            const q = Math.max(1, Math.min(quantity, i.stock));
            return { ...i, quantity: q };
        }));
    };

    const clear = () => setItems([]);

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{ items, add, remove, setQuantity, clear, total, count }}>
            {children}
        </CartContext.Provider>
    );
};
