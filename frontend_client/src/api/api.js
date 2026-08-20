// api/api.js
import axios from 'axios';
import React from 'react';
import { createRoot } from 'react-dom/client';
import SessionExpiredModal from '../components/SessionExpiredModal';

const API_BASE = 'https://api.quangdungcinema.id.vn';

let sessionModalInstance = null;

/**
 * Hiển thị modal thông báo session expired
 */
const showSessionExpiredModal = () => {
    // Nếu đã có modal thì không tạo mới (tránh trùng lặp)
    if (sessionModalInstance) return;

    // Tạo container cho modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'session-expired-modal-root';
    document.body.appendChild(modalContainer);

    const root = createRoot(modalContainer);

    const handleConfirm = () => {
        // Đóng modal và xóa container
        if (sessionModalInstance) {
            root.unmount();
            document.body.removeChild(modalContainer);
            sessionModalInstance = null;
        }

        // Xác định đường dẫn login dựa trên URL hiện tại
        const isAdminPath = window.location.pathname.startsWith('/admin');
        const loginPath = isAdminPath ? '/admin/login' : '/login';
        
        // Chuyển hướng về trang login với param session_expired
        window.location.href = `${loginPath}?session_expired=true`;
    };

    // Render modal
    root.render(
        <SessionExpiredModal 
            isOpen={true} 
            onConfirm={handleConfirm} 
        />
    );

    sessionModalInstance = { root, container: modalContainer };
};

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // Tự động gửi cookie (usertoken, admintoken)
    headers: {
        'Content-Type': 'application/json',
    },
});

// ==========================================================
// RESPONSE INTERCEPTOR - BẮT LỖI SESSION EXPIRED
// ==========================================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 👉 BẮT LỖI SESSION EXPIRED (từ backend trả về code này)
        if (error.response?.status === 401 && 
            error.response?.data?.code === 'SESSION_EXPIRED') {
            
            console.warn('🔒 Tài khoản đã đăng nhập ở thiết bị khác!');
            
            // Hiển thị modal thông báo
            showSessionExpiredModal();
            
            return Promise.reject(error);
        }

        // Xử lý lỗi 401 thông thường (chưa đăng nhập hoặc token hết hạn)
        if (error.response?.status === 401) {
            console.warn('⏰ Hết phiên đăng nhập hoặc chưa đăng nhập!');
            
            // Kiểm tra xem có phải đang ở trang login không
            const isLoginPage = window.location.pathname === '/login' || 
                               window.location.pathname === '/admin/login';
            
            // Nếu không phải trang login và chưa có modal thì chuyển hướng
            if (!isLoginPage && !sessionModalInstance) {
                const isAdminPath = window.location.pathname.startsWith('/admin');
                const loginPath = isAdminPath ? '/admin/login' : '/login';
                window.location.href = loginPath;
            }
        }

        // Trả về lỗi để các component xử lý tiếp (nếu cần)
        return Promise.reject(error);
    }
);

export default api;