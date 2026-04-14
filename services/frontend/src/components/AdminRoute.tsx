import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== "admin") return <Navigate to="/" replace />;
    return <>{children}</>;
};

export default AdminRoute;
