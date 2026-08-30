// VerifyOtpPassword.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import LockModal from '../components/LockModal';
import '../styles/UserAuth.css';

const VerifyOtpPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Lấy email từ state hoặc sessionStorage
    const [email, setEmail] = useState(() => {
        if (location.state?.email) {
            return location.state.email;
        }
        const savedEmail = sessionStorage.getItem('verify_otp_password_email');
        if (savedEmail) {
            return savedEmail;
        }
        return '';
    });

    const purpose = location.state?.purpose || 'RESET_PASSWORD';

    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // OTP Timer (5 phút)
    const [countdown, setCountdown] = useState(0);
    const [isOtpExpired, setIsOtpExpired] = useState(false);
    const [isLoadingTTL, setIsLoadingTTL] = useState(false);

    // OTP Attempts
    const [otpAttempts, setOtpAttempts] = useState(0);
    const [maxOtpAttempts] = useState(5);
    const [remainingOtpAttempts, setRemainingOtpAttempts] = useState(5);

    // Lock state - quản lý lock OTP
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockMessage, setLockMessage] = useState('');
    const [lockUntil, setLockUntil] = useState(null);
    const [lockInfo, setLockInfo] = useState(null);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    // Rate Limit (gửi lại OTP quá nhiều)
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    const otpRefs = useRef([]);
    const countdownIntervalRef = useRef(null);
    const lockIntervalRef = useRef(null);

    const OTP_LOCK_STORAGE_KEY = 'verify_otp_password_lock';
    const EMAIL_STORAGE_KEY = 'verify_otp_password_email';

    // ============================================================
    // LƯU EMAIL VÀO SESSIONSTORAGE
    // ============================================================
    useEffect(() => {
        if (email) {
            sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
        }
    }, [email]);

    // ============================================================
    // LƯU OTP LOCK VÀO LOCALSTORAGE
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

    // ============================================================
    // KHÔI PHỤC OTP LOCK TỪ LOCALSTORAGE
    // ============================================================
    const restoreOtpLockFromStorage = () => {
        try {
            const stored = localStorage.getItem(OTP_LOCK_STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (data.email !== email) {
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                return null;
            }

            const elapsed = Math.floor((Date.now() - data.lockedAt) / 1000);
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

    // ============================================================
    // CHUYỂN VỀ FORGOT-PASSWORD KHI HẾT LOCK
    // ============================================================
    const redirectToForgotPassword = () => {
        // Xóa tất cả storage
        localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
        sessionStorage.removeItem(EMAIL_STORAGE_KEY);
        // Chuyển về forgot-password
        navigate('/forgot-password', {
            state: {
                message: '⏳ OTP đã hết hạn. Vui lòng gửi lại OTP mới.'
            }
        });
    };

    // ============================================================
    // INIT - KHỞI TẠO VÀ KHÔI PHỤC STATE
    // ============================================================
    useEffect(() => {
        if (!email) {
            navigate('/forgot-password');
            return;
        }

        setOtp('');
        setError('');
        setSuccessMessage('');
        setCountdown(0);
        setIsOtpExpired(false);
        setOtpAttempts(0);
        setRemainingOtpAttempts(5);
        setShowLockModal(false);

        // Khôi phục lock từ localStorage
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
    // LOCK TIMER - CHẠY LIÊN TỤC KỂ CẢ KHI ĐÓNG MODAL
    // ============================================================
    useEffect(() => {
        // Xóa interval cũ
        if (lockIntervalRef.current) {
            clearInterval(lockIntervalRef.current);
            lockIntervalRef.current = null;
        }

        // Nếu không có lock hoặc đã hết lock
        if (!lockUntil || lockUntil <= Date.now()) {
            setLockTimeLeft(0);
            // Xóa localStorage nếu hết lock
            if (lockUntil && lockUntil <= Date.now()) {
                // CHUYỂN VỀ FORGOT-PASSWORD KHI HẾT LOCK
                redirectToForgotPassword();
            }
            return;
        }

        // Cập nhật thời gian còn lại
        const updateLockTime = () => {
            const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
            setLockTimeLeft(left);

            // Cập nhật localStorage mỗi 5 giây
            if (left > 0 && left % 5 === 0) {
                const lockData = {
                    ...lockInfo,
                    remainingSeconds: left,
                    lockedUntil: lockUntil,
                    lockedAt: Date.now() - ((lockInfo?.lockDuration || 300) - left) * 1000
                };
                saveOtpLockToStorage(lockData);
            }

            // Khi hết lock -> CHUYỂN VỀ FORGOT-PASSWORD
            if (left <= 0) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
                setLockUntil(null);
                setLockInfo(null);
                setLockTimeLeft(0);
                setShowLockModal(false);
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                // Chuyển về forgot-password
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
    // FETCH OTP TTL (THỜI GIAN CÒN LẠI CỦA OTP)
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
                const response = await api.get('/api/auth/check-otp-ttl', {
                    params: {
                        email: email,
                        purpose: purpose
                    }
                });

                if (response.data?.success) {
                    const ttl = response.data?.data?.expiresIn || 0;
                    if (ttl > 0) {
                        setCountdown(ttl);
                        setIsOtpExpired(false);
                        startCountdown(ttl);
                    } else {
                        setIsOtpExpired(true);
                        setCountdown(0);
                    }
                } else {
                    setIsOtpExpired(true);
                    setCountdown(0);
                }
            } catch (error) {
                console.error('❌ [VERIFY OTP PASSWORD] Failed to fetch TTL:', error);
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

    // ============================================================
    // START COUNTDOWN OTP
    // ============================================================
    const startCountdown = (initialTTL) => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        let currentTime = initialTTL;

        countdownIntervalRef.current = setInterval(() => {
            currentTime -= 1;
            setCountdown(currentTime);

            if (currentTime <= 0) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                setIsOtpExpired(true);
                setCountdown(0);
            }
        }, 1000);
    };

    // ============================================================
    // RATE LIMIT TIMER
    // ============================================================
    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) {
            if (!isRateLimited && rateLimitTimeLeft === 0) {
                // Xóa rate limit khi hết
            }
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
    // HELPERS
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

    // Kiểm tra lock
    const isLocked = lockUntil && lockUntil > Date.now();

    // ============================================================
    // HANDLE OTP INPUT
    // ============================================================
    const handleOtpChange = (index, value) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        const newOtp = otp.split('');
        newOtp[index] = clean;
        setOtp(newOtp.join(''));
        if (clean && index < 5) otpRefs.current[index + 1]?.focus();
        if (error) setError('');
        if (successMessage) setSuccessMessage('');
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
            setError(`⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`);
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`);
            return;
        }

        if (countdown > 0 && !isOtpExpired) {
            setError(`⚠️ Vui lòng đợi ${formatTime(countdown)} trước khi gửi lại.`);
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await api.post('/api/auth/resend-otp', {
                email,
                purpose: purpose
            });
            if (response.data.success) {
                setSuccessMessage('✅ Đã gửi lại OTP mới. Vui lòng kiểm tra email.');
                setTimeout(() => setSuccessMessage(''), 5000);
                
                // Reset OTP expired state
                setIsOtpExpired(false);
                // Xóa lock cũ nếu có
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
                setError(`⚠️ Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`);
            } else {
                setError(errorMessage);
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
            setError('⚠️ OTP đã hết hạn. Vui lòng gửi lại.');
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            setError('Vui lòng nhập đủ 6 số OTP');
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`);
            return;
        }

        if (isLocked) {
            setError(`⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword: ''
            });

            if (response.data.success) {
                setOtpAttempts(0);
                setRemainingOtpAttempts(maxOtpAttempts);
                localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                sessionStorage.removeItem(EMAIL_STORAGE_KEY);

                navigate('/reset-password', {
                    state: {
                        email: email,
                        otp: otp,
                        fromForgotPassword: true
                    }
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
                    errorMessage = `❌ OTP không đúng. Bạn đã nhập sai ${attempts}/${maxAttempts} lần. Còn ${remaining} lần thử.`;
                }
            }

            // Xử lý lock OTP (nhập sai quá 5 lần)
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
                // Lưu vào localStorage
                saveOtpLockToStorage(lockData);

                const isOtpLock = backendData.level !== undefined ||
                    backendData.lockDuration !== undefined ||
                    backendData.lockedUntil !== undefined ||
                    errorMessage.toLowerCase().includes('khóa') ||
                    errorMessage.toLowerCase().includes('lock');

                if (isOtpLock) {
                    setLockMessage(backendData.message || '🔒 Bạn đã nhập sai OTP quá 5 lần. OTP đã bị khóa. Vui lòng gửi lại OTP mới.');
                    setShowLockModal(true);
                    setOtpAttempts(0);
                    setRemainingOtpAttempts(maxOtpAttempts);
                    setError('');
                    setLoading(false);
                    return;
                }

                errorMessage = backendData.message || `⚠️ Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`;
            }

            if (errorMessage.toLowerCase().includes('hết hạn') || 
                errorMessage.toLowerCase().includes('expired')) {
                setIsOtpExpired(true);
                setCountdown(0);
                errorMessage = '⚠️ OTP đã hết hạn. Vui lòng gửi lại mã mới.';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // HANDLE LOCK MODAL
    // ============================================================
    const handleLockModalClose = () => {
        setShowLockModal(false);
        // KHÔNG xóa lockUntil, timer vẫn chạy ở background
    };

    const handleLockModalResend = () => {
        setShowLockModal(false);
        // KHÔNG xóa lockUntil, timer vẫn chạy
        // Gọi resend OTP
        handleResendOtp();
    };

    // ============================================================
    // CHECK DISABLED
    // ============================================================
    const isDisabled = loading || isRateLimited || isLocked || showLockModal || isLoadingTTL;

    // ============================================================
    // GET BUTTON TEXT
    // ============================================================
    const getResendButtonText = () => {
        if (isLocked) {
            return `⏳ Đang khóa (${formatLockTime(lockTimeLeft)})`;
        }
        if (isRateLimited) {
            return `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`;
        }
        return 'Gửi lại OTP';
    };

    const getVerifyButtonText = () => {
        if (isLocked) {
            return `⏳ Đang khóa (${formatLockTime(lockTimeLeft)})`;
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
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <ShieldCheck size={42} className="forgot-icon" />
                </div>

                <h2>XÁC THỰC OTP</h2>
                <p className="auth-subtitle">
                    Nhập mã OTP đã gửi đến <strong className="text-highlight">{email}</strong>
                </p>

                {successMessage && (
                    <div className="success-message">
                        <CheckCircle size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {error && !showLockModal && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {isLoadingTTL && (
                    <div className="loading-ttl-text">⏳ Đang đồng bộ thời gian...</div>
                )}

                {otpAttempts > 0 && !isLocked && !showLockModal && (
                    <div className={`otp-attempt-counter ${otpAttempts >= 3 ? 'danger' : 'warning'}`}>
                        ⚠️ Bạn đã nhập sai <strong>{otpAttempts}/{maxOtpAttempts}</strong> lần.
                        {remainingOtpAttempts > 0 ? (
                            <> Còn <strong>{remainingOtpAttempts}</strong> lần thử.</>
                        ) : (
                            <> <strong className="text-danger">OTP đã bị khóa!</strong></>
                        )}
                    </div>
                )}

                {/* OTP INPUT */}
                <div className="pin-input-container">
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
                            className={`pin-box ${isOtpExpired ? 'input-error' : ''} ${error && error.toLowerCase().includes('otp') ? 'input-error' : ''}`}
                            disabled={isDisabled}
                        />
                    ))}
                </div>

                {/* OTP TIMER */}
                {!isLocked && !showLockModal && !isLoadingTTL && (
                    <div className="input-hint center-text">
                        {isOtpExpired ? (
                            <span className="text-danger">
                                ⚠️ OTP đã hết hạn. Vui lòng <strong>gửi lại</strong> mã mới.
                            </span>
                        ) : (
                            <span>
                                ⏳ OTP hết hạn sau: <strong className={countdown <= 60 ? 'text-danger' : 'text-success'}>
                                    {formatTime(countdown)}
                                </strong> (5 phút)
                            </span>
                        )}
                    </div>
                )}

                {/* RESEND BUTTON - hiển thị timer nếu đang lock */}
                <button
                    className="btn-user btn-outline-secondary"
                    onClick={handleResendOtp}
                    disabled={isDisabled || (countdown > 0 && !isOtpExpired) || isLocked}
                >
                    <RefreshCw size={16} />
                    {getResendButtonText()}
                </button>

                {/* BUTTON GROUP */}
                <div className="button-group">
                    <button 
                        className="btn-user btn-back"
                        onClick={() => {
                            localStorage.removeItem(OTP_LOCK_STORAGE_KEY);
                            sessionStorage.removeItem(EMAIL_STORAGE_KEY);
                            navigate('/forgot-password');
                        }}
                        disabled={isDisabled}
                    >
                        <ArrowLeft size={16} /> Quay lại
                    </button>

                    <LoadingButton
                        type="button"
                        loading={loading}
                        loadingText="Đang xác thực..."
                        onClick={handleVerifyOtp}
                        disabled={isDisabled || isOtpExpired || isLocked}
                        className="btn-user btn-user-silver"
                        spinnerColor="#000000"
                    >
                        {getVerifyButtonText()}
                    </LoadingButton>
                </div>
            </div>

            {/* LOCK MODAL - đóng nhưng timer vẫn chạy */}
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

export default VerifyOtpPassword;