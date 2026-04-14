import { useEffect, useState } from "react";
import api from "../config/axios";
import { INVENTORY_URL } from "../config/api";
import type { Product } from "../types";

interface FormState {
    id?: string;
    name: string;
    description: string;
    price: string;
    stock: string;
    tags: string;
    imageFile: File | null;
    existingImage?: string;
}

const empty: FormState = {
    name: "", description: "", price: "", stock: "", tags: "", imageFile: null,
};

const AdminPanel = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [form, setForm] = useState<FormState>(empty);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = async () => {
        const res = await api.get(`${INVENTORY_URL}/products`);
        setProducts(res.data.products || []);
    };

    useEffect(() => { load(); }, []);

    const submit = async () => {
        setError("");
        if (!form.name || !form.price) {
            setError("Name and price are required");
            return;
        }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("name", form.name);
            fd.append("description", form.description);
            fd.append("price", form.price);
            fd.append("stock", form.stock || "0");
            fd.append("tags", form.tags);
            if (form.imageFile) fd.append("image", form.imageFile);

            if (form.id) {
                await api.put(`${INVENTORY_URL}/products/${form.id}`, fd);
            } else {
                await api.post(`${INVENTORY_URL}/products`, fd);
            }
            setForm(empty);
            await load();
        } catch (err: any) {
            setError(err.response?.data?.error || "Save failed");
        } finally {
            setBusy(false);
        }
    };

    const edit = (p: Product) => {
        setForm({
            id: p.id,
            name: p.name,
            description: p.description,
            price: String(p.price),
            stock: String(p.stock),
            tags: p.tags.join(", "),
            imageFile: null,
            existingImage: p.imageUrl,
        });
    };

    const del = async (id: string) => {
        if (!confirm("Delete this product?")) return;
        await api.delete(`${INVENTORY_URL}/products/${id}`);
        await load();
    };

    return (
        <div className="admin">
            <h2>Admin · Products</h2>

            <div className="admin-form">
                <h3>{form.id ? "Edit product" : "New product"}</h3>
                <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <input type="number" step="0.01" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                <input type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                <input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                <input type="file" accept="image/*" onChange={e => setForm({ ...form, imageFile: e.target.files?.[0] || null })} />
                {form.existingImage && !form.imageFile && (
                    <div className="current-image">
                        <small>Current:</small>
                        <img src={form.existingImage} alt="current" style={{ maxWidth: 120 }} />
                    </div>
                )}
                {error && <div className="error">{error}</div>}
                <div className="form-actions">
                    <button disabled={busy} onClick={submit}>{busy ? "Saving..." : (form.id ? "Update" : "Create")}</button>
                    {form.id && <button onClick={() => setForm(empty)}>Cancel</button>}
                </div>
            </div>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Tags</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: 60 }} /> : "—"}</td>
                            <td>{p.name}</td>
                            <td>${p.price.toFixed(2)}</td>
                            <td>{p.stock}</td>
                            <td>{p.tags.join(", ")}</td>
                            <td>
                                <button onClick={() => edit(p)}>Edit</button>
                                <button onClick={() => del(p.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminPanel;
