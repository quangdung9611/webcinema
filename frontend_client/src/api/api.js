// api/api.js
import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor xử lý response
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const errorCode = error.response?.data?.code;
        
        // 1. Lỗi 401: Token hết hạn hoặc không hợp lệ
        if (status === 401) {
            if (errorCode === 'SESSION_EXPIRED') {
                console.warn('🔴 Phiên đăng nhập đã hết hạn! Đã đăng nhập ở thiết bị khác.');
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: { 
                        message: error.response?.data?.message || 'Tài khoản đã đăng nhập ở thiết bị khác.',
                        code: errorCode 
                    }
                }));
            } else {
                console.warn('🟡 Hết phiên đăng nhập hoặc chưa đăng nhập!');
                window.dispatchEvent(new CustomEvent('unauthorized'));
            }
        }
        
        // 2. Lỗi 409: Chặn đăng nhập do đã có thiết bị khác đang online 
        //    👉 QUAN TRỌNG: Bắt lỗi này để hiển thị Modal
        if (status === 409 && errorCode === 'DEVICE_ALREADY_LOGGED_IN') {
            console.warn('🔴 Đăng nhập thất bại: Tài khoản đang được sử dụng ở thiết bị khác!');
            
            // 👉 Dispatch event để UserLogin hiển thị Modal
            window.dispatchEvent(new CustomEvent('deviceAlreadyLoggedIn', {
                detail: { 
                    message: error.response?.data?.message || 'Tài khoản đang đăng nhập ở thiết bị khác.',
                    code: errorCode
                }
            }));
        }
        
        return Promise.reject(error);
    }
);

export default api;