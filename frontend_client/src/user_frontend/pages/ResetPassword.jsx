// ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { LockKeyhole, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import ResetPasswordSuccessModal from '../components/ResetPasswordSuccessModal';
import useOTPGuard from '../../hooks/useOTPGuard'; // 🔥 IMPORT
import '../styles/UserAuth.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const purpose = 'RESET_PASSWORD';

    // 🔥 SỬ DỤNG useOTPGuard
    const { safeNavigate } = useOTPGuard(email, purpose, {
        onInvalidate: () => {
            console.log('🔴 [RESET PASSWORD] OTP đã bị vô hiệu do rời trang');
        }
    });

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isCheckingOTP, setIsCheckingOTP] = useState(true);
    const [isOtpValid, setIsOtpValid] = useState(false);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // ============================================================
    // 🔥 KIỂM TRA OTP CÒN HIỆU LỰC KHI VÀO TRANG
    // ============================================================
    useEffect(() => {
        const checkOTP = async () => {
            if (!email || !otp) {
                safeNavigate('/forgot-password');
                return;
            }

            try {
                setIsCheckingOTP(true);
                const response = await api.get('/api/auth/check-otp-ttl', {
                    params: { email, purpose }
                });

                const data = response.data?.data;
                if (data?.exists && data?.expiresIn > 0) {
                    setIsOtpValid(true);
                } else {
                    // OTP đã hết hạn hoặc không tồn tại
                    setMessage('❌ Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.');
                    setMessageType('error');
                    // Sau 3 giây chuyển về forgot-password
                    setTimeout(() => {
                        safeNavigate('/forgot-password', {
                            state: { error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' }
                        });
                    }, 3000);
                }
            } catch (error) {
                console.error('❌ [RESET PASSWORD] Check OTP error:', error);
                setMessage('❌ Không thể kiểm tra OTP. Vui lòng thử lại.');
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

    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) return;

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    setMessage('');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

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
        if (message) setMessage('');
        if (messageType) setMessageType('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setFieldErrors({});

        if (isRateLimited) {
            setMessage(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
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

            const res = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword
            });

            setMessage(res.data.message || 'Đặt lại mật khẩu thành công!');
            setMessageType('success');
            setShowSuccessModal(true);

        } catch (err) {
            const status = err.response?.status;
            const field = err.response?.data?.field;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể đặt lại mật khẩu';
            const errorCode = errorData.code;

            if (field === 'newPassword') {
                setFieldErrors({ newPassword: errorMessage });
            } else if (field === 'confirmPassword') {
                setFieldErrors({ confirmPassword: errorMessage });
            } else if (status === 404) {
                setMessage('❌ Email này chưa được đăng ký trong hệ thống.');
                setMessageType('error');
            } else if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                setMessage(`⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần. Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setMessageType('error');
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else if (status === 400 && errorMessage?.toLowerCase().includes('otp')) {
                setMessage('❌ Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
                setMessageType('error');
            } else {
                setMessage(errorMessage);
                setMessageType('error');
            }
        } finally {
            setLoading(false);
        }
    };

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

    // 🔥 HIỂN THỊ LOADING KHI KIỂM TRA OTP
    if (isCheckingOTP) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="forgot-icon-wrapper">
                        <LockKeyhole size={42} className="forgot-icon" />
                    </div>
                    <h2>ĐẶT LẠI MẬT KHẨU</h2>
                    <p className="auth-subtitle">⏳ Đang kiểm tra mã OTP...</p>
                    <div className="loading-spinner" style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner"></div>
                    </div>
                </div>
            </div>
        );
    }

    // 🔥 NẾU OTP KHÔNG HỢP LỆ, KHÔNG HIỂN THỊ FORM
    if (!isOtpValid) {
        return null;
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <LockKeyhole size={42} className="forgot-icon" />
                </div>

                <h2>ĐẶT LẠI MẬT KHẨU</h2>
                <p className="auth-subtitle">
                    Nhập mật khẩu mới cho tài khoản <strong className="text-highlight">{email}</strong>
                </p>

                {message && (
                    <div className={`forgot-message ${messageType}`}>
                        {messageType === 'success' ? (
                            <CheckCircle size={18} />
                        ) : (
                            <AlertCircle size={18} />
                        )}
                        <span>{message}</span>
                    </div>
                )}

                <div className="auth-form-wrapper">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label>Mật khẩu mới</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={`auth-input ${fieldErrors.newPassword ? 'input-error' : ''}`}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                                    value={newPassword}
                                    onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                                    disabled={loading || isRateLimited}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                    disabled={loading || isRateLimited}
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {fieldErrors.newPassword && (
                                <span className="error-text">{fieldErrors.newPassword}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Xác nhận mật khẩu</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className={`auth-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                                    disabled={loading || isRateLimited}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                    disabled={loading || isRateLimited}
                                >
                                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <span className="error-text">{fieldErrors.confirmPassword}</span>
                            )}
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                loadingText="Đang xử lý..."
                                disabled={loading || isRateLimited}
                                className="btn-user btn-user-silver"
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

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={() => safeNavigate('/forgot-password')}
                        disabled={loading}
                    >
                        <ArrowLeft size={16} />
                        Quay lại
                    </button>
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

export default ResetPassword;