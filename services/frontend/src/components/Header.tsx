import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const Header = () => {
    const { user, logout } = useAuth();
    const { count } = useCart();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <header className="site-header">
            <div className="brand">
                <Link to="/">🛒 Shop</Link>
            </div>
            <nav className="nav">
                <Link to="/">Products</Link>
                <Link to="/cart">Cart ({count})</Link>
                {user?.role === "admin" && <Link to="/admin">Admin</Link>}
                {user ? (
                    <>
                        <span className="user-email">{user.email}</span>
                        <button onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <Link to="/login">Login</Link>
                )}
            </nav>
        </header>
    );
};

export default Header;
