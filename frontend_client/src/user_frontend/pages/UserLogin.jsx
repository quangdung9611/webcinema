import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom'; // Thêm useLocation
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Thêm import này
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
    const location = useLocation(); // Lấy thông tin trang trước đó (nếu có)
    const { checkAuth } = useAuth(); // Lấy hàm checkAuth từ Context

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
            // [CẬP NHẬT]: Backend sẽ tự động trả về Set-Cookie 'usertoken'
            await axios.post('http://localhost:5000/api/auth/login', {
                ...formData,
                role_input: 'customer'
            }, { withCredentials: true });
            
            // KHÔNG LƯU BẤT CỨ THỨ GÌ VÀO sessionStorage NỮA

            // 1. Cập nhật dữ liệu user vào Context ngay lập tức
            await checkAuth();

            // 2. Kích hoạt sự kiện để các thành phần khác (Header) tự cập nhật
            window.dispatchEvent(new Event('authChange'));
            
            // 3. Điều hướng: Nếu người dùng bị bắt đăng nhập khi đang ở trang đặt vé, 
            // sau khi xong sẽ quay lại đúng trang đó, nếu không thì về trang chủ.
            const from = location.state?.from || '/';
            navigate(from, { replace: true });
            
        } catch (err) {
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