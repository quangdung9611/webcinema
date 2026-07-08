import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {

    const location = useLocation();

    const {
        admin,
        loading
    } = useAuth();

    if (loading) {

        return (

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    background: "#0a0a0a",
                    color: "#ff4d4d",
                    fontFamily: "sans-serif"
                }}
            >

                <div style={{ textAlign: "center" }}>

                    <div
                        style={{
                            marginBottom: "10px",
                            fontSize: "24px"
                        }}
                    >
                        🔐
                    </div>

                    <div>
                        Đang xác thực quyền truy cập...
                    </div>

                </div>

            </div>

        );

    }

    /**
     * Chỉ dùng cho ADMIN
     */

    if (!admin) {

        return (

            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />

        );

    }

    if (admin.role !== "admin") {

        return (

            <Navigate
                to="/login"
                replace
            />

        );

    }

    return children;

};

export default ProtectedRoute;