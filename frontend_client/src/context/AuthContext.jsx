import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Tách biệt hàm dọn dẹp để gọi ở nhiều nơi
    const clearLocalAuth = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const authEndpoint = `${BASE_URL}/api/auth/me`;

            // BẮT BUỘC: withCredentials để gửi Cookie lên Render
            const res = await axios.get(authEndpoint, { withCredentials: true });
            
            const userData = res.data.user;

            if (userData) {
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                console.log("✅ Đã xác thực:", userData.username);
            } else {
                clearLocalAuth();
            }
        } catch (err) {
            // TÁCH BIỆT: Chỉ xóa local khi lỗi thực sự là do Token (401, 403)
            // Nếu lỗi 500 hoặc mất mạng thì không nên xóa ngay để tránh bị logout oan
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                console.log("⚠️ Phiên làm việc hết hạn");
                clearLocalAuth();
            }
        } finally {
            setLoading(false); 
        }
    }, [clearLocalAuth]);

    useEffect(() => {
        // 1. Khởi tạo: Đọc từ localStorage để UI mượt mà
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                clearLocalAuth();
            }
        }
        
        // 2. Xác thực lại với Server ngay lập tức
        checkAuth();

        // 3. Lắng nghe sự kiện thay đổi (Login/Logout từ các component khác)
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => window.removeEventListener('authChange', handleAuthChange);
    }, [checkAuth, clearLocalAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, checkAuth, clearLocalAuth }}>
            {/* Hiển thị children ngay, checkAuth sẽ cập nhật trạng thái sau */}
            {children}
            
            {/* Nếu muốn hiện loading khi lần đầu vào trang thì dùng: 
                loading ? <div className="spinner">...</div> : children 
            */}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);