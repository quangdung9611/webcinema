import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import {
    AlertCircle,
    Eye,
    EyeOff,
    CheckCircle,
} from 'lucide-react';

import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';
import LoginLockModal from '../components/LoginLockModal';

import '../styles/UserAuth.css';

const UserLogin = () => {

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
    const [loginSuccessMessage, setLoginSuccessMessage] = useState('');
    const [loggedInUser, setLoggedInUser] = useState(null);

    const [showLockModal, setShowLockModal] = useState(false);
    const [lockInfo, setLockInfo] = useState(null);

    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    const navigate = useNavigate();
    const location = useLocation();

    const {
        user,
        isLoading,
    } = useAuth();

    const isExpired = Boolean(location.state?.expired);

    // 🔥 KIỂM TRA LOCK KHI MOUNT (GỌI API ĐỂ LẤY LEVEL MỚI NHẤT)
    useEffect(() => {
        const storedEmail = localStorage.getItem('lockedEmail');
        const storedLockInfo = localStorage.getItem('lockInfo');
        
        if (storedEmail) {
            // Gọi API check-lock lên backend để lấy dữ liệu mới nhất
            api.get(`/api/auth/check-lock?email=${encodeURIComponent(storedEmail)}`)
                .then((res) => {
                    const serverData = res.data?.data || null;
                    if (serverData?.isLocked) {
                        const updatedLockInfo = {
                            email: storedEmail,
                            message: serverData.message,
                            level: serverData.level,
                            remainingSeconds: serverData.remainingSeconds,
                            lockDuration: serverData.lockDuration,
                            lockDurationText: serverData.lockDurationText,
                            maxAttempts: serverData.maxAttempts || 5,
                            lockedUntil: serverData.lockedUntil
                        };
                        setLockInfo(updatedLockInfo);
                        setShowLockModal(true);
                        localStorage.setItem('lockInfo', JSON.stringify(updatedLockInfo));
                        setLockTimeLeft(Math.max(0, Math.floor((updatedLockInfo.lockedUntil - Date.now()) / 1000)));
                    } else {
                        // Server nói không còn lock -> Xóa localStorage
                        localStorage.removeItem('lockedEmail');
                        localStorage.removeItem('lockInfo');
                    }
                })
                .catch((error) => {
                    console.error('Không thể kiểm tra lock từ server:', error);
                    // Fallback: Dùng dữ liệu cũ nếu API lỗi
                    if (storedLockInfo) {
                        try {
                            const parsed = JSON.parse(storedLockInfo);
                            if (parsed.lockedUntil > Date.now()) {
                                setLockInfo(parsed);
                                setShowLockModal(true);
                                setLockTimeLeft(Math.max(0, Math.floor((parsed.lockedUntil - Date.now()) / 1000)));
                            }
                        } catch (e) { /* ignore */ }
                    }
                });
        }
    }, []); // Chạy 1 lần khi mount

    // 🔥 ĐỒNG HỒ ĐẾM NGƯỢC ĐỘC LẬP KHI MODAL ĐÓNG
    useEffect(() => {
        if (!lockInfo || lockInfo.lockedUntil <= Date.now()) return;

        const tick = () => {
            const left = Math.max(0, Math.floor((lockInfo.lockedUntil - Date.now()) / 1000));
            setLockTimeLeft(left);
            
            if (left <= 0) {
                localStorage.removeItem('lockedEmail');
                localStorage.removeItem('lockInfo');
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
                setSuccessMessage('✅ Tài khoản đã được mở khóa. Vui lòng thử đăng nhập lại.');
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [lockInfo]);

    useEffect(() => {
        if (!location.state?.verified) return;
        setSuccessMessage(location.state.message || 'Email đã được xác thực thành công! Vui lòng đăng nhập.');
        window.history.replaceState({}, document.title);
        const timer = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(timer);
    }, [location.state]);

    useEffect(() => {
        if (user && !isLoading && !showLoginSuccessModal && !isExpired) {
            navigate('/', { replace: true });
        }
    }, [user, isLoading, showLoginSuccessModal, navigate, isExpired]);

    const validate = () => {
        const tempErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) tempErrors.email = 'Vui lòng nhập email';
        else if (!emailRegex.test(formData.email.trim())) tempErrors.email = 'Email không hợp lệ';
        if (!formData.password.trim()) tempErrors.password = 'Vui lòng nhập mật khẩu';
        else if (formData.password.length < 6) tempErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
        if (serverError) setServerError('');
        if (successMessage) setSuccessMessage('');

        if (name === 'email') {
            const storedEmail = localStorage.getItem('lockedEmail');
            if (storedEmail && storedEmail !== value) {
                localStorage.removeItem('lockedEmail');
                localStorage.removeItem('lockInfo');
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
            }
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        if (lockInfo && lockInfo.lockedUntil > Date.now()) {
            setShowLockModal(true);
            return;
        }
        if (!validate()) return;

        setLoading(true);
        setServerError('');
        setSuccessMessage('');
        setErrors({});

        try {
            const response = await api.post('/api/auth/login', {
                email: formData.email.trim(),
                password: formData.password,
                rememberMe: formData.rememberMe,
            });

            const responseUser = response?.data?.user || response?.data?.data?.user || null;
            if (responseUser && !responseUser.email_verified) {
                setServerError('Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.');
                return;
            }

            api.resetUserCache();
            notifyLogin(responseUser);
            setLoggedInUser(responseUser);
            setLoginSuccessMessage(`Chào mừng ${responseUser?.full_name || responseUser?.username || 'bạn'} quay trở lại!`);
            setShowLoginSuccessModal(true);

        } catch (error) {
            console.error('🔴 [LOGIN] Login error:', error);
            const errorData = error?.response?.data || {};
            const errorCode = errorData?.code;
            const errorMessage = errorData?.message || 'Tài khoản hoặc mật khẩu không chính xác';

            if (error?.response?.status === 429 || errorCode === 'ACCOUNT_LOCKED') {
                const lockData = errorData?.data || {};
                const lockUntilTimestamp = lockData.lockedUntil || (Date.now() + (Number(lockData.remainingSeconds) || 60) * 1000);
                const level = Number(lockData.level) || 1;
                const durationSeconds = Number(lockData.remainingSeconds) || 60;
                const durationText = lockData.lockDurationText || '1 phút';

                const lockInfoData = {
                    email: formData.email.trim(),
                    message: errorMessage,
                    level: level,
                    remainingSeconds: durationSeconds,
                    lockDuration: durationSeconds,
                    lockDurationText: durationText,
                    maxAttempts: lockData.maxAttempts || 5,
                    lockedUntil: lockUntilTimestamp
                };
                
                setLockInfo(lockInfoData);
                setShowLockModal(true);
                setLockTimeLeft(durationSeconds);
                localStorage.setItem('lockedEmail', formData.email.trim());
                localStorage.setItem('lockInfo', JSON.stringify(lockInfoData));
                return;
            }

            if (errorData?.field === 'email') { setErrors((prev) => ({ ...prev, email: errorMessage })); return; }
            if (errorData?.field === 'password') { setErrors((prev) => ({ ...prev, password: errorMessage })); return; }
            if (errorCode === 'EMAIL_NOT_VERIFIED') { setServerError(errorMessage || 'Vui lòng xác thực email trước khi đăng nhập.'); return; }

            setServerError(errorMessage);

        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccessConfirm = () => {
        setShowLoginSuccessModal(false);
        setLoggedInUser(null);
        navigate('/', { replace: true });
    };

    const handleCloseLockModal = () => {
        setShowLockModal(false);
    };

    const formatLockTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLockedActive = lockInfo && lockInfo.lockedUntil > Date.now();

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">Chào mừng bạn quay trở lại Cinema Star</p>

                {successMessage && (
                    <div className="success-message" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#22c55e20', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', marginBottom: '16px' }}>
                        <CheckCircle size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {serverError && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{serverError}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} noValidate>
                    <div className="form-group">
                        <label>Email address</label>
                        <input id="login-email" type="email" name="email" placeholder="example@gmail.com" className={`auth-input ${errors.email ? 'input-error' : ''}`} value={formData.email} onChange={handleChange} autoComplete="email" disabled={loading || isLockedActive} />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-wrapper">
                            <input type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••" className={`auth-input ${errors.password ? 'input-error' : ''}`} value={formData.password} onChange={handleChange} autoComplete="current-password" disabled={loading || isLockedActive} />
                            <button type="button" className="toggle-password" onClick={() => setShowPassword((prev) => !prev)} tabIndex="-1" disabled={loading || isLockedActive}>
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} disabled={loading || isLockedActive} />
                            Remember me
                        </label>
                        <button type="button" className="forgot-link" onClick={() => setShowForgotModal(true)} disabled={loading || isLockedActive}>
                            Forgot password?
                        </button>
                    </div>

                    <LoadingButton type="submit" loading={loading} loadingText="Đang đăng nhập..." disabled={loading || isLockedActive} className="btn-user" spinnerColor="#000000">
                        {isLockedActive ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                ĐANG BỊ KHÓA 
                                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    {formatLockTime(lockTimeLeft)}
                                </span>
                            </span>
                        ) : (
                            'SIGN IN'
                        )}
                    </LoadingButton>
                </form>

                <div className="auth-footer">
                    <span>Chưa có tài khoản?</span>
                    <Link to="/register" className="btn-link">Đăng ký ngay</Link>
                </div>
            </div>

            {showForgotModal && <ForgotPassword onClose={() => setShowForgotModal(false)} />}

            <SuccessModal isOpen={showLoginSuccessModal} onConfirm={handleLoginSuccessConfirm} onClose={handleLoginSuccessConfirm} title="🎉 Đăng nhập thành công!" message={loginSuccessMessage} confirmText="Vào trang chủ" autoClose={true} autoCloseDelay={3000} />

            <LoginLockModal show={showLockModal} message={lockInfo?.message || 'Tài khoản đã bị khóa'} lockedUntil={lockInfo?.lockedUntil || Date.now() + 60000} lockLevel={lockInfo?.level || 1} lockDurationText={lockInfo?.lockDurationText || '1 phút'} email={lockInfo?.email || formData.email} onClose={handleCloseLockModal} />
        </div>
    );
};

export default UserLogin;