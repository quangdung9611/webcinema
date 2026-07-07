import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import Modal from '../components/Modal';
import '../styles/UserAuth.css';

// API URL từ env
const API_URL = process.env.REACT_APP_API_URL || 'https://api.quangdungcinema.id.vn';

const UserRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        phone: '',
        address: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Quản lý trạng thái Modal
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: ''
    });

    const navigate = useNavigate();

    // ==========================================
    // VALIDATE
    // ==========================================

    const validate = () => {
        let tempErrors = {};

        // Username
        const usernameRegex = /^[a-zA-Z0-9_.]{4,20}$/;
        if (!formData.username.trim()) {
            tempErrors.username = 'Tên đăng nhập không được để trống';
        } else if (!usernameRegex.test(formData.username)) {
            tempErrors.username = 'Tên đăng nhập từ 4-20 ký tự, chỉ chứa chữ, số, dấu gạch dưới và dấu chấm';
        }

        // Full Name
        if (!formData.full_name.trim()) {
            tempErrors.full_name = 'Họ tên không được để trống';
        } else if (formData.full_name.trim().length < 6) {
            tempErrors.full_name = 'Họ tên phải từ 6 ký tự trở lên';
        }

        // Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            tempErrors.email = 'Email không được để trống';
        } else if (!emailRegex.test(formData.email)) {
            tempErrors.email = 'Email không hợp lệ';
        }

        // Phone
        const phoneRegex = /^[0-9]{10}$/;
        if (!formData.phone.trim()) {
            tempErrors.phone = 'Số điện thoại không được để trống';
        } else if (!phoneRegex.test(formData.phone)) {
            tempErrors.phone = 'Số điện thoại phải đúng 10 chữ số';
        }

        // Password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!formData.password.trim()) {
            tempErrors.password = 'Mật khẩu không được để trống';
        } else if (!passwordRegex.test(formData.password)) {
            tempErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // ==========================================
    // HANDLE INPUT
    // ==========================================

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    // ==========================================
    // REGISTER
    // ==========================================

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);

        try {
            const response = await axios.post(
                `${API_URL}/api/auth/register`,
                {
                    username: formData.username,
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    address: formData.address || ''
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Đăng ký thành công
            setModalConfig({
                show: true,
                type: 'success',
                title: '🎉 Đăng ký thành công!',
                message: 'Chào mừng bạn gia nhập Cinema Star. Vui lòng kiểm tra email để xác thực tài khoản.'
            });

        } catch (err) {
            console.error('Register Error:', err);

            const serverMsg = err.response?.data?.message;
            const field = err.response?.data?.field;

            if (field) {
                setErrors({ [field]: serverMsg });
            } else {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Thất bại',
                    message: serverMsg || 'Đã có lỗi xảy ra, vui lòng thử lại!'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // HANDLE MODAL CONFIRM
    // ==========================================

    const handleModalConfirm = () => {
        setModalConfig({ ...modalConfig, show: false });
        if (modalConfig.type === 'success') {
            navigate('/login');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG KÝ</h2>
                <p className="auth-subtitle">
                    Tạo tài khoản để trải nghiệm Cinema Star
                </p>

                <form onSubmit={handleRegister} noValidate>
                    {/* USERNAME */}
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <input
                            type="text"
                            name="username"
                            className={`auth-input ${errors.username ? 'input-error' : ''}`}
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="vd: dungnguyen_123"
                            autoComplete="username"
                            disabled={loading}
                        />
                        {errors.username && (
                            <span className="error-text">{errors.username}</span>
                        )}
                    </div>

                    {/* FULL NAME */}
                    <div className="form-group">
                        <label>Họ và tên</label>
                        <input
                            type="text"
                            name="full_name"
                            className={`auth-input ${errors.full_name ? 'input-error' : ''}`}
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="vd: Nguyễn Văn A"
                            autoComplete="name"
                            disabled={loading}
                        />
                        {errors.full_name && (
                            <span className="error-text">{errors.full_name}</span>
                        )}
                    </div>

                    {/* EMAIL */}
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            className={`auth-input ${errors.email ? 'input-error' : ''}`}
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="example@gmail.com"
                            autoComplete="email"
                            disabled={loading}
                        />
                        {errors.email && (
                            <span className="error-text">{errors.email}</span>
                        )}
                    </div>

                    {/* PHONE */}
                    <div className="form-group">
                        <label>Số điện thoại</label>
                        <input
                            type="tel"
                            name="phone"
                            className={`auth-input ${errors.phone ? 'input-error' : ''}`}
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="0123456789"
                            autoComplete="tel"
                            disabled={loading}
                        />
                        {errors.phone && (
                            <span className="error-text">{errors.phone}</span>
                        )}
                    </div>

                    {/* PASSWORD */}
                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className={`auth-input ${errors.password ? 'input-error' : ''}`}
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="error-text">{errors.password}</span>
                        )}
                    </div>

                    {/* ADDRESS (Optional) */}
                    <div className="form-group">
                        <label>Địa chỉ (không bắt buộc)</label>
                        <input
                            type="text"
                            name="address"
                            className="auth-input"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="vd: 123 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM"
                            disabled={loading}
                        />
                    </div>

                    {/* SUBMIT */}
                    <button
                        type="submit"
                        className="btn-user"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner">⏳ ĐANG XỬ LÝ...</span>
                        ) : (
                            'ĐĂNG KÝ NGAY'
                        )}
                    </button>
                </form>

                {/* FOOTER */}
                <div className="auth-footer">
                    <span>Đã có tài khoản? </span>
                    <Link to="/login" className="btn-link">
                        Đăng nhập
                    </Link>
                </div>
            </div>

            {/* MODAL */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={handleModalConfirm}
            />
        </div>
    );
};

export default UserRegister;