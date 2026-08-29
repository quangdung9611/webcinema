import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import '../styles/UserAuth.css';

const OTP_PURPOSE = 'RESET_PASSWORD';
const OTP_EXPIRE_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 5;

const ForgotPassword = () => {
    const navigate = useNavigate();

    // ============================================================
    // BASIC STATE
    // ============================================================

    const [step, setStep] = useState('sent');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ============================================================
    // OTP STATE
    // ============================================================

    const [countdown, setCountdown] = useState(OTP_EXPIRE_SECONDS);
    const [isOtpExpired, setIsOtpExpired] = useState(false);
    const [otpAttempts, setOtpAttempts] = useState(0);

    // ============================================================
    // OTP LOCK STATE
    // ============================================================

    const [showLockModal, setShowLockModal] = useState(false);
    const [lockMessage, setLockMessage] = useState('');

    const [showLockTimer, setShowLockTimer] = useState(false);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);
    const [lockUntil, setLockUntil] = useState(null);

    // ============================================================
    // RATE LIMIT STATE
    // ============================================================

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);
    const [rateLimitUntil, setRateLimitUntil] = useState(null);

    // ============================================================
    // REFS
    // ============================================================

    const otpRefs = useRef([]);
    const otpTtlIntervalRef = useRef(null);
    const lockIntervalRef = useRef(null);
    const rateLimitIntervalRef = useRef(null);

    // ============================================================
    // FORMAT TIME
    // ============================================================

    const formatTime = (seconds) => {
        const safeSeconds = Math.max(
            0,
            Math.floor(Number(seconds) || 0)
        );

        const minutes = Math.floor(safeSeconds / 60);
        const secondsLeft = safeSeconds % 60;

        return `${minutes}:${secondsLeft
            .toString()
            .padStart(2, '0')}`;
    };

    // ============================================================
    // CURRENT LOCK STATUS
    // ============================================================

    const isLocked =
        Boolean(lockUntil) &&
        lockUntil > Date.now();

    // ============================================================
    // APPLY RATE LIMIT
    // ============================================================

    const applyRateLimit = (remainingSeconds) => {
        const seconds = Math.max(
            0,
            Number(remainingSeconds) || 0
        );

        if (seconds <= 0) {
            setIsRateLimited(false);
            setRateLimitTimeLeft(0);
            setRateLimitUntil(null);
            return;
        }

        const until =
            Date.now() + seconds * 1000;

        setIsRateLimited(true);
        setRateLimitTimeLeft(seconds);
        setRateLimitUntil(until);
    };

    // ============================================================
    // APPLY OTP LOCK
    //
    // BACKEND:
    //
    // {
    //     remainingSeconds: 300,
    //     lockedUntil: 1234567890000
    // }
    //
    // lockedUntil là timestamp tuyệt đối.
    // ============================================================

    const applyOtpLock = (data = {}) => {
        const remainingSeconds = Math.max(
            0,
            Number(data.remainingSeconds) || 0
        );

        let backendLockedUntil =
            Number(data.lockedUntil) || 0;

        /*
         * Ưu tiên tuyệt đối timestamp backend.
         *
         * Fallback chỉ dùng nếu backend chưa trả
         * lockedUntil.
         */
        if (
            !backendLockedUntil &&
            remainingSeconds > 0
        ) {
            backendLockedUntil =
                Date.now() +
                remainingSeconds * 1000;
        }

        // OTP cũ không còn hợp lệ
        setOtp('');
        setCountdown(0);
        setIsOtpExpired(true);
        setOtpAttempts(0);

        // Lock state
        setShowLockTimer(true);
        setLockTimeLeft(
            remainingSeconds
        );
        setLockUntil(
            backendLockedUntil || null
        );

        setLockMessage(
            'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng đợi hết thời gian khóa để thử lại.'
        );

        setShowLockModal(true);

        /*
         * OTP LOCK và SEND RATE LIMIT
         * là 2 cơ chế độc lập.
         */
        setIsRateLimited(false);
        setRateLimitTimeLeft(0);
        setRateLimitUntil(null);
    };

    // ============================================================
    // RATE LIMIT TIMER
    //
    // Dùng timestamp tuyệt đối.
    // Không dùng prev - 1.
    // ============================================================

    useEffect(() => {
        if (
            !isRateLimited ||
            !rateLimitUntil
        ) {
            return;
        }

        const tick = () => {
            const left = Math.max(
                0,
                Math.ceil(
                    (rateLimitUntil -
                        Date.now()) /
                        1000
                )
            );

            setRateLimitTimeLeft(left);

            if (left <= 0) {
                setIsRateLimited(false);
                setRateLimitTimeLeft(0);
                setRateLimitUntil(null);

                /*
                 * Chỉ xóa lỗi rate-limit.
                 * Không đụng vào OTP lock.
                 */
                setError('');
            }
        };

        tick();

        rateLimitIntervalRef.current =
            setInterval(tick, 250);

        return () => {
            if (
                rateLimitIntervalRef.current
            ) {
                clearInterval(
                    rateLimitIntervalRef.current
                );

                rateLimitIntervalRef.current =
                    null;
            }
        };
    }, [
        isRateLimited,
        rateLimitUntil
    ]);

    // ============================================================
    // OTP LOCK TIMER
    //
    // Đây là timer quan trọng nhất.
    //
    // Không countdown bằng prev - 1.
    // Luôn tính:
    //
    // lockedUntil - Date.now()
    //
    // nên không bị lệch theo render.
    // ============================================================

    useEffect(() => {
        if (
            !showLockTimer ||
            !lockUntil
        ) {
            return;
        }

        const tick = () => {
            const left = Math.max(
                0,
                Math.ceil(
                    (lockUntil -
                        Date.now()) /
                        1000
                )
            );

            setLockTimeLeft(left);

            if (left <= 0) {
                setShowLockTimer(false);
                setLockTimeLeft(0);
                setLockUntil(null);

                setShowLockModal(false);

                setOtp('');
                setOtpAttempts(0);

                /*
                 * Sau khi lock hết:
                 * OTP cũ đã bị xóa.
                 */
                setCountdown(0);
                setIsOtpExpired(true);

                /*
                 * Không còn lock nữa.
                 */
                setIsRateLimited(false);
                setRateLimitTimeLeft(0);
                setRateLimitUntil(null);

                setError(
                    '✅ Bạn đã được mở khóa. Vui lòng gửi OTP mới.'
                );

                setTimeout(() => {
                    setError('');
                }, 5000);
            }
        };

        tick();

        lockIntervalRef.current =
            setInterval(tick, 250);

        return () => {
            if (
                lockIntervalRef.current
            ) {
                clearInterval(
                    lockIntervalRef.current
                );

                lockIntervalRef.current =
                    null;
            }
        };
    }, [
        showLockTimer,
        lockUntil
    ]);

    // ============================================================
    // ĐỒNG BỘ OTP TTL
    //
    // Không chạy khi OTP đang bị lock.
    // ============================================================

    useEffect(() => {
        if (
            step !== 'otp' ||
            !email ||
            isLocked ||
            showLockModal
        ) {
            return;
        }

        let cancelled = false;

        const syncTTL = async () => {
            try {
                const response =
                    await api.get(
                        '/api/auth/check-otp-ttl',
                        {
                            params: {
                                email,
                                purpose:
                                    OTP_PURPOSE
                            }
                        }
                    );

                if (
                    cancelled ||
                    !response.data
                        ?.success
                ) {
                    return;
                }

                const ttl = Math.max(
                    0,
                    Number(
                        response.data
                            ?.data
                            ?.expiresIn
                    ) || 0
                );

                if (ttl > 0) {
                    setCountdown(ttl);
                    setIsOtpExpired(false);
                } else {
                    setCountdown(0);
                    setIsOtpExpired(true);
                }
            } catch (err) {
                console.error(
                    'Failed to sync OTP TTL:',
                    err
                );
            }
        };

        syncTTL();

        otpTtlIntervalRef.current =
            setInterval(
                syncTTL,
                1000
            );

        return () => {
            cancelled = true;

            if (
                otpTtlIntervalRef.current
            ) {
                clearInterval(
                    otpTtlIntervalRef.current
                );

                otpTtlIntervalRef.current =
                    null;
            }
        };
    }, [
        step,
        email,
        isLocked,
        showLockModal
    ]);

    // ============================================================
    // OTP INPUT
    // ============================================================

    const handleOtpChange = (
        index,
        value
    ) => {
        const clean = String(value || '')
            .replace(/\D/g, '')
            .slice(-1);

        const newOtp =
            otp.split('');

        newOtp[index] = clean;

        setOtp(
            newOtp
                .join('')
                .slice(0, 6)
        );

        if (
            clean &&
            index < 5
        ) {
            otpRefs.current[
                index + 1
            ]?.focus();
        }

        if (error) {
            setError('');
        }
    };

    const handleOtpKeyDown = (
        index,
        e
    ) => {
        if (
            e.key === 'Backspace' &&
            !otp[index] &&
            index > 0
        ) {
            otpRefs.current[
                index - 1
            ]?.focus();
        }
    };

    // ============================================================
    // GỬI OTP
    // ============================================================

    const handleSendOtp = async () => {
        const normalizedEmail =
            email.trim();

        if (!normalizedEmail) {
            setError(
                'Vui lòng nhập email'
            );
            return;
        }

        if (isLocked) {
            setError(
                `⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatTime(
                    lockTimeLeft
                )} để thử lại.`
            );
            return;
        }

        if (isRateLimited) {
            setError(
                `⚠️ Vui lòng đợi ${formatTime(
                    rateLimitTimeLeft
                )} trước khi thử lại.`
            );
            return;
        }

        setLoading(true);
        setError('');

        setOtp('');
        setOtpAttempts(0);

        try {
            const response =
                await api.post(
                    '/api/auth/forgot-password',
                    {
                        email:
                            normalizedEmail
                    }
                );

            if (
                response.data?.success
            ) {
                const expiresIn =
                    Math.max(
                        0,
                        Number(
                            response.data
                                ?.data
                                ?.expiresIn
                        ) ||
                            OTP_EXPIRE_SECONDS
                    );

                setEmail(
                    normalizedEmail
                );

                setCountdown(
                    expiresIn
                );

                setIsOtpExpired(
                    expiresIn <= 0
                );

                setStep('otp');
                setError('');

                /*
                 * Nếu trước đó từng có lock cũ
                 * đã hết thì clear state.
                 */
                setShowLockTimer(false);
                setLockTimeLeft(0);
                setLockUntil(null);
                setShowLockModal(false);
                setLockMessage('');
            }
        } catch (err) {
            const status =
                err.response?.status;

            const errorData =
                err.response?.data ||
                {};

            const errorMessage =
                errorData.message ||
                'Không thể gửi OTP';

            if (status === 429) {
                const remainingSeconds =
                    Number(
                        errorData.data
                            ?.remainingSeconds
                    ) || 0;

                const maxAttempts =
                    Number(
                        errorData.data
                            ?.maxAttempts
                    ) || 3;

                applyRateLimit(
                    remainingSeconds
                );

                setError(
                    `⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần trong 5 phút. Vui lòng thử lại sau ${formatTime(
                        remainingSeconds
                    )}.`
                );
            } else {
                setError(
                    errorMessage
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // GỬI LẠI OTP
    // ============================================================

    const handleResendOtp =
        async () => {
            if (isLocked) {
                setError(
                    `⚠️ OTP đang bị khóa. Vui lòng đợi ${formatTime(
                        lockTimeLeft
                    )}.`
                );
                return;
            }

            if (isRateLimited) {
                setError(
                    `⚠️ Vui lòng đợi ${formatTime(
                        rateLimitTimeLeft
                    )} trước khi thử lại.`
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

            if (!email.trim()) {
                setError(
                    'Vui lòng nhập email'
                );
                return;
            }

            setLoading(true);
            setError('');

            setOtp('');
            setOtpAttempts(0);

            try {
                const response =
                    await api.post(
                        '/api/auth/resend-otp',
                        {
                            email:
                                email.trim(),
                            purpose:
                                OTP_PURPOSE
                        }
                    );

                if (
                    response.data
                        ?.success
                ) {
                    const expiresIn =
                        Math.max(
                            0,
                            Number(
                                response.data
                                    ?.data
                                    ?.expiresIn
                            ) ||
                                OTP_EXPIRE_SECONDS
                        );

                    setCountdown(
                        expiresIn
                    );

                    setIsOtpExpired(
                        expiresIn <= 0
                    );

                    setError('');
                }
            } catch (err) {
                const status =
                    err.response
                        ?.status;

                const errorData =
                    err.response
                        ?.data || {};

                const errorMessage =
                    errorData.message ||
                    'Không thể gửi lại OTP';

                if (
                    status === 429
                ) {
                    const remainingSeconds =
                        Number(
                            errorData.data
                                ?.remainingSeconds
                        ) || 0;

                    applyRateLimit(
                        remainingSeconds
                    );

                    setError(
                        `⚠️ Vui lòng thử lại sau ${formatTime(
                            remainingSeconds
                        )}.`
                    );
                } else {
                    setError(
                        errorMessage
                    );
                }
            } finally {
                setLoading(false);
            }
        };

    // ============================================================
    // XÁC THỰC OTP
    // ============================================================

    const handleVerifyOtp =
        async () => {
            if (isLocked) {
                setError(
                    `⚠️ OTP đang bị khóa. Vui lòng đợi ${formatTime(
                        lockTimeLeft
                    )}.`
                );
                return;
            }

            if (isOtpExpired) {
                setError(
                    '⚠️ OTP đã hết hạn. Vui lòng gửi lại.'
                );
                return;
            }

            if (
                !/^\d{6}$/.test(
                    otp
                )
            ) {
                setError(
                    'Vui lòng nhập đủ 6 số OTP'
                );
                return;
            }

            if (isRateLimited) {
                setError(
                    `⚠️ Vui lòng đợi ${formatTime(
                        rateLimitTimeLeft
                    )} trước khi thử lại.`
                );
                return;
            }

            if (showLockModal) {
                setError(
                    '❌ OTP đã bị khóa. Vui lòng chờ hết thời gian khóa.'
                );
                return;
            }

            setLoading(true);
            setError('');

            try {
                const response =
                    await api.post(
                        '/api/auth/verify-otp-and-reset',
                        {
                            email:
                                email.trim(),
                            otp,
                            newPassword:
                                ''
                        }
                    );

                if (
                    response.data
                        ?.success
                ) {
                    navigate(
                        '/reset-password',
                        {
                            state: {
                                email:
                                    email.trim(),
                                otp,
                                fromForgotPassword:
                                    true
                            }
                        }
                    );
                }
            } catch (err) {
                const status =
                    err.response
                        ?.status;

                const errorData =
                    err.response
                        ?.data || {};

                let errorMessage =
                    errorData.message ||
                    'OTP không đúng';

                // ==================================================
                // OTP LOCKED
                // ==================================================

                if (
                    errorData.code ===
                    'OTP_LOCKED'
                ) {
                    const lockData =
                        errorData.data ||
                        {};

                    applyOtpLock(
                        lockData
                    );

                    errorMessage =
                        '❌ Bạn đã nhập sai 5 lần. OTP đã bị khóa 5 phút.';
                }

                // ==================================================
                // OTP EXPIRED / NOT FOUND
                // ==================================================

                else if (
                    errorData.code ===
                        'OTP_NOT_FOUND' ||
                    errorData.code ===
                        'OTP_EXPIRED' ||
                    errorMessage
                        .toLowerCase()
                        .includes(
                            'hết hạn'
                        )
                ) {
                    setOtp('');
                    setCountdown(0);
                    setIsOtpExpired(
                        true
                    );

                    errorMessage =
                        '⚠️ OTP đã hết hạn. Vui lòng gửi lại mã mới.';
                }

                // ==================================================
                // OTP INVALID
                //
                // Backend trả remainingAttempts.
                // Không tự cộng otpAttempts nữa.
                // ==================================================

                else if (
                    errorData.code ===
                    'OTP_INVALID'
                ) {
                    const attempts =
                        Number(
                            errorData.data
                                ?.attempts
                        ) || 0;

                    const remainingAttempts =
                        Number(
                            errorData.data
                                ?.remainingAttempts
                        ) ||
                        Math.max(
                            0,
                            OTP_MAX_ATTEMPTS -
                                attempts
                        );

                    setOtpAttempts(
                        attempts
                    );

                    errorMessage =
                        `❌ OTP không đúng. Bạn còn ${remainingAttempts} lần thử.`;
                }

                // ==================================================
                // RATE LIMIT
                // ==================================================

                else if (
                    status === 429
                ) {
                    const remainingSeconds =
                        Number(
                            errorData.data
                                ?.remainingSeconds
                        ) || 0;

                    applyRateLimit(
                        remainingSeconds
                    );

                    errorMessage =
                        `⚠️ Vui lòng thử lại sau ${formatTime(
                            remainingSeconds
                        )}.`;
                }

                setError(
                    errorMessage
                );
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

                {error && (
                    <div className="forgot-message error">
                        <AlertCircle size={18} />
                        <span>
                            {error}
                        </span>
                    </div>
                )}

                {/* ==================================================
                    STEP SENT
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
                                marginBottom:
                                    '10px'
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
                                marginBottom:
                                    '20px',
                                fontSize:
                                    '14px',
                                color:
                                    '#94a3b8'
                            }}
                        >
                            Vui lòng bấm nút{' '}
                            <strong>
                                "GỬI OTP"
                            </strong>{' '}
                            để nhận mã xác thực.
                        </p>

                        <div className="form-group">
                            <label>
                                Email đăng ký
                            </label>

                            <input
                                type="email"
                                className="auth-input"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                disabled={
                                    loading ||
                                    isRateLimited ||
                                    isLocked
                                }
                                autoComplete="email"
                            />
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={
                                    loading
                                }
                                loadingText="Đang gửi..."
                                onClick={
                                    handleSendOtp
                                }
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
                                            display:
                                                'flex',
                                            alignItems:
                                                'center',
                                            justifyContent:
                                                'center',
                                            gap:
                                                '8px'
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
                                            {formatTime(
                                                lockTimeLeft
                                            )}
                                        </span>
                                    </span>
                                ) : isRateLimited ? (
                                    `Đang chờ (${formatTime(
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
                    STEP OTP
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

                        {/* SỐ LẦN THỬ */}

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
                                            otpAttempts >=
                                            3
                                                ? '#ff6b8a'
                                                : '#fbbf24'
                                    }}
                                >
                                    ⚠️ Bạn đã nhập sai{' '}
                                    {
                                        otpAttempts
                                    }
                                    /5 lần. Còn{' '}
                                    {Math.max(
                                        0,
                                        OTP_MAX_ATTEMPTS -
                                            otpAttempts
                                    )}{' '}
                                    lần thử.
                                </div>
                            )}

                        {/* LOCK MESSAGE */}

                        {showLockModal && (
                            <div
                                style={{
                                    textAlign:
                                        'center',
                                    marginBottom:
                                        '10px',
                                    padding:
                                        '10px',
                                    background:
                                        'rgba(255, 59, 92, 0.12)',
                                    borderRadius:
                                        '8px',
                                    border:
                                        '1px solid rgba(255, 59, 92, 0.3)',
                                    color:
                                        '#ff6b8a'
                                }}
                            >
                                🔒 Bạn đã nhập sai
                                5 lần. Vui lòng
                                đợi{' '}
                                <strong>
                                    {formatTime(
                                        lockTimeLeft
                                    )}
                                </strong>{' '}
                                để thử lại.
                            </div>
                        )}

                        {/* OTP INPUT */}

                        <div className="pin-input-container">
                            {Array.from({
                                length: 6
                            }).map(
                                (_, index) => (
                                    <input
                                        key={
                                            index
                                        }
                                        ref={(el) =>
                                            (otpRefs.current[
                                                index
                                            ] =
                                                el)
                                        }
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={
                                            otp[
                                                index
                                            ] ||
                                            ''
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            handleOtpChange(
                                                index,
                                                e.target
                                                    .value
                                            )
                                        }
                                        onKeyDown={(
                                            e
                                        ) =>
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
                                            error.includes(
                                                'OTP'
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
                                )
                            )}
                        </div>

                        {/* OTP TIMER */}

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
                                            hạn. Vui
                                            lòng{' '}
                                            <strong>
                                                gửi lại
                                            </strong>{' '}
                                            mã mới.
                                        </span>
                                    ) : (
                                        <span>
                                            ⏳ OTP hết
                                            hạn sau:{' '}
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

                        {/* LOCK TIMER */}

                        {isLocked && (
                            <div className="input-hint center-text">
                                <span
                                    style={{
                                        color:
                                            '#ff6b8a'
                                    }}
                                >
                                    🔒 OTP đang bị khóa.
                                    Vui lòng đợi{' '}
                                    <strong>
                                        {formatTime(
                                            lockTimeLeft
                                        )}
                                    </strong>{' '}
                                    để thử lại.
                                </span>
                            </div>
                        )}

                        {/* RESEND */}

                        <button
                            className="btn-user btn-outline-secondary"
                            onClick={
                                handleResendOtp
                            }
                            disabled={
                                loading ||
                                (
                                    countdown >
                                        0 &&
                                    !isOtpExpired
                                ) ||
                                isRateLimited ||
                                isLocked ||
                                showLockModal
                            }
                            style={{
                                marginTop:
                                    '10px'
                            }}
                        >
                            <RefreshCw size={16} />

                            {isLocked ? (
                                <span
                                    style={{
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        justifyContent:
                                            'center',
                                        gap:
                                            '8px'
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
                                        {formatTime(
                                            lockTimeLeft
                                        )}
                                    </span>
                                </span>
                            ) : isRateLimited ? (
                                `Đang chờ (${formatTime(
                                    rateLimitTimeLeft
                                )})`
                            ) : (
                                'Gửi lại OTP'
                            )}
                        </button>

                        {/* BUTTON GROUP */}

                        <div
                            className="button-group"
                            style={{
                                marginTop:
                                    '20px'
                            }}
                        >
                            <button
                                className="btn-user back-btn"
                                onClick={() => {
                                    setStep(
                                        'sent'
                                    );
                                    setOtp('');
                                    setError('');
                                }}
                            >
                                <ArrowLeft size={16} />
                                Quay lại
                            </button>

                            <LoadingButton
                                type="button"
                                loading={
                                    loading
                                }
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
                                            gap:
                                                '8px'
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
                                            {formatTime(
                                                lockTimeLeft
                                            )}
                                        </span>
                                    </span>
                                ) : isRateLimited ? (
                                    `Đang chờ (${formatTime(
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

            {/* ========================================================
                LOCK MODAL
            ======================================================== */}

            <LockModal
                show={showLockModal}
                message={
                    lockMessage ||
                    'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng đợi hết thời gian khóa để thử lại.'
                }
                lockedUntil={
                    lockUntil
                }
                email={email}
                onClose={() => {
                    /*
                     * Chỉ đóng modal.
                     * Không xóa lockUntil.
                     */
                    setShowLockModal(
                        false
                    );
                }}
                onResend={() => {
                    /*
                     * Không được resend khi
                     * backend lock vẫn còn.
                     */
                    if (isLocked) {
                        return;
                    }

                    setShowLockModal(
                        false
                    );

                    handleResendOtp();
                }}
            />
        </div>
    );
};

export default ForgotPassword;