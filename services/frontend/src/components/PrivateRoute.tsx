import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="loading">Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
};

export default PrivateRoute;
