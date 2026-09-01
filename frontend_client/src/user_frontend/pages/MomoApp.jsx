// MomoApp.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import api from '../../api/api';

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

import '../styles/MomoApp.css';

const MomoApp = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Lấy dữ liệu từ location.state hoặc từ localStorage
    const getBookingData = () => {
        const stateData = location.state || {};
        
        if (!stateData.tempBookingId) {
            try {
                const savedTicket = localStorage.getItem('lastSuccessTicket');
                if (savedTicket) {
                    return JSON.parse(savedTicket);
                }
            } catch (err) {
                console.error('Lỗi đọc lastSuccessTicket từ localStorage:', err);
            }
        }
        
        return stateData;
    };

    const bookingData = getBookingData();

    const tempBookingId = String(
        localStorage.getItem('momoTempBookingId') ||
        bookingData.tempBookingId ||
        ''
    );

    const customerEmail = bookingData.customerEmail || localStorage.getItem('momoCustomerEmail') || '';
    const customerName = bookingData.customerName || '';
    const customerPhone = bookingData.customerPhone || '';
    const totalAmount = bookingData.totalAmount || 0;
    const movie = bookingData.movie || {};
    const selectedCinema = bookingData.selectedCinema || {};
    const selectedDate = bookingData.selectedDate || '';
    const selectedShowtime = bookingData.selectedShowtime || {};
    const selectedSeats = bookingData.selectedSeats || [];
    const selectedFoods = bookingData.selectedFoods || [];
    const foods = bookingData.foods || [];
    const totalTicketPrice = bookingData.totalTicketPrice || 0;
    const totalFoodPrice = bookingData.totalFoodPrice || 0;
    const showtimeDetail = bookingData.showtimeDetail || {};

    // MoMo QR URL
    const myMomoPhone = '0909489611';
    const myName = 'NGUYEN PHAM QUANG DUNG';
    const qrImageUrl = 
        `https://img.vietqr.io/image/momo-${myMomoPhone}-compact.jpg?amount=${totalAmount || 85000}&addInfo=DungCinema%20${tempBookingId}&accountName=${encodeURIComponent(myName)}`;

    // =========================
    // REFS
    // =========================
    const hasSentOtp = useRef(localStorage.getItem('momoHasSentOtp') === 'true');
    const hasVisitedMomoApp = useRef(localStorage.getItem('momoHasVisited') === 'true');
    const redirectTimeoutRef = useRef(null);
    const autoNavigateRef = useRef(null);
    const isModalOpenRef = useRef(false);
    const isFirstLoad = useRef(true);
    const paymentCompletedRef = useRef(false);
    const isPaymentInitiated = useRef(localStorage.getItem('momoPaymentInitiated') === 'true');
    const isCancellingRef = useRef(false);
    const otpInputsRef = useRef([]);
    const hasShownModalRef = useRef(false);
    const timerCheckRef = useRef(null);
    const isTimerSyncedRef = useRef(false);
    const otpExpiredRef = useRef(false);
    const otpAttemptsRef = useRef(parseInt(localStorage.getItem('momoOtpAttempts') || '0'));
    const isLockedRef = useRef(localStorage.getItem('momoIsLocked') === 'true');

    // =========================
    // STATES
    // =========================
    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = localStorage.getItem('momoOtpTimeLeft');
        return saved ? parseInt(saved, 10) : 300;
    });

    const [otp, setOtp] = useState(() => localStorage.getItem('momoOtpInput') || '');
    const [loadingVerify, setLoadingVerify] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true);
    const [resendCooldown, setResendCooldown] = useState(() => {
        const saved = localStorage.getItem('momoResendCooldown');
        if (saved) {
            const remaining = parseInt(saved, 10);
            if (remaining > 0) return remaining;
        }
        return 0;
    });

    // Lock state - Đọc thời gian kết thúc khóa từ localStorage để không bị reset khi F5
    const [isLocked, setIsLocked] = useState(() => {
        const saved = localStorage.getItem('momoIsLocked') === 'true';
        const lockEndTime = parseInt(localStorage.getItem('momoLockTime') || '0');
        
        if (saved && lockEndTime > 0) {
            const remaining = Math.floor((lockEndTime - Date.now()) / 1000);
            if (remaining > 0) {
                return true;
            } else {
                localStorage.removeItem('momoIsLocked');
                localStorage.removeItem('momoLockTime');
                localStorage.removeItem('momoOtpAttempts');
                return false;
            }
        }
        return false;
    });

    const [lockTimeLeft, setLockTimeLeft] = useState(() => {
        const lockEndTime = parseInt(localStorage.getItem('momoLockTime') || '0');
        if (lockEndTime > 0) {
            const remaining = Math.floor((lockEndTime - Date.now()) / 1000);
            if (remaining > 0) return remaining;
        }
        return 0;
    });

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    // =========================
    // FUNCTIONS
    // =========================
    
    const fetchTimeFromRedis = async () => {
        if (!tempBookingId) return null;
        try {
            const response = await api.get(`/api/momo/check-ttl/${tempBookingId}`);
            if (response.data.success) {
                const { expiresIn, isExpired } = response.data.data;
                if (!isExpired && expiresIn > 0) return expiresIn;
                return 0;
            }
            return null;
        } catch (error) {
            console.error('❌ Lỗi lấy TTL từ Redis:', error);
            return null;
        }
    };

    const syncTimerWithRedis = async () => {
        const hasOtp = localStorage.getItem('momoOtpInput');
        if (hasOtp) return;

        if (isTimerSyncedRef.current) return;
        
        setIsSyncing(true);
        try {
            const redisTime = await fetchTimeFromRedis();
            if (redisTime !== null) {
                if (redisTime > 0) {
                    setTimeLeft(redisTime);
                    localStorage.setItem('momoOtpTimeLeft', String(redisTime));
                    isTimerSyncedRef.current = true;
                    otpExpiredRef.current = false;
                } else {
                    setTimeLeft(0);
                    localStorage.setItem('momoOtpTimeLeft', '0');
                    otpExpiredRef.current = true;
                }
            } else {
                const saved = localStorage.getItem('momoOtpTimeLeft');
                if (saved) {
                    const time = parseInt(saved, 10);
                    if (time > 0) setTimeLeft(time);
                    else otpExpiredRef.current = true;
                }
            }
        } catch (error) {
            console.error('❌ Lỗi đồng bộ timer:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const resetLockState = () => {
        setIsLocked(false);
        setLockTimeLeft(0);
        otpAttemptsRef.current = 0;
        localStorage.removeItem('momoIsLocked');
        localStorage.removeItem('momoLockTime');
        localStorage.removeItem('momoOtpAttempts');
        isLockedRef.current = false;
    };

    const lockAccount = (remainingSeconds = 300) => {
        const lockEndTime = Date.now() + (remainingSeconds * 1000);
        setIsLocked(true);
        setLockTimeLeft(remainingSeconds);
        isLockedRef.current = true;
        localStorage.setItem('momoIsLocked', 'true');
        localStorage.setItem('momoLockTime', String(lockEndTime));
        localStorage.setItem('momoOtpAttempts', String(otpAttemptsRef.current));
        
        const timeStr = formatTime(remainingSeconds);
        openModal('error', 'OTP BỊ KHÓA', `Bạn đã nhập sai OTP quá 5 lần. Tài khoản đã bị khóa ${timeStr}. Vui lòng thử lại sau.`, () => closeModal());
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // =========================
    // HÀM XÓA TOÀN BỘ DỮ LIỆU BOOKING
    // =========================
    const clearAllBookingData = () => {
        const keysToRemove = [
            'momoHasSentOtp', 'momoHasVisited', 'momoOtpTimeLeft', 'momoOtpInput',
            'momoLastOtpSentAt', 'momoPaymentInitiated', 'momoPaymentCompleted', 'momoCompletedBookingId',
            'momoHoldExpiresAt', 'momoSelectedSeats', 'momoCurrentShowtimeId', 'momoLastSuccessTicket',
            'momoTempBookingId', 'momoSelectedFoods', 'momoBookingTemp', 'momoIsLocked',
            'momoLockTime', 'momoOtpAttempts', 'momoResendCooldown'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Đặt lại state về mặc định
        setTimeLeft(300);
        setResendCooldown(0);
        setOtp('');

        hasShownModalRef.current = false;
        isTimerSyncedRef.current = false;
        otpExpiredRef.current = false;
        resetLockState();
    };

    // =========================
    // BLOCKER
    // =========================
    const shouldBlock = useCallback(() => {
        if (paymentCompletedRef.current) return false;
        if (!otp && timeLeft <= 0) return false;
        return location.pathname === '/momo-app';
    }, [otp, timeLeft, location.pathname]);

    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        return shouldBlock();
    });

    useEffect(() => {
        if (blocker.state === 'blocked') {
            if (!modalConfig.show && !showBackConfirm) {
                setShowBackConfirm(true);
            }
        }
    }, [blocker.state]);

    // =========================
    // MODAL HANDLERS
    // =========================
    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, show: false }));
        hasShownModalRef.current = false;
    };

    const openModal = (type, title, message, onConfirmCustom = null, onCancelCustom = null) => {
        if (modalConfig.show) return;
        if (hasShownModalRef.current) return;
        hasShownModalRef.current = true;
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirmCustom || closeModal,
            onCancel: onCancelCustom || closeModal
        });
    };

    // =========================
    // SAVE STATE TO LOCALSTORAGE
    // =========================
    useEffect(() => { localStorage.setItem('momoOtpTimeLeft', String(timeLeft)); }, [timeLeft]);
    useEffect(() => { localStorage.setItem('momoOtpInput', otp); }, [otp]);
    useEffect(() => { localStorage.setItem('momoResendCooldown', String(resendCooldown)); }, [resendCooldown]);

    // =========================
    // CALL API CANCEL BOOKING
    // =========================
    const cancelBookingOnServer = async () => {
        if (isCancellingRef.current) return;
        isCancellingRef.current = true;
        try {
            await api.post('/api/momo/cancel', {
                tempBookingId: tempBookingId
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('✅ Temp booking cancelled on server');
        } catch (err) {
            console.error('❌ Lỗi hủy temp booking:', err);
        } finally {
            isCancellingRef.current = false;
        }
    };

    // =========================
    // CHECK PAYMENT COMPLETED
    // =========================
    useEffect(() => {
        const completed = localStorage.getItem('momoPaymentCompleted');
        const completedId = localStorage.getItem('momoCompletedBookingId');

        if (completed === 'true' && completedId === tempBookingId) {
            paymentCompletedRef.current = true;
            hasSentOtp.current = true;
            clearAllBookingData();

            if (!modalConfig.show && !hasShownModalRef.current) {
                openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công! Vui lòng quay lại trang chủ.', () => {
                    closeModal();
                    navigate('/');
                });
            }
        }
    }, [tempBookingId]);

    // =========================
    // BEFORE UNLOAD
    // =========================
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (timeLeft > 0 && otp.length > 0 && !paymentCompletedRef.current) {
                e.preventDefault();
                e.returnValue = 'Bạn đang nhập OTP. Nếu rời trang, bạn sẽ mất tiến trình thanh toán!';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [timeLeft, otp]);

    // =========================
    // CHECK DATA
    // =========================
    useEffect(() => {
        if (!tempBookingId || !customerEmail) {
            const hasSavedData = localStorage.getItem('momoLastSuccessTicket') || localStorage.getItem('momoBookingTemp');
            if (!hasSavedData && !isFirstLoad.current) {
                openModal('error', 'THIẾU THÔNG TIN', 'Không tìm thấy thông tin đặt vé. Vui lòng đặt lại.', () => {
                    closeModal();
                    navigate('/');
                });
            }
        }
        isFirstLoad.current = false;
    }, [tempBookingId, customerEmail, navigate]);

    // =========================
    // TRACK MODAL STATE
    // =========================
    useEffect(() => { isModalOpenRef.current = modalConfig.show; }, [modalConfig.show]);

    // =========================
    // CLEANUP
    // =========================
    useEffect(() => {
        return () => {
            if (autoNavigateRef.current) clearTimeout(autoNavigateRef.current);
            if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
            if (timerCheckRef.current) clearInterval(timerCheckRef.current);
        };
    }, []);

    // =========================
    // CLEAR ALL & GO HOME
    // =========================
    const clearAllAndGoHome = async () => {
        await cancelBookingOnServer();
        clearAllBookingData();

        if (blocker.state === 'blocked') blocker.proceed();
        navigate('/');
    };

    // =========================
    // XỬ LÝ KHI BẤM "Ở LẠI"
    // =========================
    const handleStay = () => {
        setShowBackConfirm(false);
        if (blocker.state === 'blocked') blocker.reset();
    };

    // =========================
    // SEND OTP API (Lần đầu)
    // =========================
    const sendOtpApi = async () => {
        setLoadingSendOtp(true);
        try {
            const payload = { email: customerEmail, tempBookingId: tempBookingId };
            const response = await api.post('/api/momo/send-otp', payload, { headers: { 'Content-Type': 'application/json' } });

            const now = Date.now();
            localStorage.setItem('momoLastOtpSentAt', String(now));
            hasSentOtp.current = true;
            hasVisitedMomoApp.current = true;
            localStorage.setItem('momoHasSentOtp', 'true');
            localStorage.setItem('momoHasVisited', 'true');
            localStorage.setItem('momoPaymentInitiated', 'true');
            
            otpAttemptsRef.current = 0;
            localStorage.setItem('momoOtpAttempts', '0');
            resetLockState();
            
            const redisTime = await fetchTimeFromRedis();
            if (redisTime !== null && redisTime > 0) {
                setTimeLeft(redisTime);
                localStorage.setItem('momoOtpTimeLeft', String(redisTime));
                isTimerSyncedRef.current = true;
                otpExpiredRef.current = false;
            } else {
                setTimeLeft(300);
                localStorage.setItem('momoOtpTimeLeft', '300');
                otpExpiredRef.current = false;
            }

            setResendCooldown(300);
            localStorage.setItem('momoResendCooldown', '300');
            return true;
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
            if (!isFirstLoad.current) openModal('error', 'LỖI GỬI OTP', errorMsg);
            return false;
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // RESEND OTP API
    // =========================
    const handleResendOtp = async () => {
        if (isLocked) {
            openModal('error', 'TÀI KHOẢN BỊ KHÓA', `Tài khoản đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng thử lại sau ${formatTime(lockTimeLeft)}.`);
            return;
        }
        if (resendCooldown > 0) {
            openModal('info', 'THÔNG BÁO', `Vui lòng đợi ${formatTime(resendCooldown)} trước khi gửi lại.`);
            return;
        }
        if (paymentCompletedRef.current) {
            openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công!');
            return;
        }

        setLoadingSendOtp(true);
        try {
            const payload = { email: customerEmail, tempBookingId: tempBookingId };
            const response = await api.post('/api/momo/resend-otp', payload, { headers: { 'Content-Type': 'application/json' } });

            if (response.data.success) {
                const now = Date.now();
                localStorage.setItem('momoLastOtpSentAt', String(now));
                hasSentOtp.current = true;
                hasVisitedMomoApp.current = true;
                localStorage.setItem('momoHasSentOtp', 'true');
                localStorage.setItem('momoHasVisited', 'true');
                localStorage.setItem('momoPaymentInitiated', 'true');

                otpAttemptsRef.current = 0;
                localStorage.setItem('momoOtpAttempts', '0');
                resetLockState();

                if (response.data.data?.expiresIn) {
                    setTimeLeft(response.data.data.expiresIn);
                    localStorage.setItem('momoOtpTimeLeft', String(response.data.data.expiresIn));
                    isTimerSyncedRef.current = true;
                    otpExpiredRef.current = false;
                } else {
                    const redisTime = await fetchTimeFromRedis();
                    if (redisTime !== null && redisTime > 0) {
                        setTimeLeft(redisTime);
                        localStorage.setItem('momoOtpTimeLeft', String(redisTime));
                        isTimerSyncedRef.current = true;
                        otpExpiredRef.current = false;
                    } else {
                        setTimeLeft(300);
                        localStorage.setItem('momoOtpTimeLeft', '300');
                        otpExpiredRef.current = false;
                    }
                }

                setResendCooldown(300);
                localStorage.setItem('momoResendCooldown', '300');
                setOtp('');
                localStorage.setItem('momoOtpInput', '');
                openModal('success', 'THÀNH CÔNG', 'Mã OTP mới đã được gửi tới email của bạn.');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.';
            if (err.response?.status === 429) {
                const remainingSeconds = err.response?.data?.data?.remainingSeconds || 300;
                openModal('error', 'QUÁ NHIỀU YÊU CẦU', `Bạn đã gửi quá nhiều lần (tối đa 3 lần/5 phút). Vui lòng thử lại sau ${formatTime(remainingSeconds)}.`);
            } else {
                openModal('error', 'LỖI GỬI OTP', errorMsg);
            }
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // COOLDOWN TIMER
    // =========================
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    localStorage.removeItem('momoResendCooldown');
                    return 0;
                }
                const newVal = prev - 1;
                localStorage.setItem('momoResendCooldown', String(newVal));
                return newVal;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // =========================
    // LOCK TIMER
    // =========================
    useEffect(() => {
        if (!isLocked || lockTimeLeft <= 0) {
            if (isLocked && lockTimeLeft === 0) {
                resetLockState();
                setResendCooldown(0);
                localStorage.removeItem('momoResendCooldown');
                if (!modalConfig.show && !hasShownModalRef.current) openModal('info', 'MỞ KHÓA TÀI KHOẢN', 'Tài khoản đã được mở khóa. Bạn có thể gửi lại OTP.', () => closeModal());
            }
            return;
        }

        const timer = setInterval(() => {
            setLockTimeLeft(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    resetLockState();
                    setResendCooldown(0);
                    localStorage.removeItem('momoResendCooldown');
                    if (!modalConfig.show && !hasShownModalRef.current) openModal('info', 'MỞ KHÓA TÀI KHOẢN', 'Tài khoản đã được mở khóa. Bạn có thể gửi lại OTP.', () => closeModal());
                    return 0;
                }
                return newTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isLocked, lockTimeLeft]);

    // =========================
    // TRIGGER SEND OTP
    // =========================
    useEffect(() => {
        const initializeMomoApp = async () => {
            if (paymentCompletedRef.current) return;
            if (!customerEmail || !tempBookingId) return;

            const hasOtpInStorage = localStorage.getItem('momoOtpInput');
            const hasSentOtpFlag = localStorage.getItem('momoHasSentOtp') === 'true';
            const hasOtp = hasOtpInStorage || hasSentOtpFlag;

            if (hasOtp) {
                if (!isTimerSyncedRef.current) await syncTimerWithRedis();
                return;
            }

            await syncTimerWithRedis();

            if (!isPaymentInitiated.current) {
                if (!isFirstLoad.current && !modalConfig.show && !hasShownModalRef.current) {
                    openModal('error', 'TRUY CẬP KHÔNG HỢP LỆ', 'Vui lòng thanh toán từ trang chủ để nhận OTP.', () => {
                        closeModal();
                        navigate('/payment', { state: bookingData });
                    });
                }
                return;
            }

            if (hasSentOtp.current || hasVisitedMomoApp.current) {
                const lastSentAt = localStorage.getItem('momoLastOtpSentAt');
                if (lastSentAt) {
                    const elapsed = (Date.now() - parseInt(lastSentAt)) / 1000;
                    if (elapsed < 300) return;
                }
                if (!isFirstLoad.current && !modalConfig.show && !hasShownModalRef.current) openModal('info', 'THÔNG BÁO', 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã.');
                return;
            }

            await sendOtpApi();
        };

        const timer = setTimeout(() => initializeMomoApp(), 100);
        return () => clearTimeout(timer);
    }, [customerEmail, tempBookingId]);

    // =========================
    // TIMER
    // =========================
    useEffect(() => {
        if (paymentCompletedRef.current) return;

        if (isTimerSyncedRef.current && timeLeft > 0) {
            timerCheckRef.current = setInterval(async () => {
                const redisTime = await fetchTimeFromRedis();
                if (redisTime !== null && redisTime > 0) {
                    if (Math.abs(redisTime - timeLeft) > 5) {
                        setTimeLeft(redisTime);
                        localStorage.setItem('momoOtpTimeLeft', String(redisTime));
                    }
                } else if (redisTime === 0) {
                    setTimeLeft(0);
                    localStorage.setItem('momoOtpTimeLeft', '0');
                    otpExpiredRef.current = true;
                    if (!modalConfig.show && !hasShownModalRef.current && !isLocked) openModal('warning', 'OTP HẾT HẠN', 'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại OTP" để nhận mã mới.', () => closeModal());
                }
            }, 30000);
        }

        if (timeLeft <= 0) {
            if (otpExpiredRef.current === false && !paymentCompletedRef.current && !isLocked) {
                otpExpiredRef.current = true;
                if (!modalConfig.show && !hasShownModalRef.current) openModal('warning', 'OTP HẾT HẠN', 'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại OTP" để nhận mã mới.', () => closeModal());
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    otpExpiredRef.current = true;
                    if (!modalConfig.show && !hasShownModalRef.current && !paymentCompletedRef.current && !isLocked) openModal('warning', 'OTP HẾT HẠN', 'Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại OTP" để nhận mã mới.', () => closeModal());
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            if (timerCheckRef.current) clearInterval(timerCheckRef.current);
        };
    }, [timeLeft, tempBookingId, customerEmail, navigate]);

    // =========================
    // VERIFY OTP
    // =========================
    const handleVerifyPayment = async () => {
        if (paymentCompletedRef.current) {
            openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công!');
            return;
        }
        if (isLocked) {
            openModal('error', 'TÀI KHOẢN BỊ KHÓA', `Tài khoản đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng thử lại sau ${formatTime(lockTimeLeft)}.`);
            return;
        }
        if (otp.length < 6) {
            openModal('error', 'THÔNG BÁO', 'Vui lòng nhập đủ 6 số OTP');
            return;
        }

        setLoadingVerify(true);
        try {
            const payload = { email: customerEmail, otp, tempBookingId: tempBookingId, full_name: customerName, phone: customerPhone };
            const res = await api.post('/api/momo/verify-otp', payload, { headers: { 'Content-Type': 'application/json' } });

            if (res.data.success) {
                otpAttemptsRef.current = 0;
                localStorage.setItem('momoOtpAttempts', '0');
                resetLockState();

                const realBookingId = res.data.data?.bookingId || tempBookingId;
                localStorage.setItem('momoPaymentCompleted', 'true');
                localStorage.setItem('momoCompletedBookingId', String(realBookingId));
                paymentCompletedRef.current = true;

                // XÓA TOÀN BỘ DỮ LIỆU (Bao gồm momoOtpTimeLeft & momoResendCooldown)
                clearAllBookingData();

                openModal('success', 'THANH TOÁN THÀNH CÔNG', 'Cảm ơn bạn đã đặt vé! Vui lòng kiểm tra email để nhận vé.', () => {
                    if (autoNavigateRef.current) clearTimeout(autoNavigateRef.current);
                    closeModal();
                    navigate('/confirm-success', { state: bookingData });
                });

                autoNavigateRef.current = setTimeout(() => {
                    if (isModalOpenRef.current) {
                        closeModal();
                        navigate('/confirm-success', { state: bookingData });
                    }
                    autoNavigateRef.current = null;
                }, 3000);
            } else {
                const errorData = res.data.data || {};
                const remainingAttempts = errorData.remainingAttempts !== undefined ? errorData.remainingAttempts : 0;
                
                if (res.data.message?.includes('khóa') || remainingAttempts === 0) {
                    const lockDuration = errorData.lockDuration || 300;
                    lockAccount(lockDuration);
                    return;
                }

                if (remainingAttempts > 0) {
                    otpAttemptsRef.current = 5 - remainingAttempts;
                    localStorage.setItem('momoOtpAttempts', String(otpAttemptsRef.current));
                    openModal('error', 'THẤT BẠI', `${res.data.message || 'Mã OTP không đúng!'} Còn ${remainingAttempts} lần thử.`);
                } else {
                    openModal('error', 'THẤT BẠI', res.data.message || 'Mã OTP không đúng hoặc đã hết hạn!');
                }
            }
        } catch (err) {
            const errorData = err.response?.data || {};
            const errorMsg = errorData.message || 'Mã OTP không đúng hoặc đã hết hạn!';
            
            if (err.response?.status === 429 || errorMsg.includes('khóa') || errorData.code === 'OTP_LOCKED') {
                const lockDuration = errorData.data?.remainingSeconds || 300;
                lockAccount(lockDuration);
            } else {
                const remainingAttempts = errorData.data?.remainingAttempts;
                if (remainingAttempts !== undefined && remainingAttempts > 0) {
                    otpAttemptsRef.current = 5 - remainingAttempts;
                    localStorage.setItem('momoOtpAttempts', String(otpAttemptsRef.current));
                    openModal('error', 'THẤT BẠI', `${errorMsg} Còn ${remainingAttempts} lần thử.`);
                } else {
                    openModal('error', 'THẤT BẠI', errorMsg);
                }
            }
        } finally {
            setLoadingVerify(false);
        }
    };

    // =========================
    // HANDLE OTP CHANGE
    // =========================
    const handleOtpChange = (e, index) => {
        const value = e.target.value.replace(/\D/g, '');
        if (value) {
            const newOtp = otp.split('');
            newOtp[index] = value;
            setOtp(newOtp.join(''));
            if (index < 5) {
                const nextInput = otpInputsRef.current[index + 1];
                if (nextInput) nextInput.focus();
            }
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index]) {
            if (index > 0) {
                const prevInput = otpInputsRef.current[index - 1];
                if (prevInput) {
                    prevInput.focus();
                    const newOtp = otp.split('');
                    newOtp[index - 1] = '';
                    setOtp(newOtp.join(''));
                }
            }
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasteData) {
            const newOtp = pasteData.padEnd(6, '').split('');
            setOtp(newOtp.join(''));
            const lastIndex = Math.min(pasteData.length, 5);
            const lastInput = otpInputsRef.current[lastIndex];
            if (lastInput) lastInput.focus();
        }
    };

    // =========================
    // RENDER
    // =========================
    return (
        <div className="momo-checkout-page">
            <main className="momo-checkout-container">
                <div className="momo-sidebar-wrapper">
                    <BookingSidebar
                        movie={movie}
                        showtimeDetail={showtimeDetail}
                        selectedCinema={selectedCinema}
                        selectedDate={selectedDate}
                        selectedShowtime={selectedShowtime}
                        selectedSeats={Array.isArray(selectedSeats) ? selectedSeats : []}
                        foods={Array.isArray(foods) ? foods : []}
                        selectedFoods={Array.isArray(selectedFoods) ? selectedFoods : []}
                        totalTicketPrice={totalTicketPrice}
                        totalFoodPrice={totalFoodPrice}
                        grandTotal={totalAmount}
                        isTimerActive={true}
                        remainingTime={timeLeft}
                        showFoodSection={true}
                    />
                </div>

                <div className="momo-otp-section">
                    <div className="otp-card">
                        <div className="momo-qr-wrapper">
                            <img
                                src={qrImageUrl}
                                alt="QR MoMo"
                                className="momo-qr"
                            />
                            <div className="qr-scan-line"></div>
                        </div>

                        <h3 className="otp-title">NHẬP MÃ OTP</h3>
                        <p className="otp-sub">
                            Gửi đến: <strong>{customerEmail || 'Chưa có email'}</strong>
                        </p>

                        <div className="otp-circle-container">
                            {[...Array(6)].map((_, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    className="otp-circle"
                                    maxLength="1"
                                    value={otp[index] || ''}
                                    onChange={(e) => handleOtpChange(e, index)}
                                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                    onPaste={handleOtpPaste}
                                    disabled={paymentCompletedRef.current || isLocked}
                                    autoFocus={index === 0 && !otpExpiredRef.current && !isLocked}
                                    ref={(el) => (otpInputsRef.current[index] = el)}
                                />
                            ))}
                        </div>

                        <div className="momo-timer-box">
                            {isLocked ? (
                                <span style={{ color: '#ff6b6b' }}>
                                    🔒 Tài khoản bị khóa: {formatTime(lockTimeLeft)}
                                </span>
                            ) : otpExpiredRef.current ? (
                                <span style={{ color: '#ff6b6b' }}>⏰ OTP đã hết hạn</span>
                            ) : (
                                <>
                                    OTP hết hạn sau:
                                    <span>{formatTime(timeLeft)}</span>
                                </>
                            )}
                        </div>

                        <div className="momo-resend-wrapper">
                            <button
                                type="button"
                                className="btn-resend-otp"
                                onClick={handleResendOtp}
                                disabled={loadingSendOtp || paymentCompletedRef.current || resendCooldown > 0 || isLocked}
                            >
                                {loadingSendOtp ? 'Đang gửi...' : isLocked ? `🔒 Đã khóa (${formatTime(lockTimeLeft)})` : resendCooldown > 0 ? `⏳ Gửi lại sau ${formatTime(resendCooldown)}` : '🔄 GỬI LẠI OTP'}
                            </button>
                        </div>

                        <LoadingButton
                            type="button"
                            loading={loadingVerify}
                            loadingText="Đang xác nhận..."
                            onClick={handleVerifyPayment}
                            disabled={loadingVerify || loadingSendOtp || paymentCompletedRef.current || otpExpiredRef.current || isLocked}
                            className="btn-confirm-payment"
                            spinnerColor="#ffffff"
                        >
                            XÁC NHẬN THANH TOÁN
                        </LoadingButton>
                    </div>
                </div>
            </main>

            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            <Modal
                show={showBackConfirm}
                type="warning"
                title="CẢNH BÁO"
                message="Bạn đang trong quá trình nhập OTP. Nếu thoát, toàn bộ thông tin đặt vé sẽ bị xóa. Bạn có chắc chắn muốn rời khỏi?"
                onConfirm={clearAllAndGoHome}
                onCancel={handleStay}
                confirmText="Xác nhận rời"
                cancelText="Ở lại"
            />
        </div>
    );
};

export default MomoApp;