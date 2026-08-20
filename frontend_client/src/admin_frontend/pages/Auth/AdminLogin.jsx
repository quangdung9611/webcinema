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

import Modal from '../../components/Modal';
import SessionExpiredModal from '../../../user_frontend/components/SessionExpiredModal';
import LoadingButton from '../../../user_frontend/components/LoadingButton';

import '../../styles/AdminAuth.css';

const AdminLogin = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');

    const navigate = useNavigate();

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => {}
    });

    // 👉 STATE CHO SESSION EXPIRED MODAL
    const [sessionExpiredModal, setSessionExpiredModal] = useState({
        show: false,
        message: ''
    });

    /* =====================================================
        CHECK SESSION
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

    /* =====================================================
        👉 LẮNG NGHE SỰ KIỆN SESSION EXPIRED
    ===================================================== */
    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.log('🔴 [ADMIN LOGIN] Nhận sự kiện sessionExpired');
            setSessionExpiredModal({
                show: true,
                message: event.detail?.message || 'Tài khoản admin đã đăng nhập ở thiết bị khác.'
            });
            setLoading(false);
        };

        window.addEventListener('sessionExpired', handleSessionExpired);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, []);

    /* =====================================================
        HANDLE SESSION EXPIRED CONFIRM
    ===================================================== */
    const handleSessionExpiredConfirm = () => {
        setSessionExpiredModal({ show: false, message: '' });
        setEmail('');
        setPassword('');
        setErrors({});
        setServerError('');
        document.getElementById('admin-email')?.focus();
    };

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
                    password: password,
                    rememberMe: false
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

            // 👉 Nếu là lỗi SESSION_EXPIRED
            if (err.response?.data?.code === 'SESSION_EXPIRED') {
                setLoading(false);
                return;
            }

            const errorMessage = err.response?.data?.message ||
                                 err.response?.data?.error ||
                                 'Sai tài khoản hoặc mật khẩu quản trị.';

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
        RENDER
    ===================================================== */
    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-overlay"></div>
            <div className="admin-login-container">

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

                <div className="admin-login-right">
                    <div className="admin-login-header">
                        <div className="admin-login-icon">
                            <ShieldCheck size={26} />
                        </div>
                        <h2>Chào mừng trở lại!</h2>
                        <p>Đăng nhập để tiếp tục quản trị hệ thống.</p>
                    </div>

                    {serverError && (
                        <div className="admin-server-error" style={{ marginBottom: '16px' }}>
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleAdminLogin} noValidate className="admin-login-form">
                        <div className="admin-input-group">
                            <label>Email quản trị</label>
                            <div className={`admin-input-box ${errors.email ? 'error' : ''}`}>
                                <Mail size={18} />
                                <input
                                    id="admin-email"
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

            {/* MODAL THÔNG THƯỜNG */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
            />

            {/* 👉 SESSION EXPIRED MODAL */}
            <SessionExpiredModal
                isOpen={sessionExpiredModal.show}
                message={sessionExpiredModal.message}
                onConfirm={handleSessionExpiredConfirm}
            />
        </div>
    );
};

export default AdminLogin;