import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; 
import '../styles/UserAuth.css';

const UserLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(''); 

    const navigate = useNavigate();
    const location = useLocation();
    const { checkAuth } = useAuth(); // Lấy hàm checkAuth để ép cập nhật state ngay sau login

    const validate = () => {
        let tempErrors = {};
        if (!formData.email.trim()) {
            tempErrors.email = "Bạn vui lòng nhập email";
        }
        if (!formData.password.trim()) {
            tempErrors.password = "Bạn vui lòng nhập mật khẩu";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
        if (serverError) setServerError(''); 
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // 1. Gửi request login
            // withCredentials: true cực kỳ quan trọng để trình duyệt nhận Set-Cookie từ Server
            await axios.post('https://api.quangdungcinema.id.vn/api/auth/login', {
                ...formData,
                role_input: 'customer' // Ép kiểu login là customer để nhận usertoken ở path '/'
            }, { withCredentials: true });
            
            // 2. ÉP CONTEXT CẬP NHẬT NGAY
            // Vì không còn localStorage, ta phải gọi checkAuth để nó chạy API /me lấy data user vào State
            await checkAuth();

            // 3. Thông báo cho các tab khác (nếu có)
            window.dispatchEvent(new Event('authChange'));
            
            // 4. Điều hướng
            // replace: true để người dùng không bấm 'Back' quay lại trang login được nữa
            const from = location.state?.from || '/';
            navigate(from, { replace: true });
            
        } catch (err) {
            console.error("Login Error:", err);
            setServerError(err.response?.data?.message || "Tài khoản hoặc mật khẩu không chính xác");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">Chào mừng bạn quay trở lại Cinema Star</p>
                
                {serverError && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{serverError}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} noValidate>
                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            name="email"
                            placeholder="example@gmail.com"
                            className={`auth-input ${errors.email ? 'input-error' : ''}`}
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="email"
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <input 
                            type="password" 
                            name="password"
                            placeholder="••••••••"
                            className={`auth-input ${errors.password ? 'input-error' : ''}`}
                            value={formData.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                        />
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <button type="submit" className="btn-user" disabled={loading}>
                        {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP"}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Chưa có tài khoản? </span>
                    <Link to="/register" className="btn-link">Đăng ký ngay</Link>
                </div>
            </div>
        </div>
    );
};

export default UserLogin;