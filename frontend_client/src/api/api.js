import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // Tự động gửi cookie (usertoken, admintoken)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor xử lý lỗi
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // QUAN TRỌNG: Chỉ log lỗi, TUYỆT ĐỐI KHÔNG dùng window.location.href ở đây!
        if (error.response?.status === 401) {
            console.warn('Hết phiên đăng nhập hoặc chưa đăng nhập!');
            
            // (Tùy chọn nâng cao) Bạn có thể dùng window.dispatchEvent để React biết và chuyển trang
            // window.dispatchEvent(new Event('unauthorized'));
        }
        
        // Trả về lỗi để các component (UserLogin, AdminLogin) bắt được và tự xử lý
        return Promise.reject(error);
    }
);

export default api;