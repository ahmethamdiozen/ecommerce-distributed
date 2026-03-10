import { useState } from "react";
import OrderForm from "./components/OrderForm";
import OrderList from "./components/OrderList";
import StockPanel from "./components/StockPanel";
import "./App.css";

function App() {
    const [refresh, setRefresh] = useState(0);

    const handleOrderCreated = () => {
        // Trigger refresh on all components after new order
        setRefresh(prev => prev + 1);
    };

    return (
        <div className="app">
            <header>
                <h1>🛒 Distributed E-Commerce Dashboard</h1>
                <p>Real-time order & inventory management</p>
            </header>
            <main>
                <div className="left-panel">
                    <StockPanel refresh={refresh} />
                    <OrderForm onOrderCreated={handleOrderCreated} />
                </div>
                <div className="right-panel">
                    <OrderList refresh={refresh} />
                </div>
            </main>
        </div>
    );
}

export default App;