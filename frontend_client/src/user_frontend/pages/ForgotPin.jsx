
// ForgotPin.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    MailCheck,
    ShieldCheck,
    ArrowLeft,
    RefreshCw,
    AlertCircle
} from 'lucide-react';

import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import LockModal from '../components/LockModal';
import { useAuth } from '../../context/AuthContext';

import '../styles/UserAuth.css';

const ForgotPin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // ============================================================
    // STATE
    // ============================================================

    const [step, setStep] = useState('sent');

    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // OTP TTL
    const [countdown, setCountdown] = useState(300);
    const [isOtpExpired, setIsOtpExpired] = useState(false);

    // ============================================================
    // OTP ATTEMPTS
    // Backend là nguồn chính xác
    // ============================================================

    const [otpAttempts, setOtpAttempts] = useState(0);
    const [maxOtpAttempts, setMaxOtpAttempts] = useState(5);
    const [remainingOtpAttempts, setRemainingOtpAttempts] = useState(5);

    // ============================================================
    // LOCK
    // ============================================================

    const [showLockModal, setShowLockModal] = useState(false);
    const [lockMessage, setLockMessage] = useState('');

    const [showLockTimer, setShowLockTimer] = useState(false);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);
    const [lockUntil, setLockUntil] = useState(null);

    // ============================================================
    // RATE LIMIT
    // ============================================================

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // ============================================================
    // REFS
    // ============================================================

    const email = user?.email || '';

    const otpRefs = useRef([]);
    const intervalRef = useRef(null);

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

        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;

        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    setError('');
                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    // ============================================================
    // LOCK TIMER
    // ============================================================

    useEffect(() => {
        if (!showLockTimer || !lockUntil) {
            return;
        }

        const tick = () => {
            const left = Math.max(
                0,
                Math.ceil((lockUntil - Date.now()) / 1000)
            );

            setLockTimeLeft(left);

            if (left <= 0) {
                setShowLockTimer(false);
                setLockTimeLeft(0);
                setLockUntil(null);
                setShowLockModal(false);

                // Reset trạng thái OTP attempts
                setOtpAttempts(0);
                setRemainingOtpAttempts(maxOtpAttempts);

                setError(
                    '✅ Bạn đã được mở khóa. Vui lòng thử lại.'
                );

                setTimeout(() => {
                    setError('');
                }, 5000);
            }
        };

        tick();

        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [showLockTimer, lockUntil, maxOtpAttempts]);

    // ============================================================
    // KIỂM TRA OTP TTL TỪ REDIS
    // ============================================================

    useEffect(() => {
        if (step !== 'otp' || !email) {
            return;
        }

        const syncTTL = async () => {
            try {
                const response = await api.get(
                    '/api/auth/check-otp-ttl',
                    {
                        params: {
                            email,
                            purpose: 'FORGOT_PIN'
                        }
                    }
                );

                if (response.data?.success) {
                    const ttl =
                        response.data?.data?.expiresIn || 0;

                    if (ttl > 0) {
                        setCountdown(ttl);
                        setIsOtpExpired(false);
                    } else {
                        setCountdown(0);
                        setIsOtpExpired(true);
                    }
                }
            } catch (error) {
                console.error(
                    '❌ [FORGOT PIN] Failed to sync OTP TTL:',
                    error
                );
            }
        };

        syncTTL();

        intervalRef.current = setInterval(
            syncTTL,
            1000
        );

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [step, email]);

    // ============================================================
    // KIỂM TRA EMAIL
    // ============================================================

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    // ============================================================
    // INITIAL STATE
    // ============================================================

    useEffect(() => {
        setStep('sent');
        setOtp('');
        setError('');

        setCountdown(300);
        setIsOtpExpired(false);

        setOtpAttempts(0);
        setMaxOtpAttempts(5);
        setRemainingOtpAttempts(5);

        setShowLockModal(false);
        setShowLockTimer(false);

        setLockTimeLeft(0);
        setLockUntil(null);
        setLockMessage('');

        setIsRateLimited(false);
        setRateLimitTimeLeft(0);
    }, []);

    // ============================================================
    // OTP INPUT
    // ============================================================

    const handleOtpChange = (index, value) => {
        const clean = value
            .replace(/\D/g, '')
            .slice(-1);

        const newOtp = otp.split('');

        newOtp[index] = clean;

        setOtp(newOtp.join(''));

        if (clean && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        if (error) {
            setError('');
        }
    };

    // ============================================================

    const handleOtpKeyDown = (index, e) => {
        if (
            e.key === 'Backspace' &&
            !otp[index] &&
            index > 0
        ) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // ============================================================
    // LOCK STATUS
    // ============================================================

    const isLocked =
        showLockTimer &&
        lockUntil &&
        lockUntil > Date.now();

    // ============================================================
    // APPLY BACKEND LOCK DATA
    // ============================================================

    const applyLockData = (data = {}) => {
        const remainingSeconds =
            Number(data.remainingSeconds) || 0;

        const level =
            Number(data.level) || 1;

        const maxAttempts =
            Number(data.maxAttempts) || 5;

        const lockDuration =
            Number(data.lockDuration) ||
            remainingSeconds;

        const lockDurationText =
            data.lockDurationText ||
            formatLockTime(lockDuration);

        let lockedUntil = data.lockedUntil;

        /*
         * Backend nên trả lockedUntil.
         *
         * Nếu không có thì fallback bằng remainingSeconds.
         */
        if (!lockedUntil && remainingSeconds > 0) {
            lockedUntil =
                Date.now() +
                remainingSeconds * 1000;
        } else if (lockedUntil) {
            lockedUntil = Number(lockedUntil);

            /*
             * Một số backend có thể trả timestamp dạng string.
             */
            if (Number.isNaN(lockedUntil)) {
                lockedUntil =
                    Date.parse(data.lockedUntil);
            }
        }

        setMaxOtpAttempts(maxAttempts);

        setShowLockTimer(true);
        setLockTimeLeft(remainingSeconds);
        setLockUntil(lockedUntil);

        setLockMessage(
            data.message ||
            `Bạn đã nhập sai OTP quá ${maxAttempts} lần. Tài khoản đã bị khóa ${lockDurationText}.`
        );

        setShowLockModal(true);

        return {
            level,
            remainingSeconds,
            maxAttempts,
            lockDuration,
            lockDurationText,
            lockedUntil
        };
    };

    // ============================================================
    // APPLY OTP ATTEMPT DATA
    // ============================================================

    const applyOtpAttemptData = (data = {}) => {
        const attempts =
            Number(data.attempts) ||
            Number(data.currentAttempts) ||
            0;

        const maxAttempts =
            Number(data.maxAttempts) || 5;

        let remainingAttempts;

        if (
            data.remainingAttempts !== undefined &&
            data.remainingAttempts !== null
        ) {
            remainingAttempts =
                Number(data.remainingAttempts);
        } else {
            remainingAttempts =
                Math.max(
                    0,
                    maxAttempts - attempts
                );
        }

        setOtpAttempts(attempts);
        setMaxOtpAttempts(maxAttempts);
        setRemainingOtpAttempts(
            remainingAttempts
        );

        return {
            attempts,
            maxAttempts,
            remainingAttempts
        };
    };

    // ============================================================
    // SEND OTP
    // ============================================================

    const handleSendOtp = async () => {
        if (isRateLimited) {
            setError(
                `⚠️ Vui lòng đợi ${formatLockTime(
                    rateLimitTimeLeft
                )} trước khi thử lại.`
            );

            return;
        }

        if (isLocked) {
            setError(
                `⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(
                    lockTimeLeft
                )} để thử lại.`
            );

            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(
                '/api/auth/forgot-pin',
                { email }
            );

            if (response.data?.success) {
                const expiresIn =
                    response.data?.data?.expiresIn ||
                    300;

                setCountdown(expiresIn);
                setIsOtpExpired(false);

                setOtp('');
                setOtpAttempts(0);
                setRemainingOtpAttempts(
                    maxOtpAttempts
                );

                setStep('otp');
                setError('');
            }
        } catch (err) {
            const status =
                err.response?.status;

            const errorData =
                err.response?.data || {};

            const errorMessage =
                errorData.message ||
                'Không thể gửi OTP';

            if (status === 429) {
                const remainingSeconds =
                    Number(
                        errorData.data?.remainingSeconds
                    ) || 300;

                const maxAttempts =
                    Number(
                        errorData.data?.maxAttempts
                    ) || 3;

                setMaxOtpAttempts(
                    maxAttempts
                );

                const lockUntilTimestamp =
                    Date.now() +
                    remainingSeconds * 1000;

                setShowLockTimer(true);
                setLockTimeLeft(
                    remainingSeconds
                );
                setLockUntil(
                    lockUntilTimestamp
                );

                setError(
                    errorMessage
                );

                setIsRateLimited(true);
                setRateLimitTimeLeft(
                    remainingSeconds
                );
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // RESEND OTP
    // ============================================================

    const handleResendOtp = async () => {
        if (isRateLimited) {
            setError(
                `⚠️ Vui lòng đợi ${formatLockTime(
                    rateLimitTimeLeft
                )} trước khi thử lại.`
            );

            return;
        }

        if (isLocked) {
            setError(
                `⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(
                    lockTimeLeft
                )} để thử lại.`
            );

            return;
        }

        if (
            countdown > 0 &&
            !isOtpExpired
        ) {
            setError(
                `⚠️ Vui lòng đợi ${formatTime(
                    countdown
                )} trước khi gửi lại.`
            );

            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(
                '/api/auth/resend-otp',
                {
                    email,
                    purpose: 'FORGOT_PIN'
                }
            );

            if (response.data?.success) {
                const expiresIn =
                    response.data?.data?.expiresIn ||
                    300;

                setCountdown(expiresIn);
                setIsOtpExpired(false);

                setOtp('');

                /*
                 * OTP mới bắt đầu lại chu kỳ verify.
                 */
                setOtpAttempts(0);
                setRemainingOtpAttempts(
                    maxOtpAttempts
                );

                setError('');
            }
        } catch (err) {
            const status =
                err.response?.status;

            const errorData =
                err.response?.data || {};

            const errorMessage =
                errorData.message ||
                'Không thể gửi lại OTP';

            if (status === 429) {
                const remainingSeconds =
                    Number(
                        errorData.data?.remainingSeconds
                    ) || 300;

                const lockUntilTimestamp =
                    Date.now() +
                    remainingSeconds * 1000;

                setShowLockTimer(true);
                setLockTimeLeft(
                    remainingSeconds
                );
                setLockUntil(
                    lockUntilTimestamp
                );

                setError(
                    errorMessage
                );

                setIsRateLimited(true);
                setRateLimitTimeLeft(
                    remainingSeconds
                );
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // VERIFY OTP
    // ============================================================

    const handleVerifyOtp = async () => {
        if (isOtpExpired) {
            setError(
                '⚠️ OTP đã hết hạn. Vui lòng gửi lại.'
            );

            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            setError(
                'Vui lòng nhập đủ 6 số OTP'
            );

            return;
        }

        if (isRateLimited) {
            setError(
                `⚠️ Vui lòng đợi ${formatLockTime(
                    rateLimitTimeLeft
                )} trước khi thử lại.`
            );

            return;
        }

        if (isLocked) {
            setError(
                `⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(
                    lockTimeLeft
                )} để thử lại.`
            );

            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post(
                '/api/auth/verify-otp-and-change-pin',
                {
                    email,
                    otp,
                    newPin: ''
                }
            );

            if (response.data?.success) {
                /*
                 * OTP đúng → reset hiển thị attempts.
                 */
                setOtpAttempts(0);
                setRemainingOtpAttempts(
                    maxOtpAttempts
                );

                navigate('/reset-pin', {
                    state: {
                        email,
                        otp,
                        fromForgotPin: true,
                        returnTo:
                            location.state?.returnTo
                    }
                });
            }
        } catch (err) {
            const status =
                err.response?.status;

            const errorData =
                err.response?.data || {};

            let errorMessage =
                errorData.message ||
                'OTP không đúng';

            const backendData =
                errorData.data || {};

            // ====================================================
            // BACKEND TRẢ VỀ SỐ LẦN SAI
            // ====================================================

            if (
                backendData.attempts !== undefined ||
                backendData.currentAttempts !== undefined ||
                backendData.remainingAttempts !== undefined
            ) {
                const attemptInfo =
                    applyOtpAttemptData(
                        backendData
                    );

                /*
                 * Backend vẫn chưa khóa.
                 */
                if (
                    status !== 429 &&
                    attemptInfo.remainingAttempts > 0
                ) {
                    errorMessage =
                        errorData.message ||
                        `❌ OTP không đúng. Bạn đã nhập sai ${attemptInfo.attempts}/${attemptInfo.maxAttempts} lần. Bạn còn ${attemptInfo.remainingAttempts} lần thử.`;
                }
            }

            // ====================================================
            // RATE LIMIT / LOCK
            // ====================================================

            if (status === 429) {
                /*
                 * Nếu backend trả thông tin attempts
                 * thì vẫn cập nhật UI.
                 */
                if (
                    backendData.attempts !== undefined ||
                    backendData.currentAttempts !== undefined ||
                    backendData.remainingAttempts !== undefined
                ) {
                    applyOtpAttemptData(
                        backendData
                    );
                }

                /*
                 * Có dữ liệu lock thực tế từ backend.
                 */
                const lockData =
                    applyLockData(
                        backendData
                    );

                const remainingSeconds =
                    lockData.remainingSeconds ||
                    300;

                /*
                 * Nếu là lock OTP thực sự
                 * thì hiện modal khóa.
                 */
                const isOtpLock =
                    backendData.level !== undefined ||
                    backendData.lockDuration !== undefined ||
                    backendData.lockedUntil !== undefined ||
                    errorMessage.toLowerCase().includes('khóa');

                if (isOtpLock) {
                    errorMessage =
                        backendData.message ||
                        `🔒 Bạn đã nhập sai OTP quá ${lockData.maxAttempts} lần. Tài khoản đã bị khóa ${lockData.lockDurationText}.`;

                    setShowLockModal(true);
                }

                /*
                 * Nếu backend trả rate limit
                 * thì xử lý timer rate limit.
                 */
                if (
                    backendData.maxAttempts !== undefined &&
                    !isOtpLock
                ) {
                    setIsRateLimited(true);
                    setRateLimitTimeLeft(
                        remainingSeconds
                    );
                }

                setError(errorMessage);

                setLoading(false);

                return;
            }

            // ====================================================
            // OTP HẾT HẠN
            // ====================================================

            if (
                errorMessage
                    .toLowerCase()
                    .includes('hết hạn')
            ) {
                setIsOtpExpired(true);
                setCountdown(0);
                setError(
                    '⚠️ OTP đã hết hạn. Vui lòng gửi lại mã mới.'
                );

                return;
            }

            // ====================================================
            // TRƯỜNG HỢP BACKEND CHƯA TRẢ ATTEMPTS
            // ====================================================

            if (
                backendData.attempts === undefined &&
                backendData.currentAttempts === undefined &&
                backendData.remainingAttempts === undefined &&
                status !== 429
            ) {
                /*
                 * Fallback nhẹ để tương thích backend cũ.
                 * Khi AuthService mới được cập nhật thì
                 * nhánh này sẽ không còn được dùng.
                 */
                const fallbackAttempts =
                    otpAttempts + 1;

                const fallbackRemaining =
                    Math.max(
                        0,
                        maxOtpAttempts -
                            fallbackAttempts
                    );

                setOtpAttempts(
                    fallbackAttempts
                );

                setRemainingOtpAttempts(
                    fallbackRemaining
                );

                if (
                    fallbackRemaining > 0
                ) {
                    errorMessage =
                        `❌ OTP không đúng. Bạn đã nhập sai ${fallbackAttempts}/${maxOtpAttempts} lần. Bạn còn ${fallbackRemaining} lần thử.`;
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="auth-container">
            <div className="auth-card">

                <h2>XÁC THỰC OTP</h2>

                {/* ==================================================
                    ERROR MESSAGE
                ================================================== */}

                {error && (
                    <div className="forgot-message error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* ==================================================
                    STEP 1 - SEND OTP
                ================================================== */}

                {step === 'sent' && (
                    <>
                        <div className="forgot-icon-wrapper">
                            <MailCheck
                                size={42}
                                className="forgot-icon"
                            />
                        </div>

                        <p
                            className="auth-subtitle"
                            style={{
                                marginBottom: '10px'
                            }}
                        >
                            Chúng tôi sẽ gửi mã OTP
                            về email{' '}
                            <strong className="text-highlight">
                                {email}
                            </strong>.
                        </p>

                        <p
                            className="auth-subtitle"
                            style={{
                                marginBottom: '20px',
                                fontSize: '14px',
                                color: '#94a3b8'
                            }}
                        >
                            Vui lòng bấm nút{' '}
                            <strong>
                                "GỬI OTP"
                            </strong>{' '}
                            để nhận mã xác thực.
                        </p>

                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang gửi..."
                                onClick={handleSendOtp}
                                disabled={
                                    loading ||
                                    isRateLimited ||
                                    isLocked
                                }
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isLocked ? (
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        ĐANG BỊ KHÓA

                                        <span
                                            style={{
                                                background:
                                                    'rgba(255,255,255,0.2)',
                                                padding:
                                                    '2px 8px',
                                                borderRadius:
                                                    '4px',
                                                fontWeight:
                                                    'bold'
                                            }}
                                        >
                                            {formatLockTime(
                                                lockTimeLeft
                                            )}
                                        </span>
                                    </span>
                                ) : isRateLimited ? (
                                    `Đang chờ (${formatLockTime(
                                        rateLimitTimeLeft
                                    )})`
                                ) : (
                                    'GỬI OTP'
                                )}
                            </LoadingButton>
                        </div>
                    </>
                )}

                {/* ==================================================
                    STEP 2 - VERIFY OTP
                ================================================== */}

                {step === 'otp' && (
                    <>
                        <div className="forgot-icon-wrapper">
                            <ShieldCheck
                                size={42}
                                className="forgot-icon"
                            />
                        </div>

                        <p className="auth-subtitle">
                            Nhập mã OTP đã gửi đến{' '}
                            <strong className="text-highlight">
                                {email}
                            </strong>
                        </p>

                        {/* ==================================================
                            ATTEMPT COUNTER
                        ================================================== */}

                        {otpAttempts > 0 &&
                            !isLocked &&
                            !showLockModal && (
                                <div
                                    style={{
                                        textAlign:
                                            'center',
                                        marginBottom:
                                            '10px',
                                        fontSize:
                                            '14px',
                                        color:
                                            otpAttempts >= 3
                                                ? '#ff6b8a'
                                                : '#fbbf24'
                                    }}
                                >
                                    ⚠️ Bạn đã nhập sai{' '}
                                    <strong>
                                        {otpAttempts}/
                                        {maxOtpAttempts}
                                    </strong>{' '}
                                    lần.
                                    <br />

                                    {remainingOtpAttempts >
                                    0 ? (
                                        <>
                                            Còn{' '}
                                            <strong>
                                                {
                                                    remainingOtpAttempts
                                                }
                                            </strong>{' '}
                                            lần thử.
                                        </>
                                    ) : (
                                        <strong>
                                            Bạn đã hết số lần thử.
                                        </strong>
                                    )}
                                </div>
                            )}

                        {/* ==================================================
                            OTP INPUT
                        ================================================== */}

                        <div className="pin-input-container">
                            {Array.from({
                                length: 6
                            }).map((_, index) => (
                                <input
                                    key={index}
                                    ref={(el) =>
                                        (otpRefs.current[
                                            index
                                        ] = el)
                                    }
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={
                                        otp[index] ||
                                        ''
                                    }
                                    onChange={(e) =>
                                        handleOtpChange(
                                            index,
                                            e.target.value
                                        )
                                    }
                                    onKeyDown={(e) =>
                                        handleOtpKeyDown(
                                            index,
                                            e
                                        )
                                    }
                                    className={`pin-box ${
                                        isOtpExpired
                                            ? 'input-error'
                                            : ''
                                    } ${
                                        error &&
                                        error
                                            .toLowerCase()
                                            .includes(
                                                'otp'
                                            )
                                            ? 'input-error'
                                            : ''
                                    }`}
                                    disabled={
                                        loading ||
                                        isRateLimited ||
                                        isOtpExpired ||
                                        isLocked ||
                                        showLockModal
                                    }
                                />
                            ))}
                        </div>

                        {/* ==================================================
                            OTP TIMER
                        ================================================== */}

                        {!isLocked &&
                            !showLockModal && (
                                <div className="input-hint center-text">
                                    {isOtpExpired ? (
                                        <span
                                            style={{
                                                color:
                                                    '#ff6b8a'
                                            }}
                                        >
                                            ⚠️ OTP đã hết
                                            hạn. Vui lòng{' '}
                                            <strong>
                                                gửi lại
                                            </strong>{' '}
                                            mã mới.
                                        </span>
                                    ) : (
                                        <span>
                                            ⏳ OTP hết hạn
                                            sau:{' '}
                                            <strong
                                                style={{
                                                    color:
                                                        countdown <=
                                                        60
                                                            ? '#ff6b8a'
                                                            : '#4ade80'
                                                }}
                                            >
                                                {formatTime(
                                                    countdown
                                                )}
                                            </strong>{' '}
                                            (5 phút)
                                        </span>
                                    )}
                                </div>
                            )}

                        {/* ==================================================
                            LOCK MESSAGE
                        ================================================== */}

                        {isLocked && (
                            <div className="input-hint center-text">
                                <span
                                    style={{
                                        color:
                                            '#ff6b8a'
                                    }}
                                >
                                    🔒 Tài khoản bị khóa.
                                    Vui lòng đợi{' '}
                                    <strong>
                                        {formatLockTime(
                                            lockTimeLeft
                                        )}
                                    </strong>{' '}
                                    để thử lại.
                                </span>
                            </div>
                        )}

                        {/* ==================================================
                            RESEND OTP
                        ================================================== */}

                        <button
                            className="btn-user btn-outline-secondary"
                            onClick={
                                handleResendOtp
                            }
                            disabled={
                                loading ||
                                (
                                    countdown > 0 &&
                                    !isOtpExpired
                                ) ||
                                isRateLimited ||
                                isLocked ||
                                showLockModal
                            }
                            style={{
                                marginTop: '10px'
                            }}
                        >
                            <RefreshCw size={16} />

                            {isLocked ? (
                                <span
                                    style={{
                                        display: 'flex',
                                        alignItems:
                                            'center',
                                        justifyContent:
                                            'center',
                                        gap: '8px'
                                    }}
                                >
                                    ĐANG BỊ KHÓA

                                    <span
                                        style={{
                                            background:
                                                'rgba(255,255,255,0.2)',
                                            padding:
                                                '2px 8px',
                                            borderRadius:
                                                '4px',
                                            fontWeight:
                                                'bold'
                                        }}
                                    >
                                        {formatLockTime(
                                            lockTimeLeft
                                        )}
                                    </span>
                                </span>
                            ) : isRateLimited ? (
                                `Đang chờ (${formatLockTime(
                                    rateLimitTimeLeft
                                )})`
                            ) : (
                                'Gửi lại OTP'
                            )}
                        </button>

                        {/* ==================================================
                            BUTTON GROUP
                        ================================================== */}

                        <div
                            className="button-group"
                            style={{
                                marginTop: '20px'
                            }}
                        >
                            <button
                                className="btn-user back-btn"
                                onClick={() =>
                                    setStep('sent')
                                }
                            >
                                <ArrowLeft
                                    size={16}
                                />
                                Quay lại
                            </button>

                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang xác thực..."
                                onClick={
                                    handleVerifyOtp
                                }
                                disabled={
                                    loading ||
                                    isRateLimited ||
                                    isOtpExpired ||
                                    isLocked ||
                                    showLockModal
                                }
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isLocked ? (
                                    <span
                                        style={{
                                            display:
                                                'flex',
                                            alignItems:
                                                'center',
                                            justifyContent:
                                                'center',
                                            gap: '8px'
                                        }}
                                    >
                                        ĐANG BỊ KHÓA

                                        <span
                                            style={{
                                                background:
                                                    'rgba(255,255,255,0.2)',
                                                padding:
                                                    '2px 8px',
                                                borderRadius:
                                                    '4px',
                                                fontWeight:
                                                    'bold'
                                            }}
                                        >
                                            {formatLockTime(
                                                lockTimeLeft
                                            )}
                                        </span>
                                    </span>
                                ) : isRateLimited ? (
                                    `Đang chờ (${formatLockTime(
                                        rateLimitTimeLeft
                                    )})`
                                ) : (
                                    'XÁC NHẬN'
                                )}
                            </LoadingButton>
                        </div>
                    </>
                )}
            </div>

            {/* ==================================================
                LOCK MODAL
            ================================================== */}

            <LockModal
                show={showLockModal}
                message={
                    lockMessage ||
                    'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng đợi hết thời gian khóa để thử lại.'
                }
                email={email}
                onClose={() => {
                    setShowLockModal(false);
                }}
                onResend={() => {
                    setShowLockModal(false);
                    handleResendOtp();
                }}
            />
        </div>
    );
};

export default ForgotPin;

