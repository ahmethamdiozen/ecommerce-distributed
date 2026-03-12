import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import OrderForm from "./components/OrderForm";
import OrderList from "./components/OrderList";
import StockPanel from "./components/StockPanel";
import "./App.css";

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [refresh, setRefresh] = useState(0);

    const handleOrderCreated = () => {
        setRefresh(prev => prev + 1);
    };

    return (
        <div className="app">
            <header>
                <div>
                    <h1>🛒 Distributed E-Commerce Dashboard</h1>
                    <p>Real-time order & inventory management</p>
                </div>
                <div className="header-user">
                    <span>👤 {user?.email}</span>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
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
};

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
