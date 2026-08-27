import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import { Eye, EyeOff } from 'lucide-react';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const UserRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'error',
        title: '',
        message: ''
    });

    const navigate = useNavigate();

    // ==========================================
    // VALIDATE FIELD
    // ==========================================

    const validateField = (name, value, password = formData.password, confirmPassword = formData.confirmPassword) => {
        let error = '';

        switch (name) {
            case 'username':
                const usernameRegex = /^[a-zA-Z0-9_.]{4,20}$/;
                if (!value.trim()) {
                    error = 'Tên đăng nhập không được để trống';
                } else if (!usernameRegex.test(value)) {
                    error = 'Tên đăng nhập từ 4-20 ký tự, chỉ chứa chữ, số, dấu gạch dưới và dấu chấm';
                }
                break;

            case 'full_name':
                if (!value.trim()) {
                    error = 'Họ tên không được để trống';
                } else if (value.trim().length < 6) {
                    error = 'Họ tên phải từ 6 ký tự trở lên';
                }
                break;

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) {
                    error = 'Email không được để trống';
                } else if (!emailRegex.test(value)) {
                    error = 'Email không hợp lệ';
                }
                break;

            case 'phone':
                const phoneRegex = /^[0-9]{10}$/;
                if (!value.trim()) {
                    error = 'Số điện thoại không được để trống';
                } else if (!phoneRegex.test(value)) {
                    error = 'Số điện thoại phải đúng 10 chữ số';
                }
                break;

            case 'password':
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
                if (!value.trim()) {
                    error = 'Mật khẩu không được để trống';
                } else if (!passwordRegex.test(value)) {
                    error = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';
                }
                break;

            case 'confirmPassword':
                if (!value.trim()) {
                    error = 'Vui lòng nhập lại mật khẩu';
                } else if (value !== password) {
                    error = 'Mật khẩu xác nhận không khớp';
                }
                break;

            default:
                break;
        }

        return error;
    };

    // ==========================================
    // HANDLE INPUT
    // ==========================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        const newPassword = name === 'password' ? value : formData.password;
        const newConfirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;

        setFormData(prev => ({ ...prev, [name]: value }));

        const error = validateField(name, value, newPassword, newConfirmPassword);
        setErrors(prev => ({ ...prev, [name]: error }));

        if (name === 'password' || name === 'confirmPassword') {
            const confirmError = validateField('confirmPassword', newConfirmPassword, newPassword, newConfirmPassword);
            setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
    };

    // ==========================================
    // VALIDATE ALL
    // ==========================================

    const validate = () => {
        const tempErrors = {};
        const fields = ['username', 'full_name', 'email', 'phone', 'password', 'confirmPassword'];
        
        fields.forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) {
                tempErrors[field] = error;
            }
        });

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // ==========================================
    // BƯỚC 1: ĐĂNG KÝ THÔNG TIN CƠ BẢN
    // ==========================================

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);

        try {
            const response = await api.post('/api/auth/register-step1', {
                username: formData.username,
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                address: formData.address || ''
            });

            if (response.data.success) {
                // Nhận temp_token từ server
                const { temp_token, email, full_name } = response.data.data;
                
                // Lưu toàn bộ thông tin (bao gồm temp_token) để dùng ở Bước 2
                sessionStorage.setItem('register_temp', JSON.stringify({
                    temp_token: temp_token,
                    username: formData.username,
                    full_name: full_name || formData.full_name,
                    email: email,
                    phone: formData.phone,
                    password: formData.password,
                    address: formData.address || ''
                }));

                // Chuyển sang bước 2: Thiết lập PIN
                navigate('/register-pin');
            }

        } catch (err) {
            console.error('Register Error:', err);

            const serverMsg = err.response?.data?.message;
            const field = err.response?.data?.field;

            if (field) {
                setErrors(prev => ({ ...prev, [field]: serverMsg }));
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
    // HANDLE MODAL CLOSE
    // ==========================================

    const handleModalClose = () => {
        setModalConfig({ ...modalConfig, show: false });
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* STEP INDICATOR */}
                <div className="step-indicator">
                    <span className="step-active">1</span>
                    <span className="step-line"></span>
                    <span className="step-inactive">2</span>
                </div>

                <h2>ĐĂNG KÝ</h2>
                <p className="auth-subtitle">
                    Bước 1: Nhập thông tin cơ bản
                </p>

                <div className="auth-form-wrapper">
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
                            {errors.username && <span className="error-text">{errors.username}</span>}
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
                            {errors.full_name && <span className="error-text">{errors.full_name}</span>}
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
                            {errors.email && <span className="error-text">{errors.email}</span>}
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
                            {errors.phone && <span className="error-text">{errors.phone}</span>}
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
                            {errors.password && <span className="error-text">{errors.password}</span>}
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="form-group">
                            <label>Xác nhận mật khẩu</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    className={`auth-input ${errors.confirmPassword ? 'input-error' : ''}`}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                >
                                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                        </div>

                        {/* ADDRESS */}
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

                        <LoadingButton
                            type="submit"
                            loading={loading}
                            loadingText="Đang tạo tài khoản..."
                            disabled={loading}
                            className="btn-user"
                            spinnerColor="#ffffff"
                        >
                            TIẾP TỤC
                        </LoadingButton>
                    </form>
                </div>

                <div className="auth-footer">
                    <span>Đã có tài khoản? </span>
                    <Link to="/login" className="btn-link">Đăng nhập</Link>
                </div>
            </div>

            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={handleModalClose}
            />
        </div>
    );
};

export default UserRegister;