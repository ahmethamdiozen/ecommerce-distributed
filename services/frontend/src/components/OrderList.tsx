import { useEffect, useState } from "react";
import axios from "axios";

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

    const fetchOrders = async () => {
        const res = await axios.get("http://localhost:3000/orders");
        setOrders(res.data.orders);
    };

    // Fetch on refresh trigger (new order placed)
    useEffect(() => {
        fetchOrders();
    }, [refresh]);

    // Poll every 3 seconds to catch async updates from Kafka/inventory
    useEffect(() => {
        const interval = setInterval(fetchOrders, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="panel">
            <h2>📋 Order History ({orders.length})</h2>
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
                            <span>👤 {order.userId}</span>
                            <span>📦 {order.productId}</span>
                            <span>🔢 x{order.quantity}</span>
                            <span className="event-type">{order.eventType}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderList;
