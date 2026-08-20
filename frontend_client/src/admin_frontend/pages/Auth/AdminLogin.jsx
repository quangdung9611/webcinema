// pages/admin/AdminLogin.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/api';

import {
    ShieldCheck,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Sparkles,
    Clapperboard,
    ChartColumn,
    Timer
} from 'lucide-react';

import Modal from '../../components/AdminModal';
import LoadingButton from '../../../user_frontend/components/LoadingButton';

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
    const [serverError, setServerError] = useState('');

    const navigate = useNavigate();

    /* =====================================================
        MODAL
    ===================================================== */
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => {}
    });

    // 👉 THÊM STATE CHO SESSION EXPIRED MODAL
    const [sessionExpiredModal, setSessionExpiredModal] = useState({
        show: false,
        title: '',
        message: ''
    });

    /* =====================================================
        CHECK SESSION (Nếu đã đăng nhập thì chuyển trang)
    ===================================================== */
    useEffect(() => {
        const checkAdminSession = async () => {
            try {
                const res = await api.get('/admin/api/auth/me');
                if (res.data?.user?.role === 'admin') {
                    navigate('/dashboard', { replace: true });
                }
            } catch (error) {
                console.log('Chưa đăng nhập, hiển thị form login.');
            }
        };
        checkAdminSession();
    }, [navigate]);

    // 👉 KIỂM TRA URL PARAM SESSION_EXPIRED
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('session_expired') === 'true') {
            setSessionExpiredModal({
                show: true,
                title: 'Đã đăng nhập ở thiết bị khác!',
                message: 'Tài khoản admin của bạn vừa được đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại để tiếp tục.'
            });
            // Xóa param trên URL để tránh hiển thị lại khi refresh
            window.history.replaceState({}, '', '/admin/login');
        }
    }, []);

    /* =====================================================
        VALIDATE
    ===================================================== */
    const validate = () => {
        const tempErrors = {};
        if (!email.trim()) {
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
        HANDLE LOGIN
    ===================================================== */
    const handleAdminLogin = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        setServerError('');

        try {
            const response = await api.post(
                '/admin/api/auth/login',
                {
                    email: email.trim(),
                    password: password
                }
            );

            const adminUser = response.data?.user;

            if (adminUser && adminUser.role && adminUser.role !== 'admin') {
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

            navigate('/dashboard', { replace: true });

        } catch (err) {
            console.error('Admin Login Error:', err);
            const errorMessage = err.response?.data?.message ||
                                 err.response?.data?.error ||
                                 'Sai tài khoản hoặc mật khẩu quản trị.';

            // 👉 KIỂM TRA NẾU LỖI LÀ SESSION EXPIRED
            if (err.response?.status === 401 && 
                err.response?.data?.code === 'SESSION_EXPIRED') {
                setSessionExpiredModal({
                    show: true,
                    title: 'Đã đăng nhập ở thiết bị khác!',
                    message: 'Tài khoản admin đang được đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại.'
                });
            } else if (err.response?.data?.field === 'email') {
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
        RENDER
    ===================================================== */
    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-overlay"></div>
            <div className="admin-login-container">

                {/* =================================================
                    LEFT PANEL
                ================================================= */}
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

                {/* =================================================
                    RIGHT PANEL
                ================================================= */}
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
                                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                        if (serverError) setServerError('');
                                    }}
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                            {errors.email && <span className="admin-error-text">{errors.email}</span>}
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
                                        if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                                        if (serverError) setServerError('');
                                    }}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password-btn"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {errors.password && <span className="admin-error-text">{errors.password}</span>}
                        </div>

                        {serverError && <div className="admin-server-error">{serverError}</div>}

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

            {/* =================================================
                MODAL THÔNG THƯỜNG
            ================================================= */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
            />

            {/* =================================================
                MODAL SESSION EXPIRED
            ================================================= */}
            <Modal
                show={sessionExpiredModal.show}
                type="warning"
                title={sessionExpiredModal.title}
                message={sessionExpiredModal.message}
                onConfirm={() => {
                    setSessionExpiredModal({ show: false, title: '', message: '' });
                    navigate('/admin/login');
                }}
                confirmText="Đăng nhập lại"
            />
        </div>
    );
};

export default AdminLogin;