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
            // [CẬP NHẬT]: Gọi API /me và dùng withCredentials để tự động gửi Cookie
            // Không cần lấy token từ sessionStorage và không cần gắn Header Authorization thủ công nữa
            const res = await axios.get('https://webcinema-zb8z.onrender.com/api/auth/me', {
                withCredentials: true 
            });
            
            // Backend của Dũng trả về { user: { ... } } dựa theo file middleware đã sửa
            setUser(res.data.user || res.data);
        } catch (err) {
            // Nếu lỗi (chưa đăng nhập hoặc cookie hết hạn), set user về null
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserData();
        
        // Lắng nghe sự kiện 'authChange' để cập nhật lại thông tin khi User đăng nhập/đăng xuất
        window.addEventListener('authChange', fetchUserData);
        return () => window.removeEventListener('authChange', fetchUserData);
    }, []);

    return (
        <div className="user-site-container">
            <header className="user-header-section">
                {/* UserHeader sẽ nhận state user để hiển thị "Xin chào..." hoặc nút "Đăng nhập" */}
                <UserHeader user={user} setUser={setUser} />
            </header>

            <main className="user-main-content">
                {/* Outlet cho phép các trang con gọi lại fetchUserData khi cần thiết */}
                <Outlet context={{ fetchUserData }} />
            </main>

            <footer className="user-footer-section">
                <UserFooter />
            </footer>
        </div>
    );
};

export default UserLayout;