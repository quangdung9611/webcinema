import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Sử dụng biến môi trường hoặc URL Backend chính thức trên Render
const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            // Vì mình đã để path: '/' ở Backend, nên cả 2 endpoint đều đọc được token.
            // Để đơn giản, mình gọi endpoint /api/auth/me chung cho cả 2.
            const authEndpoint = `${BASE_URL}/api/auth/me`;

            const res = await axios.get(authEndpoint, { withCredentials: true });
            
            // Backend trả về { user: { user_id, username, role, ... } }
            const userData = res.data.user;

            if (userData) {
                setUser(userData);
                // Lưu vào localStorage để các trang khác load nhanh hơn
                localStorage.setItem('user', JSON.stringify(userData));
                console.log("✅ Đã xác thực người dùng:", userData.username);
            } else {
                throw new Error("Không có dữ liệu user");
            }
        } catch (err) {
            console.log("⚠️ Chưa đăng nhập hoặc phiên làm việc hết hạn");
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        // Ưu tiên load từ localStorage trước để UI hiện tên ngay lập tức
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        
        // Sau đó mới kiểm tra lại với Server để đảm bảo Token vẫn còn hạn
        checkAuth();

        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        return () => window.removeEventListener('authChange', handleAuthChange);
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, checkAuth }}>
            {/* Không chặn rendering hoàn toàn, chỉ hiển thị children khi đã kiểm tra xong */}
            {!loading ? children : <div className="loading-spinner">Đang tải dữ liệu...</div>} 
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);