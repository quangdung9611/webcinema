// admin_frontend/pages/Auth/AdminVerifyOtpPassword.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ShieldCheck,
    ArrowLeft,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Clock,
    Loader2,
} from 'lucide-react';
import adminapi from '../../../api/adminapi';
import LoadingButton from '../../../user_frontend/components/LoadingButton';
import LockModal from '../../../user_frontend/components/LockModal';
import useOTPGuard from '../../../hooks/useAdminOTPGuard';
import '../../styles/AdminAuth.css';

const AdminVerifyOtpPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState(() => {
        if (location.state?.email) {
            return location.state.email;
        }
        const savedEmail = sessionStorage.getItem('admin_verify_otp_password_email');
        if (savedEmail) {
            return savedEmail;
        }
        return '';
    });

    const purpose = location.state?.purpose || 'RESET_PASSWORD';

    const { safeNavigate, invalidateOTP } = useOTPGuard(email, purpose, {
        onInvalidate: () => {
            console.log('[ADMIN VERIFY OTP] OTP đã bị vô hiệu do rời trang');
            localStorage.removeItem('admin_verify_otp_password_lock');
            sessionStorage.removeItem('admin_verify_otp_password_email');
        }
    });

    const [otp, setOtp] = useState('');
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const [countdown, setCountdown] = useState(0);
    const [isOtpExpired, setIsOtpExpired] = useState(false);
    const [isLoadingTTL, setIsLoadingTTL] = useState(false);

    const [otpAttempts, setOtpAttempts] = useState(0);
    const [maxOtpAttempts] = useState(5);
    const [remainingOtpAttempts, setRemainingOtpAttempts] = useState(5);

    const [showLockModal, setShowLockModal] = useState(false);
    const [lockMessage, setLockMessage] = useState('');
    const [lockUntil, setLockUntil] = useState(null);
    const [lockInfo, setLockInfo] = useState(null);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    const otpRefs = useRef([]);
    const countdownIntervalRef = useRef(null);
    const lockIntervalRef = useRef(null);
    const successTimeoutRef = useRef(null);

    const OTP_LOCK_STORAGE_KEY = 'admin_verify_otp_password_lock';
    const EMAIL_STORAGE_KEY = 'admin_verify_otp_password_email';

    // ============================================================
    // HELPERS
    // ============================================================
    const makeError = (IconComponent, text) => ({
        icon: <IconComponent size={18} />,
        text,
    });

    const makeSuccess = (IconComponent, text) => ({
        icon: <IconComponent size={20} />,
        text,
    });

    // ============================================================
    // LƯU EMAIL
    // ============================================================
    useEffect(() => {
        if (email) {
            sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
        }
    }, [email]);

    // ============================================================
    // OTP LOCK STORAGE
    // ============================================================
    const saveOtpLockToStorage = (lockData) => {
        if (lockData && lockData.lockedUntil > Date.now() && email) {
            const data = {
                ...lockData,
                lockedAt: Date.now(),
                email: email
            };
            localStorage.setItem(OTP_LOCK_STORAGE_KEY, JSON.stringify(data));
        } else {
            localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
        }
    };

    const restoreOtpLockFromStorage = () => {
        try {
            const stored = localStorage.getItem(OTP_LOCK_STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (data.email !== email) {
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                return null;
            }

            const remaining = Math.max(0, Math.ceil((data.lockedUntil - Date.now()) / 1000));

            if (remaining > 0) {
                return {
                    ...data,
                    remainingSeconds: remaining
                };
            } else {
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                return null;
            }
        } catch (error) {
            localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
            return null;
        }
    };

    const redirectToForgotPassword = () => {
        localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
        sessionStorage.removeItem(EMAIL_STORAGE_KEY);
        safeNavigate('/forgot-password', {
            message: 'OTP đã hết hạn. Vui lòng gửi lại OTP mới.'
        });
    };

    const resetOtpInput = () => {
        setOtp('');
        otpRefs.current.forEach((el) => {
            if (el) el.value = '';
        });
        otpRefs.current[0]?.focus();
    };

    // ============================================================
    // KHỞI TẠO
    // ============================================================
    useEffect(() => {
        if (!email) {
            safeNavigate('/forgot-password');
            return;
        }

        setOtp('');
        setError(null);
        setSuccessMessage(null);
        setCountdown(0);
        setIsOtpExpired(false);
        setOtpAttempts(0);
        setRemainingOtpAttempts(5);
        setShowLockModal(false);

        const restoredOtpLock = restoreOtpLockFromStorage();
        if (restoredOtpLock !== null) {
            setLockInfo(restoredOtpLock);
            setLockUntil(restoredOtpLock.lockedUntil);
            setLockTimeLeft(restoredOtpLock.remainingSeconds);
            setShowLockModal(true);
            setLockMessage(restoredOtpLock.message || 'Bạn đã nhập sai OTP quá 5 lần. OTP đã bị khóa. Vui lòng gửi lại OTP mới.');
        }
    }, [email]);

    // ============================================================
    // LOCK TIMER
    // ============================================================
    useEffect(() => {
        if (lockIntervalRef.current) {
            clearInterval(lockIntervalRef.current);
            lockIntervalRef.current = null;
        }

        if (!lockUntil || lockUntil <= Date.now()) {
            setLockTimeLeft(0);
            if (lockUntil && lockUntil <= Date.now()) {
                redirectToForgotPassword();
            }
            return;
        }

        const updateLockTime = () => {
            const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
            setLockTimeLeft(left);

            if (left > 0 && left % 5 === 0) {
                const lockData = {
                    ...lockInfo,
                    remainingSeconds: left,
                    lockedUntil: lockUntil,
                    lockedAt: Date.now() - ((lockInfo?.lockDuration || 300) - left) * 1000
                };
                saveOtpLockToStorage(lockData);
            }

            if (left <= 0) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
                setLockUntil(null);
                setLockInfo(null);
                setLockTimeLeft(0);
                setShowLockModal(false);
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                redirectToForgotPassword();
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
    }, [lockUntil, lockInfo]);

    // ============================================================
    // FETCH TTL
    // ============================================================
    useEffect(() => {
        if (!email) {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            return;
        }

        const fetchTTL = async () => {
            setIsLoadingTTL(true);
            try {
                const response = await adminapi.get('/admin/api/auth/check-otp-ttl', {
                    params: {
                        email: email,
                        purpose: purpose
                    }
                });

                if (response.data?.success) {
                    const ttl = response.data?.data?.expiresIn || 0;
                    const serverTime = response.data?.data?.serverTime || Date.now();

                    if (ttl > 0) {
                        const expiresAt = serverTime + (ttl * 1000);
                        setCountdown(ttl);
                        setIsOtpExpired(false);
                        startCountdown(expiresAt);
                    } else {
                        setIsOtpExpired(true);
                        setCountdown(0);
                    }
                } else {
                    setIsOtpExpired(true);
                    setCountdown(0);
                }
            } catch (error) {
                console.error('[ADMIN VERIFY OTP] Failed to fetch TTL:', error);
                setIsOtpExpired(true);
                setCountdown(0);
            } finally {
                setIsLoadingTTL(false);
            }
        };

        fetchTTL();

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };
    }, [email]);

    const startCountdown = (expiresAt) => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        countdownIntervalRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            setCountdown(remaining);

            if (remaining <= 0) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                setIsOtpExpired(true);
                setCountdown(0);
            }
        }, 250);
    };

    // ============================================================
    // RATE LIMIT TIMER
    // ============================================================
    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    // ============================================================
    // FORMAT TIME
    // ============================================================
    const formatTime = (seconds) => {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatLockTime = (totalSeconds) => {
        if (totalSeconds <= 0) return '0:00';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLocked = lockUntil && lockUntil > Date.now();

    // ============================================================
    // OTP INPUT HANDLERS
    // ============================================================
    const handleOtpChange = (index, value) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        const newOtp = otp.split('');
        newOtp[index] = clean;
        setOtp(newOtp.join(''));
        if (clean && index < 5) otpRefs.current[index + 1]?.focus();
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // ============================================================
    // HANDLE RESEND OTP
    // ============================================================
    const handleResendOtp = async () => {
        if (isLocked) {
            setError(makeError(
                AlertTriangle,
                `Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`
            ));
            return;
        }

        if (isRateLimited) {
            setError(makeError(
                AlertTriangle,
                `Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`
            ));
            return;
        }

        if (countdown > 0 && !isOtpExpired) {
            setError(makeError(
                AlertTriangle,
                `Vui lòng đợi ${formatTime(countdown)} trước khi gửi lại.`
            ));
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await adminapi.post('/admin/api/auth/resend-otp', {
                email,
                purpose: purpose
            });

            if (response.data.success) {
                await new Promise(resolve => setTimeout(resolve, 1500));

                setSuccessMessage(makeSuccess(
                    CheckCircle,
                    'Đã gửi lại mã OTP mới vào email. Vui lòng kiểm tra hộp thư.'
                ));

                if (successTimeoutRef.current) {
                    clearTimeout(successTimeoutRef.current);
                }
                successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 6000);

                resetOtpInput();

                const ttl = response.data?.data?.expiresIn || 300;
                const serverTime = response.data?.data?.serverTime || Date.now();
                const expiresAt = serverTime + (ttl * 1000);

                setIsOtpExpired(false);
                setCountdown(ttl);
                startCountdown(expiresAt);

                if (isLocked) {
                    localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                    setLockUntil(null);
                    setLockInfo(null);
                    setLockTimeLeft(0);
                    setShowLockModal(false);
                }
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi lại OTP';

            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 300;
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
                setError(makeError(
                    AlertTriangle,
                    `Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`
                ));
            } else {
                setError(makeError(AlertCircle, errorMessage));
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // HANDLE VERIFY OTP
    // ============================================================
    const handleVerifyOtp = async () => {
        if (isOtpExpired) {
            setError(makeError(
                AlertTriangle,
                'OTP đã hết hạn. Vui lòng gửi lại.'
            ));
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            setError(makeError(AlertCircle, 'Vui lòng nhập đủ 6 số OTP'));
            return;
        }

        if (isRateLimited) {
            setError(makeError(
                AlertTriangle,
                `Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`
            ));
            return;
        }

        if (isLocked) {
            setError(makeError(
                AlertTriangle,
                `Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`
            ));
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await adminapi.post('/admin/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword: ''
            });

            if (response.data.success) {
                setOtpAttempts(0);
                setRemainingOtpAttempts(maxOtpAttempts);
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                sessionStorage.removeItem(EMAIL_STORAGE_KEY);

                safeNavigate('/reset-password', {
                    email: email,
                    otp: otp,
                    fromForgotPassword: true
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            let errorMessage = errorData.message || 'OTP không đúng';

            const backendData = errorData.data || {};

            if (backendData.attempts !== undefined || backendData.currentAttempts !== undefined) {
                const attempts = Number(backendData.attempts) || Number(backendData.currentAttempts) || 0;
                const maxAttempts = Number(backendData.maxAttempts) || 5;
                const remaining = Math.max(0, maxAttempts - attempts);

                setOtpAttempts(attempts);
                setRemainingOtpAttempts(remaining);

                if (status !== 429 && remaining > 0) {
                    errorMessage = `OTP không đúng. Bạn đã nhập sai ${attempts}/${maxAttempts} lần. Còn ${remaining} lần thử.`;
                }
            }

            if (status === 429) {
                const remainingSeconds = backendData.remainingSeconds || 300;
                const lockDuration = backendData.lockDuration || remainingSeconds;
                const lockDurationText = backendData.lockDurationText || formatLockTime(remainingSeconds);
                const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;

                const lockData = {
                    message: backendData.message || 'Bạn đã nhập sai OTP quá 5 lần. OTP đã bị khóa. Vui lòng gửi lại OTP mới.',
                    lockDuration: lockDuration,
                    lockDurationText: lockDurationText,
                    lockedUntil: lockUntilTimestamp,
                    remainingSeconds: remainingSeconds,
                    email: email
                };

                setLockInfo(lockData);
                setLockUntil(lockUntilTimestamp);
                setLockTimeLeft(remainingSeconds);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
                saveOtpLockToStorage(lockData);

                const isOtpLock = backendData.level !== undefined ||
                    backendData.lockDuration !== undefined ||
                    backendData.lockedUntil !== undefined ||
                    errorMessage.toLowerCase().includes('khóa') ||
                    errorMessage.toLowerCase().includes('lock');

                if (isOtpLock) {
                    setLockMessage(backendData.message || 'Bạn đã nhập sai OTP quá 5 lần. OTP đã bị khóa. Vui lòng gửi lại OTP mới.');
                    setShowLockModal(true);
                    setOtpAttempts(0);
                    setRemainingOtpAttempts(maxOtpAttempts);
                    setError(null);
                    setLoading(false);
                    return;
                }

                errorMessage = backendData.message || `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`;
            }

            if (errorMessage.toLowerCase().includes('hết hạn') ||
                errorMessage.toLowerCase().includes('expired')) {
                setIsOtpExpired(true);
                setCountdown(0);
                setError(makeError(
                    AlertTriangle,
                    'OTP đã hết hạn. Vui lòng gửi lại mã mới.'
                ));
            } else {
                setError(makeError(XCircle, errorMessage));
            }

            resetOtpInput();
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // CLEANUP
    // ============================================================
    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const handleLockModalClose = () => {
        setShowLockModal(false);
    };

    const handleLockModalResend = () => {
        setShowLockModal(false);
        handleResendOtp();
    };

    const isDisabled = loading || isRateLimited || isLocked || showLockModal || isLoadingTTL;

    const getResendButtonText = () => {
        if (isLocked) {
            return `Đang khóa (${formatLockTime(lockTimeLeft)})`;
        }
        if (isRateLimited) {
            return `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`;
        }
        return 'Gửi lại OTP';
    };

    const getVerifyButtonText = () => {
        if (isLocked) {
            return `Đang khóa (${formatLockTime(lockTimeLeft)})`;
        }
        if (isRateLimited) {
            return `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`;
        }
        return 'XÁC NHẬN';
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-overlay"></div>

            <div className="admin-forgot-container">
                <div className="admin-forgot-card">
                    <div className="admin-forgot-icon-wrapper">
                        <ShieldCheck size={42} className="admin-forgot-icon" />
                    </div>

                    <h2>XÁC THỰC OTP ADMIN</h2>
                    <p className="admin-forgot-subtitle">
                        Nhập mã OTP đã gửi đến <strong className="admin-text-highlight">{email}</strong>
                    </p>

                    {successMessage && (
                        <div className="admin-forgot-message success">
                            {successMessage.icon}
                            <span>{successMessage.text}</span>
                        </div>
                    )}

                    {error && !showLockModal && (
                        <div className="admin-forgot-message error">
                            {error.icon}
                            <span>{error.text}</span>
                        </div>
                    )}

                    {isLoadingTTL && (
                        <div className="admin-loading-ttl">
                            <Loader2 size={16} className="spin-icon" />
                            Đang đồng bộ thời gian...
                        </div>
                    )}

                    {otpAttempts > 0 && !isLocked && !showLockModal && (
                        <div className={`admin-otp-attempt-counter ${otpAttempts >= 3 ? 'danger' : 'warning'}`}>
                            <AlertTriangle size={16} />
                            <span>
                                Bạn đã nhập sai <strong>{otpAttempts}/{maxOtpAttempts}</strong> lần.
                                {remainingOtpAttempts > 0 ? (
                                    <> Còn <strong>{remainingOtpAttempts}</strong> lần thử.</>
                                ) : (
                                    <> <strong className="text-danger">OTP đã bị khóa!</strong></>
                                )}
                            </span>
                        </div>
                    )}

                    {/* OTP INPUT */}
                    <div className="admin-pin-input-container">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <input
                                key={index}
                                ref={(el) => (otpRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={otp[index] || ''}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                className={`admin-pin-box ${isOtpExpired ? 'input-error' : ''} ${error && error.text.toLowerCase().includes('otp') ? 'input-error' : ''}`}
                                disabled={isDisabled}
                            />
                        ))}
                    </div>

                    {/* OTP TIMER */}
                    {!isLocked && !showLockModal && !isLoadingTTL && (
                        <div className="admin-input-hint">
                            {isOtpExpired ? (
                                <span className="text-danger">
                                    <AlertTriangle size={14} />
                                    <span>OTP đã hết hạn. Vui lòng <strong>gửi lại</strong> mã mới.</span>
                                </span>
                            ) : (
                                <span>
                                    <Clock size={14} />
                                    <span>
                                        OTP hết hạn sau: <strong className={countdown <= 60 ? 'text-danger' : 'text-success'}>
                                            {formatTime(countdown)}
                                        </strong> (5 phút)
                                    </span>
                                </span>
                            )}
                        </div>
                    )}

                    {/* RESEND BUTTON */}
                    <button
                        className="admin-btn-resend"
                        onClick={handleResendOtp}
                        disabled={isDisabled || (countdown > 0 && !isOtpExpired) || isLocked || loading}
                        type="button"
                    >
                        {loading ? (
                            <span className="admin-loading-spinner">
                                <Loader2 size={16} className="spin-icon" />
                                Đang gửi lại...
                            </span>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                {getResendButtonText()}
                            </>
                        )}
                    </button>

                    {/* BUTTON GROUP */}
                    <div className="admin-button-group">
                        <button
                            className="admin-btn-back"
                            onClick={() => {
                                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                                sessionStorage.removeItem(EMAIL_STORAGE_KEY);
                                safeNavigate('/forgot-password');
                            }}
                            disabled={isDisabled}
                            type="button"
                        >
                            <ArrowLeft size={16} /> Quay lại
                        </button>

                        <LoadingButton
                            type="button"
                            loading={loading}
                            loadingText="Đang xác thực..."
                            onClick={handleVerifyOtp}
                            disabled={isDisabled || isOtpExpired || isLocked}
                            className="btn-admin-forgot"
                            spinnerColor="#000000"
                        >
                            {getVerifyButtonText()}
                        </LoadingButton>
                    </div>
                </div>
            </div>

            {/* LOCK MODAL */}
            <LockModal
                show={showLockModal}
                message={lockInfo?.message || lockMessage || 'Bạn đã nhập sai OTP quá 5 lần. OTP đã bị khóa. Vui lòng gửi lại OTP mới.'}
                lockedUntil={lockInfo?.lockedUntil || lockUntil}
                lockDuration={lockInfo?.lockDuration || 300}
                lockDurationText={lockInfo?.lockDurationText || '5 phút'}
                email={email}
                onClose={handleLockModalClose}
                onResend={handleLockModalResend}
            />
        </div>
    );
};

export default AdminVerifyOtpPassword;