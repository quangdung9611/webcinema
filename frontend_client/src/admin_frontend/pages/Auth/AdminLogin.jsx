import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/api';
import socketService from '../../../api/socket'; // 🟢 THÊM: Import socket service

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
import SessionExpiredModal from '../../../user_frontend/components/SessionExpiredModal';

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
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState(''); // 🟢 THÊM
    const [newDevice, setNewDevice] = useState(''); // 🟢 THÊM

    const navigate = useNavigate();

    // 🟢 Kiểm tra nếu bị redirect từ session expired
    useEffect(() => {
        if (location.state?.expired) {
            setSessionExpiredMessage('Tài khoản admin đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.');
            setShowSessionExpiredModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    /* =====================================================
        CHECK SESSION - Nếu đã đăng nhập thì chuyển trang
    ===================================================== */
    useEffect(() => {
        const checkAdminSession = async () => {
            try {
                const res = await api.get('/admin/api/auth/me');
                if (res.data?.user?.role === 'admin') {
                    // 🟢 Kết nối WebSocket cho admin
                    const adminUser = res.data.user;
                    socketService.connect(adminUser.user_id, adminUser.user_id);
                    navigate('/dashboard', { replace: true });
                }
            } catch (error) {
                console.log('Chưa đăng nhập, hiển thị form login.');
            }
        };
        checkAdminSession();
    }, [navigate]);

    /* =====================================================
        LẮNG NGHE SỰ KIỆN SESSION EXPIRED TỪ API INTERCEPTOR
    ===================================================== */
    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.log('🔴 [ADMIN LOGIN] Nhận được sự kiện sessionExpired!');
            console.log('🔴 [ADMIN LOGIN] Detail:', event.detail);
            
            const detail = event.detail || {};
            const message = detail.message || 'Tài khoản admin đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.';
            const device = detail.newDevice || '';
            
            setSessionExpiredMessage(message);
            setNewDevice(device);
            setShowSessionExpiredModal(true);
            
            // Reset form
            setServerError('');
            setErrors({});
        };

        // 🟢 THÊM: Lắng nghe sự kiện TOKEN_INVALID
        const handleTokenInvalid = (event) => {
            console.log('🔴 [ADMIN LOGIN] Token invalid:', event.detail);
            setServerError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            socketService.disconnect();
        };

        // 🟢 THÊM: Lắng nghe sự kiện UNAUTHORIZED
        const handleUnauthorized = (event) => {
            console.log('🔴 [ADMIN LOGIN] Unauthorized:', event.detail);
            socketService.disconnect();
        };

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, []);

    /* =====================================================
        HANDLE SESSION EXPIRED CONFIRM - Đăng nhập lại
    ===================================================== */
    const handleSessionExpiredConfirm = () => {
        console.log('🔴 [ADMIN LOGIN] User xác nhận đăng nhập lại');
        setShowSessionExpiredModal(false);
        setSessionExpiredMessage('');
        setNewDevice('');
        
        // Ngắt kết nối WebSocket
        socketService.disconnect();
        
        setEmail('');
        setPassword('');
        setErrors({});
        setServerError('');
        document.getElementById('admin-email')?.focus();
    };

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

            // 🟢 THÊM: Kết nối WebSocket sau khi login thành công
            if (adminUser) {
                try {
                    socketService.connect(adminUser.user_id, adminUser.user_id);
                    console.log('🟢 [ADMIN LOGIN] Đã kết nối WebSocket cho admin:', adminUser.user_id);
                } catch (socketError) {
                    console.warn('⚠️ Không thể kết nối WebSocket:', socketError);
                }
            }

            navigate('/dashboard', { replace: true });

        } catch (err) {
            console.error('Admin Login Error:', err);
            
            // 🟢 Xử lý các mã lỗi từ backend
            const errorCode = err.response?.data?.code;
            const errorMessage = err.response?.data?.message || 'Sai tài khoản hoặc mật khẩu quản trị.';

            // SESSION_EXPIRED
            if (errorCode === 'SESSION_EXPIRED') {
                setSessionExpiredMessage(errorMessage);
                setShowSessionExpiredModal(true);
            } 
            // TOKEN_INVALID
            else if (errorCode === 'TOKEN_INVALID') {
                setServerError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
                socketService.disconnect();
            }
            // UNAUTHORIZED
            else if (errorCode === 'UNAUTHORIZED') {
                setServerError('Vui lòng đăng nhập để tiếp tục.');
                socketService.disconnect();
            }
            // Lỗi field
            else if (err.response?.data?.field === 'email') {
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

                    {serverError && (
                        <div className="admin-server-error" style={{ marginBottom: '16px' }}>
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleAdminLogin} noValidate className="admin-login-form">
                        {/* EMAIL */}
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

            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
            />

            {/* 🟢 SESSION EXPIRED MODAL - ĐÃ CẬP NHẬT */}
            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onConfirm={handleSessionExpiredConfirm}
                message={sessionExpiredMessage}
                newDevice={newDevice}
            />
        </div>
    );
};

export default AdminLogin;