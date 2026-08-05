import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import api from '../../api/api'; // 🔥 Quan trọng: Đổi axios thành api đã cấu hình
import UserHeader from '../components/UserHeader';
import UserFooter from '../components/UserFooter';
import '../styles/UserLayout.css';

const UserLayout = () => {
    const [user, setUser] = useState(null);

    const fetchUserData = async () => {
        try {
            const res = await api.get('/api/auth/me'); // Không cần thêm withCredentials nữa vì api.js đã có
            
            // Xử lý lấy user object (unwrap an toàn)
            const raw = res.data;
            let account = null;
            if (raw?.user) account = raw.user;
            else if (raw?.data?.user) account = raw.data.user;
            else if (raw && typeof raw === 'object' && !Array.isArray(raw)) account = raw;

            setUser(account);
        } catch (err) {
            // api.js đã xử lý 401 console.warn ở interceptor, ở đây chỉ set null là đủ
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserData();
        // 🔥 Sửa tên event từ 'authChange' thành 'userLoggedIn' để khớp với file UserLogin
        window.addEventListener('userLoggedIn', fetchUserData);
        
        return () => window.removeEventListener('userLoggedIn', fetchUserData);
    }, []);

    return (
        <div className="user-site-container">
            <header className="user-header-section">
                {/* 🔥 Bỏ props user và setUser vì UserHeader đã tự fetch bên trong rồi */}
                <UserHeader /> 
            </header>

            <main className="user-main-content">
                {/* 
                   Truyền user và fetchUserData xuống các trang con thông qua Outlet context.
                   Các trang như Profile, Booking... sẽ dùng useOutletContext() để lấy.
                */}
                <Outlet context={{ fetchUserData, user }} />
            </main>

            <footer className="user-footer-section">
                <UserFooter />
            </footer>
        </div>
    );
};

export default UserLayout;