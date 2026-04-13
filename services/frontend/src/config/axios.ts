import axios from "axios";
import { AUTH_URL } from "./api";

const api = axios.create();

// Attach access token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If 401 received, try refreshing the access token once
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
                // No refresh token, force logout
                localStorage.clear();
                window.location.href = "/login";
                return Promise.reject(error);
            }

            try {
                const res = await axios.post(`${AUTH_URL}/auth/refresh`, { refreshToken });
                const newToken = res.data.accessToken;

                localStorage.setItem("accessToken", newToken);
                original.headers.Authorization = `Bearer ${newToken}`;

                return api(original); // Retry original request with new token
            } catch {
                // Refresh also failed, force logout
                localStorage.clear();
                window.location.href = "/login";
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
