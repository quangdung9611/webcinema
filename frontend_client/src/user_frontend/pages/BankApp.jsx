// ============================================================
// BANK APP
// Bước 5: THANH TOÁN QUA NGÂN HÀNG / VIETQR
// ============================================================

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';

import {
    useLocation,
    useNavigate,
    useBlocker,
} from 'react-router-dom';

import api from '../../api/api';

// COMPONENTS
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

// STYLES
import '../styles/BankApp.css';

// ============================================================
// CONSTANTS
// ============================================================

const OTP_TTL = 300;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 300;

// ============================================================
// COMPONENT
// ============================================================

const BankApp = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // ========================================================
    // BOOKING DATA
    // ========================================================

    const getBookingData = () => {
        const stateData = location.state || {};

        if (stateData.tempBookingId) {
            return stateData;
        }

        try {
            const savedTicket =
                localStorage.getItem('lastSuccessTicket');

            if (savedTicket) {
                return JSON.parse(savedTicket);
            }
        } catch (error) {
            console.error(
                '❌ [BANK APP] Lỗi đọc lastSuccessTicket:',
                error
            );
        }

        return stateData;
    };

    const bookingData = getBookingData();

    const tempBookingId = String(
        bookingData.tempBookingId ||
        localStorage.getItem('tempBookingId') ||
        ''
    );

    const ownerToken =
        bookingData.ownerToken ||
        localStorage.getItem('bookingOwnerToken') ||
        '';

    const customerEmail =
        bookingData.customerEmail ||
        localStorage.getItem('customerEmail') ||
        '';

    const customerName =
        bookingData.customerName ||
        '';

    const customerPhone =
        bookingData.customerPhone ||
        '';

    const totalAmount =
        Number(bookingData.totalAmount || 0);

    const movie =
        bookingData.movie || {};

    const selectedCinema =
        bookingData.selectedCinema || {};

    const selectedDate =
        bookingData.selectedDate || '';

    const selectedShowtime =
        bookingData.selectedShowtime || {};

    const selectedSeats =
        Array.isArray(bookingData.selectedSeats)
            ? bookingData.selectedSeats
            : [];

    const selectedFoods =
        Array.isArray(bookingData.selectedFoods)
            ? bookingData.selectedFoods
            : [];

    const foods =
        Array.isArray(bookingData.foods)
            ? bookingData.foods
            : [];

    const totalTicketPrice =
        Number(bookingData.totalTicketPrice || 0);

    const totalFoodPrice =
        Number(bookingData.totalFoodPrice || 0);

    const showtimeDetail =
        bookingData.showtimeDetail || {};

    // ========================================================
    // REFS
    // ========================================================

    const hasSentOtp = useRef(
        localStorage.getItem('bankHasSentOtp') === 'true'
    );

    const hasVisitedBankApp = useRef(
        localStorage.getItem('bankHasVisited') === 'true'
    );

    const paymentCompletedRef = useRef(false);

    const isPaymentInitiated = useRef(
        localStorage.getItem('paymentInitiated') === 'true'
    );

    const isCancellingRef = useRef(false);

    const isModalOpenRef = useRef(false);

    const hasShownModalRef = useRef(false);

    const isFirstLoad = useRef(true);

    const otpInputsRef = useRef([]);

    const otpExpiredRef = useRef(false);

    const timerIntervalRef = useRef(null);

    const redisSyncIntervalRef = useRef(null);

    const autoNavigateRef = useRef(null);

    const redirectTimeoutRef = useRef(null);

    const otpAttemptsRef = useRef(
        parseInt(
            localStorage.getItem('bankOtpAttempts') || '0',
            10
        )
    );

    // ========================================================
    // LOCK STATE REF
    // ========================================================

    const isLockedRef = useRef(
        localStorage.getItem('bankIsLocked') === 'true'
    );

    // ========================================================
    // OTP TIME
    // ========================================================

    const [timeLeft, setTimeLeft] = useState(() => {
        const saved =
            parseInt(
                localStorage.getItem('bankOtpTimeLeft') || '0',
                10
            );

        return saved > 0 ? saved : OTP_TTL;
    });

    // ========================================================
    // OTP
    // ========================================================

    const [otp, setOtp] = useState(
        () =>
            localStorage.getItem(
                'bankOtpInput'
            ) || ''
    );

    // ========================================================
    // LOADING
    // ========================================================

    const [loadingVerify, setLoadingVerify] =
        useState(false);

    const [loadingSendOtp, setLoadingSendOtp] =
        useState(false);

    const [isSyncing, setIsSyncing] =
        useState(true);

    // ========================================================
    // RESEND COOLDOWN
    // ========================================================

    const [resendCooldown, setResendCooldown] =
        useState(() => {
            const saved =
                parseInt(
                    localStorage.getItem(
                        'bankResendCooldown'
                    ) || '0',
                    10
                );

            return saved > 0 ? saved : 0;
        });

    // ========================================================
    // LOCK STATE
    // ========================================================

    const [isLocked, setIsLocked] = useState(() => {
        const savedLocked =
            localStorage.getItem(
                'bankIsLocked'
            ) === 'true';

        const lockEndTime =
            parseInt(
                localStorage.getItem(
                    'bankLockTime'
                ) || '0',
                10
            );

        if (!savedLocked || !lockEndTime) {
            return false;
        }

        const remaining = Math.ceil(
            (lockEndTime - Date.now()) / 1000
        );

        if (remaining > 0) {
            return true;
        }

        localStorage.removeItem(
            'bankIsLocked'
        );

        localStorage.removeItem(
            'bankLockTime'
        );

        localStorage.removeItem(
            'bankOtpAttempts'
        );

        return false;
    });

    // ========================================================
    // LOCK TIME
    // ========================================================

    const [lockTimeLeft, setLockTimeLeft] =
        useState(() => {
            const lockEndTime =
                parseInt(
                    localStorage.getItem(
                        'bankLockTime'
                    ) || '0',
                    10
                );

            if (!lockEndTime) {
                return 0;
            }

            const remaining = Math.ceil(
                (lockEndTime - Date.now()) / 1000
            );

            return remaining > 0
                ? remaining
                : 0;
        });

    // ========================================================
    // BACK CONFIRM
    // ========================================================

    const [showBackConfirm, setShowBackConfirm] =
        useState(false);

    // ========================================================
    // MODAL
    // ========================================================

    const [modalConfig, setModalConfig] =
        useState({
            show: false,
            type: 'info',
            title: '',
            message: '',
            onConfirm: () => {},
            onCancel: () => {},
        });

    // ========================================================
    // FORMAT TIME
    // ========================================================

    const formatTime = useCallback(
        seconds => {
            const safeSeconds =
                Math.max(
                    0,
                    Number(seconds) || 0
                );

            const minutes =
                Math.floor(
                    safeSeconds / 60
                );

            const secs =
                safeSeconds % 60;

            return `${String(
                minutes
            ).padStart(2, '0')}:${String(
                secs
            ).padStart(2, '0')}`;
        },
        []
    );

    // ========================================================
    // CLOSE MODAL
    // ========================================================

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({
            ...prev,
            show: false,
        }));

        hasShownModalRef.current = false;
    }, []);

    // ========================================================
    // OPEN MODAL
    // ========================================================

    const openModal = useCallback(
        (
            type,
            title,
            message,
            onConfirmCustom = null,
            onCancelCustom = null
        ) => {
            if (
                isModalOpenRef.current ||
                hasShownModalRef.current
            ) {
                return;
            }

            hasShownModalRef.current = true;

            setModalConfig({
                show: true,
                type,
                title,
                message,
                onConfirm:
                    onConfirmCustom ||
                    closeModal,
                onCancel:
                    onCancelCustom ||
                    closeModal,
            });
        },
        [closeModal]
    );

    // ========================================================
    // TRACK MODAL
    // ========================================================

    useEffect(() => {
        isModalOpenRef.current =
            modalConfig.show;
    }, [modalConfig.show]);

    // ========================================================
    // FETCH REDIS TTL
    // ========================================================

    const fetchTimeFromRedis =
        useCallback(async () => {
            if (!tempBookingId) {
                return null;
            }

            try {
                const response =
                    await api.get(
                        `/api/bank/check-ttl/${tempBookingId}`
                    );

                if (
                    response.data?.success
                ) {
                    const expiresIn =
                        Number(
                            response.data
                                ?.data
                                ?.expiresIn || 0
                        );

                    const isExpired =
                        Boolean(
                            response.data
                                ?.data
                                ?.isExpired
                        );

                    if (
                        !isExpired &&
                        expiresIn > 0
                    ) {
                        return expiresIn;
                    }

                    return 0;
                }

                return null;
            } catch (error) {
                console.error(
                    '❌ [BANK APP] Lỗi lấy TTL Redis:',
                    error
                );

                return null;
            }
        }, [tempBookingId]);

    // ========================================================
    // SYNC TIMER WITH REDIS
    // ========================================================

    const syncTimerWithRedis =
        useCallback(async () => {
            if (!tempBookingId) {
                setIsSyncing(false);
                return;
            }

            try {
                setIsSyncing(true);

                const redisTime =
                    await fetchTimeFromRedis();

                if (
                    redisTime !== null
                ) {
                    if (redisTime > 0) {
                        setTimeLeft(
                            redisTime
                        );

                        localStorage.setItem(
                            'bankOtpTimeLeft',
                            String(
                                redisTime
                            )
                        );

                        otpExpiredRef.current =
                            false;
                    } else {
                        setTimeLeft(0);

                        localStorage.setItem(
                            'bankOtpTimeLeft',
                            '0'
                        );

                        otpExpiredRef.current =
                            true;
                    }

                    return;
                }

                // ------------------------------------------------
                // FALLBACK LOCALSTORAGE
                // ------------------------------------------------

                const saved =
                    parseInt(
                        localStorage.getItem(
                            'bankOtpTimeLeft'
                        ) || '0',
                        10
                    );

                if (saved > 0) {
                    setTimeLeft(saved);
                } else {
                    setTimeLeft(0);
                    otpExpiredRef.current =
                        true;
                }
            } catch (error) {
                console.error(
                    '❌ [BANK APP] Lỗi đồng bộ timer:',
                    error
                );
            } finally {
                setIsSyncing(false);
            }
        }, [
            tempBookingId,
            fetchTimeFromRedis,
        ]);

    // ========================================================
    // RESET LOCK
    // ========================================================

    const resetLockState =
        useCallback(() => {
            setIsLocked(false);
            setLockTimeLeft(0);

            isLockedRef.current =
                false;

            otpAttemptsRef.current =
                0;

            localStorage.removeItem(
                'bankIsLocked'
            );

            localStorage.removeItem(
                'bankLockTime'
            );

            localStorage.removeItem(
                'bankOtpAttempts'
            );
        }, []);

    // ========================================================
    // LOCK ACCOUNT
    // ========================================================

    const lockAccount = useCallback(
        (remainingSeconds = 300) => {
            const safeSeconds =
                Math.max(
                    1,
                    Number(
                        remainingSeconds
                    ) || 300
                );

            const lockEndTime =
                Date.now() +
                safeSeconds * 1000;

            setIsLocked(true);
            setLockTimeLeft(
                safeSeconds
            );

            isLockedRef.current =
                true;

            localStorage.setItem(
                'bankIsLocked',
                'true'
            );

            localStorage.setItem(
                'bankLockTime',
                String(lockEndTime)
            );

            localStorage.setItem(
                'bankOtpAttempts',
                String(
                    otpAttemptsRef.current
                )
            );

            openModal(
                'error',
                'OTP BỊ KHÓA',
                `Bạn đã nhập sai OTP quá ${OTP_MAX_ATTEMPTS} lần. Tài khoản đã bị khóa ${formatTime(
                    safeSeconds
                )}. Vui lòng thử lại sau.`,
                closeModal
            );
        },
        [
            closeModal,
            formatTime,
            openModal,
        ]
    );

    // ========================================================
    // CLEAR ALL BOOKING DATA
    // ========================================================

    const clearAllBookingData =
        useCallback(() => {
            const keysToRemove = [
                'bankHasSentOtp',
                'bankHasVisited',
                'bankOtpTimeLeft',
                'bankOtpInput',
                'bankLastOtpSentAt',
                'bankResendCooldown',

                'paymentInitiated',
                'paymentCompleted',
                'completedBookingId',

                'holdExpiresAt',
                'selectedSeats',
                'currentShowtimeId',

                'selectedFoods',
                'booking_temp',

                'tempBookingId',

                'bookingOwnerToken',

                'bankIsLocked',
                'bankLockTime',
                'bankOtpAttempts',
            ];

            keysToRemove.forEach(
                key =>
                    localStorage.removeItem(
                        key
                    )
            );

            setTimeLeft(0);
            setResendCooldown(0);
            setOtp('');

            resetLockState();

            hasSentOtp.current =
                false;

            hasVisitedBankApp.current =
                false;

            otpExpiredRef.current =
                false;

            paymentCompletedRef.current =
                true;

            isPaymentInitiated.current =
                false;

            hasShownModalRef.current =
                false;
        }, [resetLockState]);

    // ========================================================
    // CANCEL TEMP BOOKING SERVER
    // ========================================================

    const cancelBookingOnServer =
        useCallback(async () => {
            if (
                !tempBookingId ||
                isCancellingRef.current
            ) {
                return;
            }

            isCancellingRef.current =
                true;

            try {
                await api.post(
                    '/api/bank/cancel-timeout',
                    {
                        tempBookingId,
                        ownerToken:
                            ownerToken || undefined,
                    },
                    {
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                    }
                );

                console.log(
                    '✅ [BANK APP] Temp booking cancelled'
                );
            } catch (error) {
                console.error(
                    '❌ [BANK APP] Lỗi hủy temp booking:',
                    error
                );
            } finally {
                isCancellingRef.current =
                    false;
            }
        }, [
            tempBookingId,
            ownerToken,
        ]);

    // ========================================================
    // TIMER EXPIRED
    // ========================================================

    const handleTimeExpire =
        useCallback(async () => {
            if (
                paymentCompletedRef.current
            ) {
                return;
            }

            await cancelBookingOnServer();

            const keysToRemove = [
                'selectedSeats',
                'holdExpiresAt',
                'currentShowtimeId',

                'booking_seats',
                'booking_showtime',
                'booking_data',

                'selected_foods',
                'food_selection',

                'booking_cinema',
                'booking_date',
                'booking_movie',
                'booking_showtime',

                'selectedFoods',
                'booking_temp',

                'bookingOwnerToken',

                'tempBookingId',

                'lastSuccessTicket',
                'paymentInitiated',
            ];

            keysToRemove.forEach(
                key =>
                    localStorage.removeItem(
                        key
                    )
            );

            setTimeLeft(0);
            setOtp('');

            otpExpiredRef.current =
                true;

            openModal(
                'error',
                'HẾT THỜI GIAN GIỮ GHẾ',
                'Thời gian giữ ghế hoặc thanh toán đã kết thúc. Vui lòng chọn lại ghế để tiếp tục.',
                () => {
                    closeModal();
                    navigate('/');
                }
            );
        }, [
            cancelBookingOnServer,
            closeModal,
            navigate,
            openModal,
        ]);

    // ========================================================
    // BLOCK ROUTE
    // ========================================================

    const shouldBlock =
        useCallback(() => {
            if (
                paymentCompletedRef.current
            ) {
                return false;
            }

            if (
                !tempBookingId
            ) {
                return false;
            }

            if (
                timeLeft <= 0
            ) {
                return false;
            }

            return (
                location.pathname ===
                '/bank-app'
            );
        }, [
            tempBookingId,
            timeLeft,
            location.pathname,
        ]);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            shouldBlock()
    );

    // ========================================================
    // BLOCKER MODAL
    // ========================================================

    useEffect(() => {
        if (
            blocker.state === 'blocked'
        ) {
            if (
                !modalConfig.show &&
                !showBackConfirm
            ) {
                setShowBackConfirm(
                    true
                );
            }
        }
    }, [
        blocker.state,
        modalConfig.show,
        showBackConfirm,
    ]);

    // ========================================================
    // STAY
    // ========================================================

    const handleStay = () => {
        setShowBackConfirm(
            false
        );

        if (
            blocker.state ===
            'blocked'
        ) {
            blocker.reset();
        }
    };

    // ========================================================
    // CLEAR + GO HOME
    // ========================================================

    const clearAllAndGoHome =
        async () => {
            setShowBackConfirm(
                false
            );

            await cancelBookingOnServer();

            clearAllBookingData();

            if (
                blocker.state ===
                'blocked'
            ) {
                blocker.proceed();
            }

            navigate('/');
        };

    // ========================================================
    // SAVE LOCAL STATE
    // ========================================================

    useEffect(() => {
        localStorage.setItem(
            'bankOtpTimeLeft',
            String(timeLeft)
        );
    }, [timeLeft]);

    useEffect(() => {
        localStorage.setItem(
            'bankOtpInput',
            otp
        );
    }, [otp]);

    useEffect(() => {
        if (
            resendCooldown > 0
        ) {
            localStorage.setItem(
                'bankResendCooldown',
                String(
                    resendCooldown
                )
            );
        } else {
            localStorage.removeItem(
                'bankResendCooldown'
            );
        }
    }, [resendCooldown]);

    // ========================================================
    // LOCK TIMER
    // ========================================================

    useEffect(() => {
        if (
            !isLocked
        ) {
            return;
        }

        const updateLockTimer =
            () => {
                const lockEndTime =
                    parseInt(
                        localStorage.getItem(
                            'bankLockTime'
                        ) || '0',
                        10
                    );

                if (
                    !lockEndTime
                ) {
                    resetLockState();
                    return;
                }

                const remaining =
                    Math.ceil(
                        (
                            lockEndTime -
                            Date.now()
                        ) / 1000
                    );

                if (
                    remaining <= 0
                ) {
                    resetLockState();

                    setResendCooldown(
                        0
                    );

                    localStorage.removeItem(
                        'bankResendCooldown'
                    );

                    openModal(
                        'info',
                        'MỞ KHÓA TÀI KHOẢN',
                        'Tài khoản đã được mở khóa. Bạn có thể gửi lại OTP.',
                        closeModal
                    );

                    return;
                }

                setLockTimeLeft(
                    remaining
                );
            };

        updateLockTimer();

        const timer =
            setInterval(
                updateLockTimer,
                1000
            );

        return () =>
            clearInterval(timer);
    }, [
        isLocked,
        closeModal,
        openModal,
        resetLockState,
    ]);

    // ========================================================
    // RESEND COOLDOWN TIMER
    // ========================================================

    useEffect(() => {
        if (
            resendCooldown <= 0
        ) {
            return;
        }

        const timer =
            setInterval(() => {
                setResendCooldown(
                    previous => {
                        if (
                            previous <= 1
                        ) {
                            return 0;
                        }

                        return previous - 1;
                    }
                );
            }, 1000);

        return () =>
            clearInterval(timer);
    }, [resendCooldown]);

    // ========================================================
    // SEND OTP
    // ========================================================

    const sendOtpApi =
        useCallback(async () => {
            if (
                !customerEmail ||
                !tempBookingId
            ) {
                return false;
            }

            setLoadingSendOtp(
                true
            );

            try {
                const response =
                    await api.post(
                        '/api/bank/send-otp',
                        {
                            email:
                                customerEmail,
                            tempBookingId,
                        },
                        {
                            headers: {
                                'Content-Type':
                                    'application/json',
                            },
                        }
                    );

                if (
                    !response.data?.success
                ) {
                    throw new Error(
                        response.data
                            ?.message ||
                            'Không thể gửi OTP.'
                    );
                }

                const now =
                    Date.now();

                localStorage.setItem(
                    'bankLastOtpSentAt',
                    String(now)
                );

                hasSentOtp.current =
                    true;

                hasVisitedBankApp.current =
                    true;

                localStorage.setItem(
                    'bankHasSentOtp',
                    'true'
                );

                localStorage.setItem(
                    'bankHasVisited',
                    'true'
                );

                localStorage.setItem(
                    'paymentInitiated',
                    'true'
                );

                isPaymentInitiated.current =
                    true;

                otpAttemptsRef.current =
                    0;

                localStorage.setItem(
                    'bankOtpAttempts',
                    '0'
                );

                resetLockState();

                setOtp('');

                localStorage.setItem(
                    'bankOtpInput',
                    ''
                );

                const redisTime =
                    await fetchTimeFromRedis();

                const newTime =
                    redisTime !== null &&
                    redisTime > 0
                        ? redisTime
                        : OTP_TTL;

                setTimeLeft(
                    newTime
                );

                localStorage.setItem(
                    'bankOtpTimeLeft',
                    String(
                        newTime
                    )
                );

                otpExpiredRef.current =
                    false;

                setResendCooldown(
                    RESEND_COOLDOWN
                );

                localStorage.setItem(
                    'bankResendCooldown',
                    String(
                        RESEND_COOLDOWN
                    )
                );

                console.log(
                    '✅ [BANK APP] OTP đã được gửi'
                );

                return true;
            } catch (error) {
                const message =
                    error.response
                        ?.data
                        ?.message ||
                    error.message ||
                    'Không thể gửi mã OTP. Vui lòng thử lại.';

                openModal(
                    'error',
                    'LỖI GỬI OTP',
                    message
                );

                return false;
            } finally {
                setLoadingSendOtp(
                    false
                );
            }
        }, [
            customerEmail,
            tempBookingId,
            fetchTimeFromRedis,
            openModal,
            resetLockState,
        ]);

    // ========================================================
    // RESEND OTP
    // ========================================================

    const handleResendOtp =
        async () => {
            if (
                paymentCompletedRef.current
            ) {
                openModal(
                    'info',
                    'THÔNG BÁO',
                    'Bạn đã thanh toán thành công.'
                );

                return;
            }

            if (
                isLockedRef.current ||
                isLocked
            ) {
                openModal(
                    'error',
                    'TÀI KHOẢN BỊ KHÓA',
                    `Tài khoản đang bị khóa. Vui lòng thử lại sau ${formatTime(
                        lockTimeLeft
                    )}.`
                );

                return;
            }

            if (
                resendCooldown > 0
            ) {
                openModal(
                    'info',
                    'THÔNG BÁO',
                    `Vui lòng đợi ${formatTime(
                        resendCooldown
                    )} trước khi gửi lại OTP.`
                );

                return;
            }

            if (
                !customerEmail ||
                !tempBookingId
            ) {
                openModal(
                    'error',
                    'THIẾU THÔNG TIN',
                    'Không tìm thấy thông tin thanh toán.'
                );

                return;
            }

            setLoadingSendOtp(
                true
            );

            try {
                const response =
                    await api.post(
                        '/api/bank/resend-otp',
                        {
                            email:
                                customerEmail,
                            tempBookingId,
                        },
                        {
                            headers: {
                                'Content-Type':
                                    'application/json',
                            },
                        }
                    );

                if (
                    !response.data?.success
                ) {
                    throw new Error(
                        response.data
                            ?.message ||
                        'Không thể gửi lại OTP.'
                    );
                }

                const now =
                    Date.now();

                localStorage.setItem(
                    'bankLastOtpSentAt',
                    String(now)
                );

                hasSentOtp.current =
                    true;

                hasVisitedBankApp.current =
                    true;

                localStorage.setItem(
                    'bankHasSentOtp',
                    'true'
                );

                localStorage.setItem(
                    'bankHasVisited',
                    'true'
                );

                localStorage.setItem(
                    'paymentInitiated',
                    'true'
                );

                isPaymentInitiated.current =
                    true;

                otpAttemptsRef.current =
                    0;

                localStorage.setItem(
                    'bankOtpAttempts',
                    '0'
                );

                resetLockState();

                const responseTTL =
                    Number(
                        response.data
                            ?.data
                            ?.expiresIn || 0
                    );

                const redisTime =
                    responseTTL > 0
                        ? responseTTL
                        : await fetchTimeFromRedis();

                const newTime =
                    redisTime !== null &&
                    redisTime > 0
                        ? redisTime
                        : OTP_TTL;

                setTimeLeft(
                    newTime
                );

                localStorage.setItem(
                    'bankOtpTimeLeft',
                    String(
                        newTime
                    )
                );

                otpExpiredRef.current =
                    false;

                setOtp('');

                localStorage.setItem(
                    'bankOtpInput',
                    ''
                );

                setResendCooldown(
                    RESEND_COOLDOWN
                );

                localStorage.setItem(
                    'bankResendCooldown',
                    String(
                        RESEND_COOLDOWN
                    )
                );

                openModal(
                    'success',
                    'THÀNH CÔNG',
                    'Mã OTP mới đã được gửi tới email của bạn.'
                );
            } catch (error) {
                const errorData =
                    error.response
                        ?.data || {};

                const message =
                    errorData.message ||
                    'Không thể gửi lại mã OTP.';

                if (
                    error.response
                        ?.status ===
                    429
                ) {
                    const remaining =
                        Number(
                            errorData
                                ?.data
                                ?.remainingSeconds ||
                            300
                        );

                    openModal(
                        'error',
                        'QUÁ NHIỀU YÊU CẦU',
                        `Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ${formatTime(
                            remaining
                        )}.`
                    );

                    return;
                }

                openModal(
                    'error',
                    'LỖI GỬI OTP',
                    message
                );
            } finally {
                setLoadingSendOtp(
                    false
                );
            }
        };

    // ========================================================
    // INITIALIZE BANK APP
    // ========================================================

    useEffect(() => {
        let cancelled = false;

        const initialize =
            async () => {
                if (
                    paymentCompletedRef.current
                ) {
                    return;
                }

                if (
                    !customerEmail ||
                    !tempBookingId
                ) {
                    return;
                }

                await syncTimerWithRedis();

                if (cancelled) {
                    return;
                }

                const hasOtp =
                    Boolean(
                        localStorage.getItem(
                            'bankOtpInput'
                        )
                    );

                const hasSent =
                    localStorage.getItem(
                        'bankHasSentOtp'
                    ) === 'true';

                // ------------------------------------------------
                // ĐÃ CÓ OTP
                // ------------------------------------------------

                if (
                    hasOtp ||
                    hasSent
                ) {
                    return;
                }

                // ------------------------------------------------
                // KIỂM TRA PAYMENT INITIATED
                // ------------------------------------------------

                const initiated =
                    localStorage.getItem(
                        'paymentInitiated'
                    ) === 'true' ||
                    isPaymentInitiated.current;

                if (!initiated) {
                    if (
                        !isFirstLoad.current
                    ) {
                        openModal(
                            'error',
                            'TRUY CẬP KHÔNG HỢP LỆ',
                            'Vui lòng bắt đầu thanh toán từ trang Payment.',
                            () => {
                                closeModal();

                                navigate(
                                    '/payment',
                                    {
                                        state:
                                            bookingData,
                                    }
                                );
                            }
                        );
                    }

                    return;
                }

                // ------------------------------------------------
                // GỬI OTP
                // ------------------------------------------------

                await sendOtpApi();
            };

        const timer =
            setTimeout(
                initialize,
                100
            );

        isFirstLoad.current =
            false;

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        customerEmail,
        tempBookingId,
        syncTimerWithRedis,
        sendOtpApi,
        navigate,
        closeModal,
        openModal,
    ]);

    // ========================================================
    // OTP TIMER
    // ========================================================

    useEffect(() => {
        if (
            paymentCompletedRef.current
        ) {
            return;
        }

        if (
            timeLeft <= 0
        ) {
            if (
                !isLocked &&
                !otpExpiredRef.current
            ) {
                otpExpiredRef.current =
                    true;

                openModal(
                    'warning',
                    'OTP HẾT HẠN',
                    'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại OTP" để nhận mã mới.',
                    closeModal
                );
            }

            return;
        }

        const timer =
            setInterval(() => {
                setTimeLeft(
                    previous => {
                        if (
                            previous <= 1
                        ) {
                            otpExpiredRef.current =
                                true;

                            return 0;
                        }

                        return previous - 1;
                    }
                );
            }, 1000);

        return () =>
            clearInterval(timer);
    }, [
        timeLeft,
        isLocked,
        closeModal,
        openModal,
    ]);

    // ========================================================
    // REDIS TIMER SYNC
    // ========================================================

    useEffect(() => {
        if (
            !tempBookingId ||
            paymentCompletedRef.current
        ) {
            return;
        }

        redisSyncIntervalRef.current =
            setInterval(
                async () => {
                    const redisTime =
                        await fetchTimeFromRedis();

                    if (
                        redisTime === null
                    ) {
                        return;
                    }

                    if (
                        redisTime <= 0
                    ) {
                        setTimeLeft(0);

                        otpExpiredRef.current =
                            true;

                        return;
                    }

                    setTimeLeft(
                        previous => {
                            if (
                                Math.abs(
                                    previous -
                                    redisTime
                                ) > 2
                            ) {
                                return redisTime;
                            }

                            return previous;
                        }
                    );
                },
                30000
            );

        return () => {
            if (
                redisSyncIntervalRef.current
            ) {
                clearInterval(
                    redisSyncIntervalRef.current
                );

                redisSyncIntervalRef.current =
                    null;
            }
        };
    }, [
        tempBookingId,
        fetchTimeFromRedis,
    ]);

    // ========================================================
    // PAYMENT COMPLETED CHECK
    // ========================================================

    useEffect(() => {
        const completed =
            localStorage.getItem(
                'paymentCompleted'
            );

        const completedId =
            localStorage.getItem(
                'completedBookingId'
            );

        if (
            completed === 'true' &&
            completedId &&
            String(completedId) ===
                String(tempBookingId)
        ) {
            paymentCompletedRef.current =
                true;

            openModal(
                'success',
                'THANH TOÁN THÀNH CÔNG',
                'Bạn đã thanh toán thành công! Vui lòng quay lại trang xác nhận.',
                () => {
                    closeModal();

                    navigate(
                        '/confirm-success',
                        {
                            state:
                                bookingData,
                        }
                    );
                }
            );
        }
    }, [
        tempBookingId,
        navigate,
        closeModal,
        openModal,
    ]);

    // ========================================================
    // CHECK BOOKING DATA
    // ========================================================

    useEffect(() => {
        if (
            tempBookingId &&
            customerEmail
        ) {
            return;
        }

        const hasSavedData =
            localStorage.getItem(
                'lastSuccessTicket'
            ) ||
            localStorage.getItem(
                'booking_temp'
            );

        if (
            !hasSavedData &&
            !isFirstLoad.current
        ) {
            openModal(
                'error',
                'THIẾU THÔNG TIN',
                'Không tìm thấy thông tin đặt vé. Vui lòng đặt lại.',
                () => {
                    closeModal();
                    navigate('/');
                }
            );
        }
    }, [
        tempBookingId,
        customerEmail,
        navigate,
        closeModal,
        openModal,
    ]);

    // ========================================================
    // BEFORE UNLOAD
    // ========================================================

    useEffect(() => {
        const handleBeforeUnload =
            event => {
                if (
                    paymentCompletedRef.current
                ) {
                    return;
                }

                if (
                    timeLeft > 0 &&
                    otp.length > 0
                ) {
                    event.preventDefault();

                    event.returnValue =
                        'Bạn đang nhập OTP. Nếu rời trang, bạn có thể mất tiến trình thanh toán!';
                }
            };

        window.addEventListener(
            'beforeunload',
            handleBeforeUnload
        );

        return () =>
            window.removeEventListener(
                'beforeunload',
                handleBeforeUnload
            );
    }, [
        timeLeft,
        otp,
    ]);

    // ========================================================
    // CLEANUP
    // ========================================================

    useEffect(() => {
        return () => {
            if (
                timerIntervalRef.current
            ) {
                clearInterval(
                    timerIntervalRef.current
                );
            }

            if (
                redisSyncIntervalRef.current
            ) {
                clearInterval(
                    redisSyncIntervalRef.current
                );
            }

            if (
                autoNavigateRef.current
            ) {
                clearTimeout(
                    autoNavigateRef.current
                );
            }

            if (
                redirectTimeoutRef.current
            ) {
                clearTimeout(
                    redirectTimeoutRef.current
                );
            }
        };
    }, []);

    // ========================================================
    // VERIFY OTP
    // ========================================================

    const handleVerifyPayment =
        async () => {
            if (
                paymentCompletedRef.current
            ) {
                openModal(
                    'info',
                    'THÔNG BÁO',
                    'Bạn đã thanh toán thành công.'
                );

                return;
            }

            if (
                isLockedRef.current ||
                isLocked
            ) {
                openModal(
                    'error',
                    'TÀI KHOẢN BỊ KHÓA',
                    `Tài khoản đang bị khóa. Vui lòng thử lại sau ${formatTime(
                        lockTimeLeft
                    )}.`
                );

                return;
            }

            if (
                otpExpiredRef.current ||
                timeLeft <= 0
            ) {
                openModal(
                    'warning',
                    'OTP HẾT HẠN',
                    'Mã OTP đã hết hạn. Vui lòng gửi lại OTP.'
                );

                return;
            }

            if (
                otp.length !== 6
            ) {
                openModal(
                    'error',
                    'THÔNG BÁO',
                    'Vui lòng nhập đủ 6 số OTP.'
                );

                return;
            }

            if (
                !customerEmail ||
                !tempBookingId
            ) {
                openModal(
                    'error',
                    'THIẾU THÔNG TIN',
                    'Không tìm thấy thông tin thanh toán.'
                );

                return;
            }

            setLoadingVerify(
                true
            );

            try {
                const payload = {
                    email:
                        customerEmail,

                    otp,

                    tempBookingId,

                    full_name:
                        customerName,

                    phone:
                        customerPhone,

                    ownerToken:
                        ownerToken || undefined,
                };

                const response =
                    await api.post(
                        '/api/bank/verify-otp',
                        payload,
                        {
                            headers: {
                                'Content-Type':
                                    'application/json',
                            },
                        }
                    );

                if (
                    response.data?.success
                ) {
                    otpAttemptsRef.current =
                        0;

                    localStorage.setItem(
                        'bankOtpAttempts',
                        '0'
                    );

                    resetLockState();

                    const realBookingId =
                        response.data
                            ?.data
                            ?.bookingId ||
                        tempBookingId;

                    localStorage.setItem(
                        'paymentCompleted',
                        'true'
                    );

                    localStorage.setItem(
                        'completedBookingId',
                        String(
                            realBookingId
                        )
                    );

                    paymentCompletedRef.current =
                        true;

                    // ------------------------------------------------
                    // QUAN TRỌNG:
                    // Giữ bookingData trong biến để trang
                    // confirm-success vẫn nhận được dữ liệu.
                    // ------------------------------------------------

                    clearAllBookingData();

                    openModal(
                        'success',
                        'THANH TOÁN THÀNH CÔNG',
                        'Cảm ơn bạn đã đặt vé! Vui lòng kiểm tra email để nhận vé.',
                        () => {
                            closeModal();

                            navigate(
                                '/confirm-success',
                                {
                                    state:
                                        bookingData,
                                }
                            );
                        }
                    );

                    autoNavigateRef.current =
                        setTimeout(
                            () => {
                                if (
                                    isModalOpenRef.current
                                ) {
                                    closeModal();

                                    navigate(
                                        '/confirm-success',
                                        {
                                            state:
                                                bookingData,
                                        }
                                    );
                                }
                            },
                            3000
                        );

                    return;
                }

                // ====================================================
                // BACKEND TRẢ SUCCESS = FALSE
                // ====================================================

                const errorData =
                    response.data?.data ||
                    {};

                const remainingAttempts =
                    errorData
                        ?.remainingAttempts;

                const message =
                    response.data
                        ?.message ||
                    'Mã OTP không đúng hoặc đã hết hạn.';

                // ------------------------------------------------
                // ACCOUNT LOCKED
                // ------------------------------------------------

                if (
                    response.data
                        ?.code ===
                        'OTP_LOCKED' ||
                    response.data
                        ?.code ===
                        'ACCOUNT_LOCKED' ||
                    message
                        .toLowerCase()
                        .includes(
                            'khóa'
                        ) ||
                    remainingAttempts ===
                        0
                ) {
                    const lockDuration =
                        Number(
                            errorData
                                ?.remainingSeconds ||
                            errorData
                                ?.lockDuration ||
                            300
                        );

                    lockAccount(
                        lockDuration
                    );

                    return;
                }

                // ------------------------------------------------
                // REMAINING ATTEMPTS
                // ------------------------------------------------

                if (
                    typeof remainingAttempts ===
                        'number' &&
                    remainingAttempts >
                        0
                ) {
                    otpAttemptsRef.current =
                        Math.max(
                            0,
                            OTP_MAX_ATTEMPTS -
                                remainingAttempts
                        );

                    localStorage.setItem(
                        'bankOtpAttempts',
                        String(
                            otpAttemptsRef.current
                        )
                    );

                    openModal(
                        'error',
                        'THẤT BẠI',
                        `${message} Còn ${remainingAttempts} lần thử.`
                    );

                    return;
                }

                openModal(
                    'error',
                    'THẤT BẠI',
                    message
                );
            } catch (error) {
                console.error(
                    '❌ [BANK APP] Verify OTP Error:',
                    error
                );

                const errorData =
                    error.response
                        ?.data || {};

                const errorMessage =
                    errorData.message ||
                    'Mã OTP không đúng hoặc đã hết hạn.';

                // ====================================================
                // LOCK
                // ====================================================

                if (
                    error.response
                        ?.status ===
                        429 ||
                    errorData.code ===
                        'OTP_LOCKED' ||
                    errorData.code ===
                        'ACCOUNT_LOCKED' ||
                    errorMessage
                        .toLowerCase()
                        .includes(
                            'khóa'
                        )
                ) {
                    const lockDuration =
                        Number(
                            errorData
                                ?.data
                                ?.remainingSeconds ||
                            errorData
                                ?.data
                                ?.lockDuration ||
                            300
                        );

                    lockAccount(
                        lockDuration
                    );

                    return;
                }

                // ====================================================
                // REMAINING ATTEMPTS
                // ====================================================

                const remainingAttempts =
                    errorData
                        ?.data
                        ?.remainingAttempts;

                if (
                    typeof remainingAttempts ===
                        'number' &&
                    remainingAttempts >
                        0
                ) {
                    otpAttemptsRef.current =
                        Math.max(
                            0,
                            OTP_MAX_ATTEMPTS -
                                remainingAttempts
                        );

                    localStorage.setItem(
                        'bankOtpAttempts',
                        String(
                            otpAttemptsRef.current
                        )
                    );

                    openModal(
                        'error',
                        'THẤT BẠI',
                        `${errorMessage} Còn ${remainingAttempts} lần thử.`
                    );

                    return;
                }

                openModal(
                    'error',
                    'THẤT BẠI',
                    errorMessage
                );
            } finally {
                setLoadingVerify(
                    false
                );
            }
        };

    // ========================================================
    // OTP INPUT CHANGE
    // ========================================================

    const handleOtpChange =
        (event, index) => {
            if (
                isLocked ||
                otpExpiredRef.current
            ) {
                return;
            }

            const value =
                event.target.value
                    .replace(
                        /\D/g,
                        ''
                    )
                    .slice(0, 1);

            const current =
                otp
                    .padEnd(
                        6,
                        ''
                    )
                    .split('');

            current[index] =
                value;

            const newOtp =
                current
                    .join('')
                    .slice(0, 6);

            setOtp(
                newOtp
            );

            if (
                value &&
                index < 5
            ) {
                const next =
                    otpInputsRef
                        .current[
                        index + 1
                    ];

                if (next) {
                    next.focus();
                }
            }
        };

    // ========================================================
    // OTP KEY DOWN
    // ========================================================

    const handleOtpKeyDown =
        (event, index) => {
            if (
                event.key ===
                'Backspace'
            ) {
                if (
                    otp[index]
                ) {
                    const current =
                        otp
                            .padEnd(
                                6,
                                ''
                            )
                            .split('');

                    current[index] =
                        '';

                    setOtp(
                        current.join('')
                    );

                    return;
                }

                if (
                    index > 0
                ) {
                    const previous =
                        otpInputsRef
                            .current[
                            index - 1
                        ];

                    if (
                        previous
                    ) {
                        previous.focus();
                    }

                    const current =
                        otp
                            .padEnd(
                                6,
                                ''
                            )
                            .split('');

                    current[
                        index - 1
                    ] = '';

                    setOtp(
                        current.join('')
                    );
                }
            }
        };

    // ========================================================
    // OTP PASTE
    // ========================================================

    const handleOtpPaste =
        event => {
            event.preventDefault();

            if (
                isLocked ||
                otpExpiredRef.current
            ) {
                return;
            }

            const pasted =
                event.clipboardData
                    .getData(
                        'text'
                    )
                    .replace(
                        /\D/g,
                        ''
                    )
                    .slice(0, 6);

            if (!pasted) {
                return;
            }

            setOtp(
                pasted
                    .padEnd(
                        6,
                        ''
                    )
            );

            const focusIndex =
                Math.min(
                    pasted.length,
                    5
                );

            const input =
                otpInputsRef
                    .current[
                    focusIndex
                ];

            if (input) {
                input.focus();
            }
        };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="bank-checkout-page">

            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="bank-checkout-container">

                {/* ==================================================
                    SIDEBAR
                ================================================== */}

                <div className="bank-sidebar-wrapper">

                    <BookingSidebar
                        movie={movie}

                        showtimeDetail={
                            showtimeDetail
                        }

                        selectedCinema={
                            selectedCinema
                        }

                        selectedDate={
                            selectedDate
                        }

                        selectedShowtime={
                            selectedShowtime
                        }

                        selectedSeats={
                            selectedSeats
                        }

                        foods={
                            foods
                        }

                        selectedFoods={
                            selectedFoods
                        }

                        totalTicketPrice={
                            totalTicketPrice
                        }

                        totalFoodPrice={
                            totalFoodPrice
                        }

                        grandTotal={
                            totalAmount
                        }

                        isTimerActive={
                            true
                        }

                        remainingTime={
                            timeLeft
                        }

                        showFoodSection={
                            true
                        }
                    />

                </div>

                {/* ==================================================
                    OTP AREA
                ================================================== */}

                <div className="bank-otp-section">

                    <div className="otp-card">

                        {/* ==========================================
                            QR
                        ========================================== */}

                        <div className="bank-qr-mini-wrapper">

                            <img
                                src="https://api.quangdungcinema.id.vn/uploads/Bank/Qr_nganhang.jpg"
                                alt="QR thanh toán ngân hàng"
                                className="bank-qr-mini"
                            />

                            <div className="qr-scan-line"></div>

                        </div>

                        {/* ==========================================
                            TITLE
                        ========================================== */}

                        <h3 className="otp-title">
                            NHẬP MÃ OTP
                        </h3>

                        <p className="otp-sub">
                            Gửi đến:{' '}
                            <strong>
                                {customerEmail ||
                                    'Chưa có email'}
                            </strong>
                        </p>

                        {/* ==========================================
                            OTP INPUT
                        ========================================== */}

                        <div className="otp-circle-container">

                            {[...Array(6)].map(
                                (_, index) => (
                                    <input
                                        key={
                                            index
                                        }
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        className="otp-circle"
                                        maxLength={1}
                                        value={
                                            otp[
                                                index
                                            ] ||
                                            ''
                                        }
                                        onChange={event =>
                                            handleOtpChange(
                                                event,
                                                index
                                            )
                                        }
                                        onKeyDown={event =>
                                            handleOtpKeyDown(
                                                event,
                                                index
                                            )
                                        }
                                        onPaste={
                                            handleOtpPaste
                                        }
                                        disabled={
                                            paymentCompletedRef.current ||
                                            isLocked ||
                                            otpExpiredRef.current ||
                                            loadingVerify
                                        }
                                        autoFocus={
                                            index ===
                                                0 &&
                                            !isLocked &&
                                            !otpExpiredRef.current
                                        }
                                        ref={element => {
                                            otpInputsRef.current[
                                                index
                                            ] =
                                                element;
                                        }}
                                    />
                                )
                            )}

                        </div>

                        {/* ==========================================
                            TIMER
                        ========================================== */}

                        <div className="bank-timer-box">

                            {isLocked ? (
                                <span
                                    style={{
                                        color:
                                            '#ff6b6b',
                                    }}
                                >
                                    🔒 Tài khoản bị khóa:{' '}
                                    {formatTime(
                                        lockTimeLeft
                                    )}
                                </span>
                            ) : otpExpiredRef.current ||
                              timeLeft <= 0 ? (
                                <span
                                    style={{
                                        color:
                                            '#ff6b6b',
                                    }}
                                >
                                    ⏰ OTP đã hết hạn
                                </span>
                            ) : (
                                <>
                                    OTP hết hạn sau:{' '}
                                    <span>
                                        {formatTime(
                                            timeLeft
                                        )}
                                    </span>
                                </>
                            )}

                        </div>

                        {/* ==========================================
                            RESEND
                        ========================================== */}

                        <div className="bank-resend-wrapper">

                            <button
                                type="button"
                                className="btn-resend-otp"
                                onClick={
                                    handleResendOtp
                                }
                                disabled={
                                    loadingSendOtp ||
                                    loadingVerify ||
                                    paymentCompletedRef.current ||
                                    resendCooldown >
                                        0 ||
                                    isLocked
                                }
                            >
                                {loadingSendOtp
                                    ? 'Đang gửi...'
                                    : isLocked
                                    ? `🔒 Đã khóa (${formatTime(
                                          lockTimeLeft
                                      )})`
                                    : resendCooldown >
                                      0
                                    ? `⏳ Gửi lại sau ${formatTime(
                                          resendCooldown
                                      )}`
                                    : '🔄 GỬI LẠI OTP'}
                            </button>

                        </div>

                        {/* ==========================================
                            CONFIRM
                        ========================================== */}

                        <LoadingButton
                            type="button"
                            loading={
                                loadingVerify
                            }
                            loadingText="Đang xác nhận..."
                            onClick={
                                handleVerifyPayment
                            }
                            disabled={
                                loadingVerify ||
                                loadingSendOtp ||
                                paymentCompletedRef.current ||
                                isLocked ||
                                otpExpiredRef.current ||
                                timeLeft <= 0 ||
                                otp.length !==
                                    6
                            }
                            className="btn-confirm-payment"
                            spinnerColor="#ffffff"
                        >
                            XÁC NHẬN THANH TOÁN
                        </LoadingButton>

                    </div>

                </div>

            </main>

            {/* ==================================================
                MAIN MODAL
            ================================================== */}

            <Modal
                show={
                    modalConfig.show
                }
                type={
                    modalConfig.type
                }
                title={
                    modalConfig.title
                }
                message={
                    modalConfig.message
                }
                onClose={
                    closeModal
                }
                onConfirm={
                    modalConfig.onConfirm
                }
                onCancel={
                    modalConfig.onCancel
                }
            />

            {/* ==================================================
                BACK CONFIRM MODAL
            ================================================== */}

            <Modal
                show={
                    showBackConfirm
                }
                type="warning"
                title="CẢNH BÁO"
                message="Bạn đang trong quá trình nhập OTP. Nếu thoát, toàn bộ thông tin đặt vé sẽ bị xóa. Bạn có chắc chắn muốn rời khỏi?"
                onConfirm={
                    clearAllAndGoHome
                }
                onCancel={
                    handleStay
                }
                confirmText="Xác nhận rời"
                cancelText="Ở lại"
            />

        </div>
    );
};

export default BankApp;