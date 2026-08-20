import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // Tự động gửi cookie (user_token, admin_token, refresh_token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor xử lý response
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Kiểm tra lỗi 401 và mã SESSION_EXPIRED
        if (error.response?.status === 401) {
            const errorCode = error.response?.data?.code;
            
            if (errorCode === 'SESSION_EXPIRED') {
                console.warn('🔴 Phiên đăng nhập đã hết hạn! Đã đăng nhập ở thiết bị khác.');
                
                // Dispatch event để React biết và xử lý
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: { message: error.response?.data?.message }
                }));
            } else {
                console.warn('🟡 Hết phiên đăng nhập hoặc chưa đăng nhập!');
                window.dispatchEvent(new CustomEvent('unauthorized'));
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;