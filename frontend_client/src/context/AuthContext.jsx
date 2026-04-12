import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Trạng thái chờ xác thực

    // Dọn dẹp state trong React
    const clearAuth = useCallback(() => {
        setUser(null);
    }, []);

    const checkAuth = useCallback(async () => {
        // Mỗi khi checkAuth chạy, mình bật loading lên nếu cần
        setLoading(true); 
        try {
            // Nhận diện vùng để gọi đúng endpoint (để Backend đọc đúng Path Cookie)
            const isAdminPath = window.location.pathname.startsWith('/admin');
            const endpoint = isAdminPath 
                ? `${BASE_URL}/api/admin/auth/me` 
                : `${BASE_URL}/api/auth/me`;

            const res = await axios.get(endpoint, { withCredentials: true });
            
            if (res.data.user) {
                setUser(res.data.user);
                console.log("✅ Identity verified via Cookie:", res.data.user.username);
            } else {
                clearAuth();
            }
        } catch (err) {
            console.log("⚠️ No valid cookie or session expired");
            clearAuth();
        } finally {
            setLoading(false); // Xong xuôi thì tắt loading
        }
    }, [clearAuth]);

    useEffect(() => {
        // Lần đầu vào web, hỏi Server xem "Tui có thẻ Cookie nào không?"
        checkAuth();

        // Nghe các sự kiện đăng nhập/đăng xuất để cập nhật lại state
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => window.removeEventListener('authChange', handleAuthChange);
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, checkAuth, clearAuth }}>
            {/* QUAN TRỌNG: Để tránh lộ nội dung trang nhạy cảm khi chưa xác thực xong,
               ông có thể chặn render children cho đến khi loading = false.
            */}
            {!loading ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                    <p>Đang kiểm tra quyền truy cập...</p>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);