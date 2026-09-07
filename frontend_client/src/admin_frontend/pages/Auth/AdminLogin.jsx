// admin_frontend/pages/Auth/AdminLogin.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Mail, Lock, Sparkles, Clapperboard, ChartColumn, Timer } from 'lucide-react';
import adminapi from '../../../api/adminapi';
import socketService from '../../../api/socket';
import Modal from '../../components/AdminModal';
import LoadingButton from '../../../user_frontend/components/LoadingButton';
import SuccessModal from '../../../user_frontend/components/SuccessModal';
import LoginLockModal from '../../../user_frontend/components/LoginLockModal'; // 🔥 Dùng LoginLockModal
import '../../styles/AdminAuth.css';

const AdminLogin = () => {
    /* ===================================================== REF ===================================================== */
    const formRef = useRef(null);
    const lockIntervalRef = useRef(null);

    /* ===================================================== STATES ===================================================== */
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
    const [loginSuccessMessage, setLoginSuccessMessage] = useState('');
    const [loggedInUser, setLoggedInUser] = useState(null);

    /* ===================================================== LOGIN LOCK ===================================================== */
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockInfo, setLockInfo] = useState(null);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    /* ===================================================== ROUTER ===================================================== */
    const navigate = useNavigate();
    const location = useLocation();

    /* ===================================================== LOCAL STORAGE KEY ===================================================== */
    const LOCK_STORAGE_KEY = 'admin_login_lock';

    /* ===================================================== LƯU LOCK VÀO LOCAL STORAGE ===================================================== */
    const saveLockToStorage = (lockData) => {
        if (lockData && lockData.lockedUntil > Date.now()) {
            const dataToStore = { ...lockData, lockedAt: Date.now() };
            localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(dataToStore));
            localStorage.setItem('adminLockedEmail', lockData.email);
        } else {
            localStorage.removeItem(LOCK_STORAGE_KEY);
            localStorage.removeItem('adminLockedEmail');
        }
    };

    /* ===================================================== KHÔI PHỤC LOCK TỪ LOCAL STORAGE ===================================================== */
    const restoreLockFromStorage = () => {
        try {
            const stored = localStorage.getItem(LOCK_STORAGE_KEY);
            if (!stored) return null;
            const lockData = JSON.parse(stored);
            const remaining = Math.max(0, Math.ceil((lockData.lockedUntil - Date.now()) / 1000));
            if (remaining > 0) {
                return { ...lockData, remainingSeconds: remaining, lockedUntil: lockData.lockedUntil };
            } else {
                localStorage.removeItem(LOCK_STORAGE_KEY);
                localStorage.removeItem('adminLockedEmail');
                return null;
            }
        } catch (error) {
            console.warn('⚠️ [ADMIN LOGIN] Không thể restore lock:', error);
            localStorage.removeItem(LOCK_STORAGE_KEY);
            localStorage.removeItem('adminLockedEmail');
            return null;
        }
    };

    /* ===================================================== CLEANUP LOCK INTERVAL ===================================================== */
    useEffect(() => {
        return () => {
            if (lockIntervalRef.current) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
        };
    }, []);

    /* ===================================================== CLEAR FORM KHI COMPONENT MOUNT ===================================================== */
    useEffect(() => {
        if (formRef.current) formRef.current.reset();
        setEmail('');
        setPassword('');
        console.log('🔄 [ADMIN LOGIN] Form đã được reset');
    }, []);

    /* ===================================================== LOAD LOCK STATUS KHI REFRESH ===================================================== */
    useEffect(() => {
        const restoredLock = restoreLockFromStorage();
        if (restoredLock) {
            setLockInfo(restoredLock);
            setShowLockModal(true);
            setLockTimeLeft(restoredLock.remainingSeconds);
            return;
        }
        const storedEmail = localStorage.getItem('adminLockedEmail');
        if (!storedEmail) return;
        adminapi.get(`/api/auth/check-lock?email=${encodeURIComponent(storedEmail)}`)
            .then((res) => {
                const serverData = res.data?.data || null;
                if (serverData?.isLocked) {
                    const remainingSeconds = Math.max(0, Number(serverData.remainingSeconds) || 0);
                    const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;
                    const updatedLockInfo = {
                        email: storedEmail,
                        message: serverData.message,
                        level: Number(serverData.level) || 1,
                        remainingSeconds,
                        lockDuration: Number(serverData.lockDuration) || remainingSeconds,
                        lockDurationText: serverData.lockDurationText || '1 phút',
                        maxAttempts: serverData.maxAttempts || 5,
                        lockedUntil: lockUntilTimestamp,
                        lockedAt: Date.now(),
                    };
                    setLockInfo(updatedLockInfo);
                    setShowLockModal(true);
                    setLockTimeLeft(remainingSeconds);
                    saveLockToStorage(updatedLockInfo);
                } else {
                    localStorage.removeItem('adminLockedEmail');
                    localStorage.removeItem(LOCK_STORAGE_KEY);
                }
            })
            .catch((error) => {
                console.error('❌ [ADMIN LOGIN] Không thể kiểm tra lock từ server:', error);
            });
    }, []);

    /* ===================================================== COUNTDOWN LOGIN LOCK ===================================================== */
    useEffect(() => {
        if (lockIntervalRef.current) {
            clearInterval(lockIntervalRef.current);
            lockIntervalRef.current = null;
        }
        if (!lockInfo?.lockedUntil) return;
        if (lockInfo.lockedUntil <= Date.now()) {
            setLockInfo(null);
            setShowLockModal(false);
            setLockTimeLeft(0);
            localStorage.removeItem(LOCK_STORAGE_KEY);
            localStorage.removeItem('adminLockedEmail');
            return;
        }
        const updateLockTime = () => {
            const left = Math.max(0, Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000));
            setLockTimeLeft(left);
            if (left <= 0) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
                localStorage.removeItem(LOCK_STORAGE_KEY);
                localStorage.removeItem('adminLockedEmail');
                setSuccessMessage('✅ Tài khoản admin đã được mở khóa. Vui lòng thử đăng nhập lại.');
                setTimeout(() => { setSuccessMessage(''); }, 5000);
            } else {
                if (left % 5 === 0 || left <= 10) {
                    const updatedLockInfo = { ...lockInfo, remainingSeconds: left, lockedAt: Date.now() };
                    saveLockToStorage(updatedLockInfo);
                }
            }
        };
        updateLockTime();
        lockIntervalRef.current = setInterval(updateLockTime, 1000);
        return () => {
            if (lockIntervalRef.current) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
        };
    }, [lockInfo?.lockedUntil]);

    /* ===================================================== CHECK REDIRECT TỪ SESSION EXPIRED ===================================================== */
    useEffect(() => {
        if (!location.state?.expired) return;
        const message = location.state?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        setServerError(message);
        window.history.replaceState({}, document.title);
    }, [location.state]);

    /* ===================================================== CHECK ADMIN SESSION ===================================================== */
    useEffect(() => {
        let cancelled = false;
        const checkAdminSession = async () => {
            try {
                const res = await adminapi.get('/admin/api/auth/me');
                if (cancelled) return;
                const adminUser = res.data?.user;
                if (adminUser && adminUser.role === 'admin') {
                    console.log('🟢 [ADMIN LOGIN] Đã có session admin:', adminUser.user_id);
                    try {
                        socketService.connect(adminUser.user_id);
                    } catch (socketError) {
                        console.warn('⚠️ [ADMIN LOGIN] Không thể kết nối WebSocket:', socketError);
                    }
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.log('ℹ️ [ADMIN LOGIN] Chưa đăng nhập admin → hiển thị form login.');
            }
        };
        checkAdminSession();
        return () => { cancelled = true; };
    }, [navigate]);

    /* ===================================================== MODAL ===================================================== */
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => {},
    });

    /* ===================================================== VALIDATE ===================================================== */
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

    /* ===================================================== FORMAT TIME ===================================================== */
    const formatLockTime = (totalSeconds) => {
        if (totalSeconds <= 0) return '0:00';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLockedActive = lockInfo && lockInfo.lockedUntil > Date.now();

    /* ===================================================== HANDLE ADMIN LOGIN ===================================================== */
    const handleAdminLogin = async (e) => {
        e.preventDefault();
        if (lockInfo && lockInfo.lockedUntil > Date.now()) {
            setShowLockModal(true);
            return;
        }
        if (!validate()) return;
        setLoading(true);
        setServerError('');
        setSuccessMessage('');
        try {
            const response = await adminapi.post('/admin/api/auth/login', {
                email: email.trim(),
                password: password,
                rememberMe: false,
            });
            const adminUser = response.data?.user;
            /* ================================================ KIỂM TRA ROLE ================================================ */
            if (adminUser && adminUser.role && adminUser.role !== 'admin') {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'TRUY CẬP BỊ TỪ CHỐI',
                    message: 'Tài khoản này không có quyền quản trị.',
                    onConfirm: () => {
                        setModalConfig((prev) => ({ ...prev, show: false }));
                    },
                });
                setLoading(false);
                return;
            }
            /* ================================================ KẾT NỐI SOCKET SAU KHI LOGIN THÀNH CÔNG ================================================ */
            if (adminUser) {
                try {
                    socketService.connect(adminUser.user_id);
                    console.log('🟢 [ADMIN LOGIN] Đã kết nối WebSocket cho admin:', adminUser.user_id);
                } catch (socketError) {
                    console.warn('⚠️ [ADMIN LOGIN] Không thể kết nối WebSocket:', socketError);
                }
            }
            /* ================================================ LOGIN SUCCESS ================================================ */
            setLoggedInUser(adminUser);
            setLoginSuccessMessage(`Chào mừng Admin ${adminUser?.full_name || adminUser?.username || 'bạn'} quay trở lại!`);
            setShowLoginSuccessModal(true);
        } catch (err) {
            console.error('❌ [ADMIN LOGIN] Login Error:', err);
            const errorData = err.response?.data || {};
            const errorCode = errorData?.code;
            const errorMessage = errorData?.message || 'Sai tài khoản hoặc mật khẩu quản trị.';
            /* ================================================ ACCOUNT LOCKED ================================================ */
            if (err.response?.status === 429 || errorCode === 'ACCOUNT_LOCKED') {
                const lockData = errorData?.data || {};
                const level = Number(lockData.level) || 1;
                const remainingSeconds = Math.max(0, Number(lockData.remainingSeconds) || 60);
                const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;
                const durationText = lockData.lockDurationText || (level >= 2 ? '3 phút' : '1 phút');
                const lockInfoData = {
                    email: email.trim(),
                    message: errorMessage,
                    level,
                    remainingSeconds,
                    lockDuration: remainingSeconds,
                    lockDurationText: durationText,
                    maxAttempts: lockData.maxAttempts || 5,
                    lockedUntil: lockUntilTimestamp,
                    lockedAt: Date.now(),
                };
                setLockInfo(lockInfoData);
                setShowLockModal(true);
                setLockTimeLeft(remainingSeconds);
                saveLockToStorage(lockInfoData);
                return;
            }
            /* ================================================ SESSION EXPIRED ================================================ */
            if (errorCode === 'SESSION_EXPIRED') {
                console.log('🔴 [ADMIN LOGIN] Nhận lỗi SESSION_EXPIRED từ login API');
                setServerError(errorMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            } else if (errorCode === 'SESSION_REPLACED') {
                setServerError(errorMessage || 'Tài khoản đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.');
            } else if (errorCode === 'TOKEN_INVALID') {
                setServerError(errorMessage || 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
                socketService.disconnect();
            } else if (errorCode === 'UNAUTHORIZED') {
                setServerError(errorMessage || 'Vui lòng đăng nhập để tiếp tục.');
                socketService.disconnect();
            } else if (errorData?.field === 'email') {
                setErrors({ email: errorMessage });
            } else if (errorData?.field === 'password') {
                setErrors({ password: errorMessage });
            } else {
                setServerError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    /* ===================================================== LOGIN SUCCESS CONFIRM ===================================================== */
    const handleLoginSuccessConfirm = () => {
        setShowLoginSuccessModal(false);
        setLoggedInUser(null);
        navigate('/dashboard', { replace: true });
    };

    /* ===================================================== CLOSE LOCK MODAL ===================================================== */
    const handleCloseLockModal = () => {
        setShowLockModal(false);
    };

    /* ===================================================== RENDER ===================================================== */
    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-overlay"></div>
            <div className="admin-login-container">
                {/* LEFT PANEL */}
                <div className="admin-login-left">
                    <div className="admin-brand">
                        <div className="admin-brand-logo"><Sparkles size={34} /></div>
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
                            <div><strong>Bảo mật</strong><span>An toàn hệ thống</span></div>
                        </div>
                        <div className="admin-feature-card">
                            <ChartColumn size={24} />
                            <div><strong>Quản lý</strong><span>Thống kê doanh thu</span></div>
                        </div>
                        <div className="admin-feature-card">
                            <Timer size={24} />
                            <div><strong>Nhanh chóng</strong><span>Xử lý realtime</span></div>
                        </div>
                    </div>
                    <div className="admin-cinema-icon"><Clapperboard size={260} /></div>
                </div>
                {/* RIGHT PANEL */}
                <div className="admin-login-right">
                    <div className="admin-login-header">
                        <div className="admin-login-icon"><ShieldCheck size={26} /></div>
                        <h2>Chào mừng trở lại!</h2>
                        <p>Đăng nhập để tiếp tục quản trị hệ thống.</p>
                    </div>
                    {successMessage && (
                        <div className="success-message" style={{ marginBottom: '16px', color: '#4ade80' }}>
                            {successMessage}
                        </div>
                    )}
                    {serverError && (
                        <div className="admin-server-error" style={{ marginBottom: '16px' }}>
                            {serverError}
                        </div>
                    )}
                    <form ref={formRef} onSubmit={handleAdminLogin} noValidate className="admin-login-form">
                        <input type="text" style={{ display: 'none' }} />
                        <input type="password" style={{ display: 'none' }} />
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
                                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                                        if (serverError) setServerError('');
                                    }}
                                    autoComplete="email"
                                    disabled={loading || isLockedActive}
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
                                        if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                                        if (serverError) setServerError('');
                                    }}
                                    autoComplete="current-password"
                                    disabled={loading || isLockedActive}
                                />
                                <button
                                    type="button"
                                    className="toggle-password-btn"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    tabIndex="-1"
                                    disabled={loading || isLockedActive}
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
                            disabled={loading || isLockedActive}
                            className="btn-admin-login"
                            spinnerColor="#000000"
                        >
                            {isLockedActive ? `ĐANG BỊ KHÓA (${formatLockTime(lockTimeLeft)})` : 'ĐĂNG NHẬP HỆ THỐNG'}
                        </LoadingButton>
                    </form>
                    <div className="admin-login-footer">© 2026 Cinema Star Admin</div>
                </div>
            </div>
            {/* GENERAL MODAL */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
            />
            {/* LOGIN SUCCESS MODAL */}
            <SuccessModal
                isOpen={showLoginSuccessModal}
                onConfirm={handleLoginSuccessConfirm}
                onClose={handleLoginSuccessConfirm}
                title="🎉 Đăng nhập thành công!"
                message={loginSuccessMessage}
                confirmText="Vào Dashboard"
                autoClose={true}
                autoCloseDelay={3000}
            />
            {/* LOGIN LOCK MODAL - DÙNG LoginLockModal GIỐNG UserLogin */}
            <LoginLockModal
                show={showLockModal}
                message={lockInfo?.message || 'Tài khoản admin đã bị khóa'}
                lockedUntil={lockInfo?.lockedUntil || Date.now() + 60000}
                lockLevel={lockInfo?.level || 1}
                lockDurationText={lockInfo?.lockDurationText || '1 phút'}
                email={lockInfo?.email || email}
                onClose={handleCloseLockModal}
            />
        </div>
    );
};

export default AdminLogin;