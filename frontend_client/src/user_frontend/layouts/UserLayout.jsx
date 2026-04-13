import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import UserHeader from '../components/UserHeader';
import UserFooter from '../components/UserFooter';
import axios from 'axios';
import '../styles/UserLayout.css'; 

const UserLayout = () => {
    const [user, setUser] = useState(null);

    const fetchUserData = async () => {
        try {
            // Chỉ cần gọi endpoint ngắn gọn vì đã có baseURL ở App.js
            const res = await axios.get('/api/auth/me');
            
            // Backend trả về { success: true, user: { ... } }
            if (res.data && res.data.user) {
                setUser(res.data.user);
            }
        } catch (err) {
            // Khi lỗi 401 (chưa đăng nhập), xóa trắng user state
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserData();
        
        // Cơ chế này của Dũng rất hay để cập nhật UI ngay lập tức khi Login thành công
        window.addEventListener('authChange', fetchUserData);
        return () => window.removeEventListener('authChange', fetchUserData);
    }, []);

    return (
        <div className="user-site-container">
            <header className="user-header-section">
                {/* Truyền cả user và setUser xuống để Header xử lý Đăng xuất */}
                <UserHeader user={user} setUser={setUser} />
            </header>

            <main className="user-main-content">
                {/* Truyền fetchUserData qua context để các trang con (như Profile) có thể gọi lại */}
                <Outlet context={{ fetchUserData, user }} />
            </main>

            <footer className="user-footer-section">
                <UserFooter />
            </footer>
        </div>
    );
};

export default UserLayout;