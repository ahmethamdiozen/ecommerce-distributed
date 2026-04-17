import { useEffect, useState } from "react";
import api from "../config/axios";
import { ORDER_URL } from "../config/api";

interface Order {
    id: number;
    orderId: string;
    userId: string;
    productId: string;
    quantity: number;
    eventType: string;
    createdAt: string;
}

interface OrderListProps {
    refresh: number;
}

const OrderList = ({ refresh }: OrderListProps) => {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const res = await api.get(`${ORDER_URL}/orders`);
            if (!cancelled) setOrders(res.data.orders);
        };
        run();
        const interval = setInterval(run, 3000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [refresh]);

    return (
        <div className="panel">
            <h2>Order History ({orders.length})</h2>
            <div className="order-list">
                {orders.map(order => (
                    <div key={order.id} className="order-item">
                        <div className="order-header">
                            <span className="order-id">{order.orderId}</span>
                            <span className="order-date">
                                {new Date(order.createdAt).toLocaleString()}
                            </span>
                        </div>
                        <div className="order-details">
                            <span>{order.userId}</span>
                            <span>{order.productId}</span>
                            <span>x{order.quantity}</span>
                            <span className="event-type">{order.eventType}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderList;
