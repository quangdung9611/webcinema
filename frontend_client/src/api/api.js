import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // Tự động gửi cookie (usertoken, admintoken)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor xử lý lỗi 401 (hết hạn token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Chuyển về trang login tương ứng
            if (window.location.pathname.includes('/admin')) {
                window.location.href = '/admin/login';
            } else {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;