import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/api';  // ✅ Import api thay vì axios

import {
    ShieldCheck,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sparkles,
    Clapperboard,
    ChartColumn,
    Timer
} from 'lucide-react';

import Modal from '../../components/AdminModal';
import LoadingButton from '../../../user_frontend/components/LoadingButton'; // ✅ Import LoadingButton
import { useAuth } from '../../../context/AuthContext';

import '../../styles/AdminAuth.css';

const AdminLogin = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState(''); // ✅ Thêm serverError

    const { checkAuth, admin, loading: authLoading } = useAuth();

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const navigate = useNavigate();

    /* =====================================================
        AUTO LOGIN
    ===================================================== */

    useEffect(() => {
        if (!authLoading && admin) {
            navigate('/', { replace: true });
        }
    }, [admin, authLoading, navigate]);

    /* =====================================================
        VALIDATE
    ===================================================== */

    const validate = () => {
        let tempErrors = {};

        if (!email) {
            tempErrors.email = 'Email quản trị không được để trống';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            tempErrors.email = 'Định dạng email không hợp lệ';
        }

        if (!password) {
            tempErrors.password = 'Mật khẩu không được để trống';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    /* =====================================================
        LOGIN
    ===================================================== */

    const handleAdminLogin = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        setServerError('');

        try {
            // ✅ Gọi API login ADMIN qua api instance
            const response = await api.post('/admin/api/auth/login', {
                email: email,
                password: password
            });

            // ✅ Kiểm tra role admin (dự phòng, backend đã check)
            if (response.data?.user?.role !== 'admin') {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'TRUY CẬP BỊ TỪ CHỐI',
                    message: 'Tài khoản này không có quyền quản trị.',
                    onConfirm: () => {
                        setModalConfig(prev => ({ ...prev, show: false }));
                    }
                });
                setLoading(false);
                return;
            }

            // ✅ Cập nhật auth context
            await checkAuth();
            window.dispatchEvent(new Event('authChange'));

            // ✅ Chuyển trang mượt mà sau khi đăng nhập thành công
            navigate('/dashboard', { replace: true });

        } catch (err) {
            console.error('Admin Login Error:', err);

            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error ||
                'Sai tài khoản hoặc mật khẩu quản trị.';

            // Hiển thị lỗi theo field nếu có
            if (err.response?.data?.field === 'email') {
                setErrors({ email: errorMessage });
            } else if (err.response?.data?.field === 'password') {
                setErrors({ password: errorMessage });
            } else {
                setServerError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
        LOADING AUTH
    ===================================================== */

    if (authLoading) {
        return (
            <div className="admin-auth-loading">
                Đang kiểm tra quyền truy cập...
            </div>
        );
    }

    /* =====================================================
        RENDER
    ===================================================== */

    return (
        <div className="admin-login-wrapper">

            {/* BACKGROUND EFFECT */}
            <div className="admin-login-overlay"></div>

            {/* MAIN CARD */}
            <div className="admin-login-container">

                {/* LEFT PANEL */}
                <div className="admin-login-left">
                    <div className="admin-brand">
                        <div className="admin-brand-logo">
                            <Sparkles size={34} />
                        </div>
                        <h1>CINEMA STAR</h1>
                        <span>ADMIN PANEL</span>
                    </div>

                    <div className="admin-left-content">
                        <h2>Hệ thống quản trị rạp chiếu phim</h2>
                        <p>Quản lý toàn bộ hoạt động hệ thống cinema hiện đại, trực quan và bảo mật.</p>
                    </div>

                    <div className="admin-feature-list">
                        <div className="admin-feature-card">
                            <ShieldCheck size={24} />
                            <div>
                                <strong>Bảo mật</strong>
                                <span>An toàn hệ thống</span>
                            </div>
                        </div>
                        <div className="admin-feature-card">
                            <ChartColumn size={24} />
                            <div>
                                <strong>Quản lý</strong>
                                <span>Thống kê doanh thu</span>
                            </div>
                        </div>
                        <div className="admin-feature-card">
                            <Timer size={24} />
                            <div>
                                <strong>Nhanh chóng</strong>
                                <span>Xử lý realtime</span>
                            </div>
                        </div>
                    </div>

                    <div className="admin-cinema-icon">
                        <Clapperboard size={260} />
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="admin-login-right">
                    <div className="admin-login-header">
                        <div className="admin-login-icon">
                            <ShieldCheck size={26} />
                        </div>
                        <h2>Chào mừng trở lại!</h2>
                        <p>Đăng nhập để tiếp tục quản trị hệ thống.</p>
                    </div>

                    <form onSubmit={handleAdminLogin} noValidate className="admin-login-form">
                        {/* EMAIL */}
                        <div className="admin-input-group">
                            <label>Email quản trị</label>
                            <div className={`admin-input-box ${errors.email ? 'error' : ''}`}>
                                <Mail size={18} />
                                <input
                                    type="email"
                                    placeholder="admin@cinemastar.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) {
                                            setErrors({ ...errors, email: '' });
                                        }
                                        if (serverError) setServerError('');
                                    }}
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                            {errors.email && (
                                <span className="admin-error-text">{errors.email}</span>
                            )}
                        </div>

                        {/* PASSWORD */}
                        <div className="admin-input-group">
                            <label>Mật khẩu</label>
                            <div className={`admin-input-box ${errors.password ? 'error' : ''}`}>
                                <Lock size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) {
                                            setErrors({ ...errors, password: '' });
                                        }
                                        if (serverError) setServerError('');
                                    }}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <span className="admin-error-text">{errors.password}</span>
                            )}
                        </div>

                        {/* SERVER ERROR */}
                        {serverError && (
                            <div className="admin-server-error">
                                {serverError}
                            </div>
                        )}

                        {/* ✅ BUTTON - DÙNG LOADINGBUTTON */}
                        <LoadingButton
                            type="submit"
                            loading={loading}
                            loadingText="ĐANG XÁC THỰC..."
                            disabled={loading}
                            className="btn-admin-login"
                            spinnerColor="#000000"
                        >
                            ĐĂNG NHẬP HỆ THỐNG
                        </LoadingButton>
                    </form>

                    <div className="admin-login-footer">
                        © 2026 Cinema Star Admin
                    </div>
                </div>

            </div>

            {/* MODAL - Chỉ hiển thị khi có lỗi role */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
            />

        </div>
    );
};

export default AdminLogin;