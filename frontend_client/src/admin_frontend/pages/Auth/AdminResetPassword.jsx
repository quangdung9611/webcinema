// admin_frontend/pages/Auth/AdminResetPassword.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import adminapi from '../../../api/adminapi';
import {
    LockKeyhole,
    AlertCircle,
    AlertTriangle,
    XCircle,
    CheckCircle,
    ArrowLeft,
    Eye,
    EyeOff,
    Loader2,
} from 'lucide-react';
import LoadingButton from '../../../user_frontend/components/LoadingButton';
import ResetPasswordSuccessModal from '../../../user_frontend/components/ResetPasswordSuccessModal';
import useOTPGuard from '../../../hooks/useAdminOTPGuard';
import '../../styles/AdminAuth.css';

const AdminResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const purpose = 'RESET_PASSWORD';

    const { safeNavigate } = useOTPGuard(email, purpose, {
        onInvalidate: () => {
            console.log('[ADMIN RESET PASSWORD] OTP đã bị vô hiệu do rời trang');
        }
    });

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isCheckingOTP, setIsCheckingOTP] = useState(true);
    const [isOtpValid, setIsOtpValid] = useState(false);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    const makeMessage = (IconComponent, text) => ({
        icon: <IconComponent size={18} />,
        text,
    });

    // ============================================================
    // CHECK OTP KHI VÀO TRANG
    // ============================================================
    useEffect(() => {
        const checkOTP = async () => {
            if (!email || !otp) {
                safeNavigate('/forgot-password');
                return;
            }

            try {
                setIsCheckingOTP(true);
                const response = await adminapi.get('/admin/api/auth/check-otp-ttl', {
                    params: { email, purpose }
                });

                const data = response.data?.data;
                if (data?.exists && data?.expiresIn > 0) {
                    setIsOtpValid(true);
                } else {
                    setMessage(makeMessage(
                        XCircle,
                        'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.'
                    ));
                    setMessageType('error');
                    setTimeout(() => {
                        safeNavigate('/forgot-password', {
                            state: { error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' }
                        });
                    }, 3000);
                }
            } catch (error) {
                console.error('[ADMIN RESET PASSWORD] Check OTP error:', error);
                setMessage(makeMessage(
                    XCircle,
                    'Không thể kiểm tra OTP. Vui lòng thử lại.'
                ));
                setMessageType('error');
                setTimeout(() => {
                    safeNavigate('/forgot-password');
                }, 3000);
            } finally {
                setIsCheckingOTP(false);
            }
        };

        checkOTP();
    }, [email, otp, purpose, safeNavigate]);

    // ============================================================
    // RATE LIMIT TIMER
    // ============================================================
    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) return;

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    setMessage(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    // ============================================================
    // HANDLE FIELD CHANGE
    // ============================================================
    const handleFieldChange = (field, value) => {
        if (field === 'newPassword') {
            setNewPassword(value);
            if (fieldErrors.newPassword) {
                setFieldErrors(prev => ({ ...prev, newPassword: '' }));
            }
        } else if (field === 'confirmPassword') {
            setConfirmPassword(value);
            if (fieldErrors.confirmPassword) {
                setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
            }
        }
        if (message) setMessage(null);
        if (messageType) setMessageType('');
    };

    // ============================================================
    // HANDLE SUBMIT
    // ============================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setFieldErrors({});

        if (isRateLimited) {
            setMessage(makeMessage(
                AlertTriangle,
                `Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`
            ));
            setMessageType('error');
            return;
        }

        let hasError = false;
        const errors = {};

        if (!newPassword.trim()) {
            errors.newPassword = 'Vui lòng nhập mật khẩu mới';
            hasError = true;
        } else if (newPassword.length < 8) {
            errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
            hasError = true;
        }

        if (!confirmPassword.trim()) {
            errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(errors);
            return;
        }

        try {
            setLoading(true);

            const res = await adminapi.post('/admin/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword
            });

            setMessage(makeMessage(
                CheckCircle,
                res.data.message || 'Đặt lại mật khẩu thành công!'
            ));
            setMessageType('success');
            setShowSuccessModal(true);

        } catch (err) {
            const status = err.response?.status;
            const field = err.response?.data?.field;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể đặt lại mật khẩu';

            if (field === 'newPassword') {
                setFieldErrors({ newPassword: errorMessage });
            } else if (field === 'confirmPassword') {
                setFieldErrors({ confirmPassword: errorMessage });
            } else if (status === 404) {
                setMessage(makeMessage(
                    XCircle,
                    'Email này chưa được đăng ký trong hệ thống.'
                ));
                setMessageType('error');
            } else if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                setMessage(makeMessage(
                    AlertTriangle,
                    `Bạn chỉ được gửi tối đa ${maxAttempts} lần. Vui lòng thử lại sau ${remainingSeconds} giây.`
                ));
                setMessageType('error');
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else if (status === 400 && errorMessage?.toLowerCase().includes('otp')) {
                setMessage(makeMessage(
                    XCircle,
                    'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
                ));
                setMessageType('error');
            } else {
                setMessage(makeMessage(AlertCircle, errorMessage));
                setMessageType('error');
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // MODAL HANDLERS
    // ============================================================
    const handleModalConfirm = () => {
        setShowSuccessModal(false);
        safeNavigate('/login');
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        safeNavigate('/login');
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ============================================================
    // LOADING STATE
    // ============================================================
    if (isCheckingOTP) {
        return (
            <div className="admin-login-wrapper">
                <div className="admin-login-overlay"></div>

                <div className="admin-forgot-container">
                    <div className="admin-forgot-card">
                        <div className="admin-forgot-icon-wrapper">
                            <LockKeyhole size={42} className="admin-forgot-icon" />
                        </div>
                        <h2>ĐẶT LẠI MẬT KHẨU</h2>
                        <p className="admin-forgot-subtitle admin-checking">
                            <Loader2 size={16} className="spin-icon" />
                            Đang kiểm tra mã OTP...
                        </p>
                        <div className="admin-loading-spinner-large">
                            <div className="admin-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // NẾU OTP KHÔNG HỢP LỆ
    // ============================================================
    if (!isOtpValid) {
        return null;
    }

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-overlay"></div>

            <div className="admin-forgot-container">
                <div className="admin-forgot-card">
                    <div className="admin-forgot-icon-wrapper">
                        <LockKeyhole size={42} className="admin-forgot-icon" />
                    </div>

                    <h2>ĐẶT LẠI MẬT KHẨU ADMIN</h2>
                    <p className="admin-forgot-subtitle">
                        Nhập mật khẩu mới cho tài khoản <strong className="admin-text-highlight">{email}</strong>
                    </p>

                    {message && (
                        <div className={`admin-forgot-message ${messageType}`}>
                            {message.icon}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <div className="admin-forgot-form-wrapper">
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="admin-forgot-form-group">
                                <label>Mật khẩu mới</label>
                                <div className="admin-password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`admin-forgot-input ${fieldErrors.newPassword ? 'input-error' : ''}`}
                                        placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                                        value={newPassword}
                                        onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                                        disabled={loading || isRateLimited}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="admin-toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex="-1"
                                        disabled={loading || isRateLimited}
                                    >
                                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                                {fieldErrors.newPassword && (
                                    <span className="admin-error-text">{fieldErrors.newPassword}</span>
                                )}
                            </div>

                            <div className="admin-forgot-form-group">
                                <label>Xác nhận mật khẩu</label>
                                <div className="admin-password-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className={`admin-forgot-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                                        placeholder="Nhập lại mật khẩu"
                                        value={confirmPassword}
                                        onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                                        disabled={loading || isRateLimited}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="admin-toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex="-1"
                                        disabled={loading || isRateLimited}
                                    >
                                        {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                                {fieldErrors.confirmPassword && (
                                    <span className="admin-error-text">{fieldErrors.confirmPassword}</span>
                                )}
                            </div>

                            <div className="admin-forgot-button-group">
                                <LoadingButton
                                    type="submit"
                                    loading={loading}
                                    loadingText="Đang xử lý..."
                                    disabled={loading || isRateLimited}
                                    className="btn-admin-forgot"
                                    spinnerColor="#000000"
                                >
                                    {isRateLimited ? (
                                        `ĐANG CHỜ (${formatTime(rateLimitTimeLeft)})`
                                    ) : (
                                        'XÁC NHẬN ĐẶT LẠI'
                                    )}
                                </LoadingButton>
                            </div>
                        </form>
                    </div>

                    <div className="admin-forgot-footer">
                        <button
                            type="button"
                            className="admin-back-link"
                            onClick={() => safeNavigate('/forgot-password')}
                            disabled={loading}
                        >
                            <ArrowLeft size={16} />
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>

            <ResetPasswordSuccessModal
                show={showSuccessModal}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
            />
        </div>
    );
};

export default AdminResetPassword;