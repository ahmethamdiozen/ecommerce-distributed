import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setLoading(true);

        try {
            if (mode === "login") {
                await login(email, password);
            } else {
                await register(email, password);
            }
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-box">
                <h1>🛒 E-Commerce</h1>
                <p className="login-subtitle">Distributed Order Management</p>

                <div className="login-tabs">
                    <button
                        className={mode === "login" ? "active" : ""}
                        onClick={() => setMode("login")}
                    >
                        Login
                    </button>
                    <button
                        className={mode === "register" ? "active" : ""}
                        onClick={() => setMode("register")}
                    >
                        Register
                    </button>
                </div>

                <div className="login-form">
                    <div className="field">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSubmit()}
                        />
                    </div>
                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSubmit()}
                        />
                    </div>

                    {error && <div className="status error">❌ {error}</div>}

                    <button
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
