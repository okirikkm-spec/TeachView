import { Navigate, Outlet } from "react-router-dom";
import { getToken, isTokenExpired, removeToken } from "../services/authApi";

export default function PrivateRoute() {
    const token = getToken();
    if (!token) return <Navigate to="/login" />;
    if (isTokenExpired(token)) {
        removeToken();
        return <Navigate to="/login" />;
    }
    return <Outlet />;
}
