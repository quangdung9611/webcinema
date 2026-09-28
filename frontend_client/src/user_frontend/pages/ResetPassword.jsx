// user_frontend/pages/ResetPassword.jsx
// ============================================================
// RESET PASSWORD — PREMIUM CINEMATIC SILVER
// Layout: form card ở giữa màn hình
// Giữ nguyên 100% logic
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';

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
    Film,
    ShieldCheck,
    KeyRound,
} from 'lucide-react';

import LoadingButton from '../components/LoadingButton';
import ResetPasswordSuccessModal from '../components/ResetPasswordSuccessModal';
import useOTPGuard from '../../hooks/useOTPGuard';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const purpose = 'RESET_PASSWORD';

    const { safeNavigate } = useOTPGuard(email, purpose, {
        onInvalidate: () => {
            console.log(
                '[RESET PASSWORD] OTP đã bị vô hiệu do rời trang'
            );
        },
    });

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);
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
    // CHECK OTP ON MOUNT
    // ============================================================
    useEffect(() => {
        const checkOTP = async () => {
            if (!email || !otp) {
                safeNavigate('/forgot-password');
                return;
            }

            try {
                setIsCheckingOTP(true);
                const response = await api.get(
                    '/api/auth/check-otp-ttl',
                    {
                        params: { email, purpose },
                    }
                );

                const data = response.data?.data;
                if (data?.exists && data?.expiresIn > 0) {
                    setIsOtpValid(true);
                } else {
                    setMessage(
                        makeMessage(
                            XCircle,
                            'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.'
                        )
                    );
                    setMessageType('error');
                    setTimeout(() => {
                        safeNavigate('/forgot-password', {
                            state: {
                                error:
                                    'Mã OTP đã hết hạn. Vui lòng gửi lại.',
                            },
                        });
                    }, 3000);
                }
            } catch (error) {
                console.error(
                    '[RESET PASSWORD] Check OTP error:',
                    error
                );
                setMessage(
                    makeMessage(
                        XCircle,
                        'Không thể kiểm tra OTP. Vui lòng thử lại.'
                    )
                );
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
            setRateLimitTimeLeft((prev) => {
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

    const handleFieldChange = (field, value) => {
        if (field === 'newPassword') {
            setNewPassword(value);
            if (fieldErrors.newPassword) {
                setFieldErrors((prev) => ({
                    ...prev,
                    newPassword: '',
                }));
            }
        } else if (field === 'confirmPassword') {
            setConfirmPassword(value);
            if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: '',
                }));
            }
        }
        if (message) setMessage(null);
        if (messageType) setMessageType('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setFieldErrors({});

        if (isRateLimited) {
            setMessage(
                makeMessage(
                    AlertTriangle,
                    `Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`
                )
            );
            setMessageType('error');
            return;
        }

        let hasError = false;
        const errors = {};

        if (!newPassword.trim()) {
            errors.newPassword = 'Vui lòng nhập mật khẩu mới';
            hasError = true;
        } else if (newPassword.length < 8) {
            errors.newPassword =
                'Mật khẩu phải có ít nhất 8 ký tự';
            hasError = true;
        }

        if (!confirmPassword.trim()) {
            errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword =
                'Mật khẩu xác nhận không khớp';
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(errors);
            return;
        }

        try {
            setLoading(true);

            const res = await api.post(
                '/api/auth/verify-otp-and-reset',
                {
                    email,
                    otp,
                    newPassword,
                }
            );

            setMessage(
                makeMessage(
                    CheckCircle,
                    res.data.message ||
                        'Đặt lại mật khẩu thành công!'
                )
            );
            setMessageType('success');
            setShowSuccessModal(true);
        } catch (err) {
            const status = err.response?.status;
            const field = err.response?.data?.field;
            const errorData = err.response?.data || {};
            const errorMessage =
                errorData.message ||
                'Không thể đặt lại mật khẩu';

            if (field === 'newPassword') {
                setFieldErrors({
                    newPassword: errorMessage,
                });
            } else if (field === 'confirmPassword') {
                setFieldErrors({
                    confirmPassword: errorMessage,
                });
            } else if (status === 404) {
                setMessage(
                    makeMessage(
                        XCircle,
                        'Email này chưa được đăng ký trong hệ thống.'
                    )
                );
                setMessageType('error');
            } else if (status === 429) {
                const remainingSeconds =
                    errorData.data?.remainingSeconds || 60;
                const maxAttempts =
                    errorData.data?.maxAttempts || 3;
                setMessage(
                    makeMessage(
                        AlertTriangle,
                        `Bạn chỉ được gửi tối đa ${maxAttempts} lần. Vui lòng thử lại sau ${remainingSeconds} giây.`
                    )
                );
                setMessageType('error');
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else if (
                status === 400 &&
                errorMessage?.toLowerCase().includes('otp')
            ) {
                setMessage(
                    makeMessage(
                        XCircle,
                        'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
                    )
                );
                setMessageType('error');
            } else {
                setMessage(
                    makeMessage(AlertCircle, errorMessage)
                );
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

    // ============================================================
    // LOADING STATE
    // ============================================================
    if (isCheckingOTP) {
        return (
            <div className="reset-page">
                <div className="reset-page__logo">
                    <Film size={20} strokeWidth={2.4} />
                    <span>Cinema Star</span>
                </div>

                <div className="reset-shell">
                    <div className="reset-card">
                        <div className="reset-card__header">
                            <div className="reset-card__icon">
                                <LockKeyhole
                                    size={30}
                                    strokeWidth={2}
                                />
                            </div>

                            <div className="reset-card__eyebrow">
                                RESET PASSWORD
                            </div>

                            <h1 className="reset-card__title">
                                ĐẶT LẠI MẬT KHẨU
                            </h1>

                            <p className="reset-card__subtitle">
                                Đang kiểm tra mã OTP...
                            </p>
                        </div>

                        <div className="reset-loading">
                            <Loader2
                                size={20}
                                className="reset-spin"
                            />
                            <span>Đang xác thực OTP...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isOtpValid) {
        return null;
    }

    // ============================================================
    // MAIN FORM
    // ============================================================
    return (
        <div className="reset-page">
            <div className="reset-page__logo">
                <Film size={20} strokeWidth={2.4} />
                <span>Cinema Star</span>
            </div>

            <div className="reset-shell">
                <div className="reset-card">
                    <div className="reset-card__header">
                        <div className="reset-card__icon">
                            <LockKeyhole
                                size={30}
                                strokeWidth={2}
                            />
                        </div>

                        <div className="reset-card__eyebrow">
                            RESET PASSWORD
                        </div>

                        <h1 className="reset-card__title">
                            ĐẶT LẠI MẬT KHẨU
                        </h1>

                        <p className="reset-card__subtitle">
                            Nhập mật khẩu mới cho tài khoản{' '}
                            <strong className="reset-card__email">
                                {email}
                            </strong>
                        </p>
                    </div>

                    {message && (
                        <div
                            className={`reset-alert reset-alert--${messageType}`}
                        >
                            {message.icon}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <form
                        className="reset-form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        {/* NEW PASSWORD */}
                        <div className="reset-field">
                            <label
                                htmlFor="reset-new-password"
                                className="reset-field__label"
                            >
                                <span>Mật khẩu mới</span>
                                <small>Tối thiểu 8 ký tự</small>
                            </label>

                            <div className="reset-field__wrap">
                                <LockKeyhole
                                    className="reset-field__icon"
                                    size={16}
                                    strokeWidth={2}
                                />

                                <input
                                    id="reset-new-password"
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    className={`reset-field__input ${
                                        fieldErrors.newPassword
                                            ? 'reset-field__input--error'
                                            : ''
                                    }`}
                                    placeholder="Nhập mật khẩu mới"
                                    value={newPassword}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            'newPassword',
                                            e.target.value
                                        )
                                    }
                                    disabled={
                                        loading || isRateLimited
                                    }
                                    autoComplete="new-password"
                                />

                                <button
                                    type="button"
                                    className="reset-field__toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (prev) => !prev
                                        )
                                    }
                                    tabIndex="-1"
                                    disabled={
                                        loading || isRateLimited
                                    }
                                    aria-label="Hiện hoặc ẩn mật khẩu"
                                >
                                    {showPassword ? (
                                        <Eye size={16} />
                                    ) : (
                                        <EyeOff size={16} />
                                    )}
                                </button>
                            </div>

                            {fieldErrors.newPassword && (
                                <span className="reset-field__error">
                                    {fieldErrors.newPassword}
                                </span>
                            )}
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="reset-field">
                            <label
                                htmlFor="reset-confirm-password"
                                className="reset-field__label"
                            >
                                <span>Xác nhận mật khẩu</span>
                                <small>Nhập lại chính xác</small>
                            </label>

                            <div className="reset-field__wrap">
                                <LockKeyhole
                                    className="reset-field__icon"
                                    size={16}
                                    strokeWidth={2}
                                />

                                <input
                                    id="reset-confirm-password"
                                    type={
                                        showConfirmPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    className={`reset-field__input ${
                                        fieldErrors.confirmPassword
                                            ? 'reset-field__input--error'
                                            : ''
                                    }`}
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            'confirmPassword',
                                            e.target.value
                                        )
                                    }
                                    disabled={
                                        loading || isRateLimited
                                    }
                                    autoComplete="new-password"
                                />

                                <button
                                    type="button"
                                    className="reset-field__toggle"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (prev) => !prev
                                        )
                                    }
                                    tabIndex="-1"
                                    disabled={
                                        loading || isRateLimited
                                    }
                                    aria-label="Hiện hoặc ẩn mật khẩu"
                                >
                                    {showConfirmPassword ? (
                                        <Eye size={16} />
                                    ) : (
                                        <EyeOff size={16} />
                                    )}
                                </button>
                            </div>

                            {fieldErrors.confirmPassword && (
                                <span className="reset-field__error">
                                    {fieldErrors.confirmPassword}
                                </span>
                            )}
                        </div>

                        {/* SUBMIT */}
                        <LoadingButton
                            type="submit"
                            loading={loading}
                            loadingText="ĐANG XỬ LÝ..."
                            disabled={loading || isRateLimited}
                            className="reset-submit"
                            spinnerColor="#0a0a0b"
                        >
                            {isRateLimited ? (
                                `ĐANG CHỜ (${formatTime(
                                    rateLimitTimeLeft
                                )})`
                            ) : (
                                <>
                                    <span>XÁC NHẬN ĐẶT LẠI</span>
                                    <KeyRound
                                        size={17}
                                        strokeWidth={2.4}
                                    />
                                </>
                            )}
                        </LoadingButton>
                    </form>

                    {/* FOOTER */}
                    <div className="reset-footer">
                        <button
                            type="button"
                            className="reset-footer__back"
                            onClick={() =>
                                safeNavigate('/forgot-password')
                            }
                            disabled={loading}
                        >
                            <ArrowLeft size={14} strokeWidth={2.4} />
                            QUAY LẠI
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

export default ResetPassword;