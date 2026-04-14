import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import Header from "./components/Header";
import LoginPage from "./pages/LoginPage";
import Storefront from "./pages/Storefront";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminPanel from "./pages/AdminPanel";
import "./App.css";

const Layout = ({ children }: { children: React.ReactNode }) => (
    <>
        <Header />
        <main className="content">{children}</main>
    </>
);

const App = () => (
    <AuthProvider>
        <CartProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Layout><Storefront /></Layout>} />
                    <Route path="/product/:id" element={<Layout><ProductDetail /></Layout>} />
                    <Route path="/cart" element={<Layout><Cart /></Layout>} />
                    <Route path="/checkout" element={
                        <PrivateRoute><Layout><Checkout /></Layout></PrivateRoute>
                    } />
                    <Route path="/admin" element={
                        <AdminRoute><Layout><AdminPanel /></Layout></AdminRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </CartProvider>
    </AuthProvider>
);

export default App;
