// ============================================================
// MOMO APP
// Bước 5: THANH TOÁN MOMO + OTP
// ✅ ĐÃ SỬA: Không gửi OTP lại khi Payment đã gửi
// ✅ ĐÃ SỬA: Bỏ hết inline style → CSS
// ✅ ĐÃ SỬA: OTP hết hạn hiện modal thay vì chữ to
// ✅ ĐÃ SỬA: Dùng MỐC TUYỆT ĐỐI cho TẤT CẢ timer (đồng bộ 100%)
// ============================================================

import React, {
    useState,
    useEffect,
    useRef,
    useCallback
} from 'react';

import {
    useLocation,
    useNavigate,
    useBlocker
} from 'react-router-dom';

import api from '../../api/api';
import socketService from '../../api/socket';

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';
import useOTPGuard from '../../hooks/useOTPGuard';

import '../styles/MomoApp.css';

// ============================================================
// CONSTANTS
// ============================================================

const OTP_TTL = 300;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 300;

const MomoApp = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // ============================================================
    // LẤY DỮ LIỆU BOOKING
    // ============================================================

    const getBookingData = () => {
        const stateData = location.state || {};

        if (stateData.tempBookingId) {
            return stateData;
        }

        try {
            const tempId = localStorage.getItem('momoTempBookingId');

            if (tempId) {
                return {
                    tempBookingId: tempId,
                    customerEmail: localStorage.getItem('momoCustomerEmail') || '',
                    customerName: localStorage.getItem('momoCustomerName') || '',
                    customerPhone: localStorage.getItem('momoCustomerPhone') || '',
                    totalAmount: parseFloat(localStorage.getItem('momoTotalAmount') || '0'),
                    movie: JSON.parse(localStorage.getItem('momoMovie') || '{}'),
                    selectedCinema: JSON.parse(localStorage.getItem('momoSelectedCinema') || '{}'),
                    selectedDate: localStorage.getItem('momoSelectedDate') || '',
                    selectedShowtime: JSON.parse(localStorage.getItem('momoSelectedShowtime') || '{}'),
                    selectedSeats: JSON.parse(localStorage.getItem('momoSelectedSeats') || '[]'),
                    selectedFoods: JSON.parse(localStorage.getItem('momoSelectedFoods') || '[]'),
                    foods: JSON.parse(localStorage.getItem('momoFoods') || '[]'),
                    totalTicketPrice: parseFloat(localStorage.getItem('momoTotalTicketPrice') || '0'),
                    totalFoodPrice: parseFloat(localStorage.getItem('momoTotalFoodPrice') || '0'),
                    showtimeDetail: JSON.parse(localStorage.getItem('momoShowtimeDetail') || '{}'),
                    ownerToken: localStorage.getItem('bookingOwnerToken') || ''
                };
            }
        } catch (err) {
            console.error('❌ Lỗi đọc momo data từ localStorage:', err);
        }

        try {
            const savedTicket = localStorage.getItem('lastSuccessTicket');
            if (savedTicket) {
                const parsed = JSON.parse(savedTicket);
                return {
                    ...parsed,
                    ownerToken: parsed.ownerToken || localStorage.getItem('bookingOwnerToken') || ''
                };
            }
        } catch (err) {
            console.error('❌ Lỗi đọc lastSuccessTicket:', err);
        }

        return {
            ...stateData,
            ownerToken: stateData.ownerToken || localStorage.getItem('bookingOwnerToken') || ''
        };
    };

    const bookingData = getBookingData();

    // ============================================================
    // BOOKING DATA
    // ============================================================

    const tempBookingId = String(
        localStorage.getItem('momoTempBookingId') ||
        bookingData.tempBookingId ||
        ''
    );

    const customerEmail = bookingData.customerEmail || localStorage.getItem('momoCustomerEmail') || '';
    const customerName = bookingData.customerName || '';
    const customerPhone = bookingData.customerPhone || '';
    const totalAmount = Number(bookingData.totalAmount) || 0;
    const movie = bookingData.movie || {};
    const selectedCinema = bookingData.selectedCinema || {};
    const selectedDate = bookingData.selectedDate || '';
    const selectedShowtime = bookingData.selectedShowtime || {};
    const selectedSeats = Array.isArray(bookingData.selectedSeats) ? bookingData.selectedSeats : [];
    const selectedFoods = Array.isArray(bookingData.selectedFoods) ? bookingData.selectedFoods : [];
    const foods = Array.isArray(bookingData.foods) ? bookingData.foods : [];
    const totalTicketPrice = Number(bookingData.totalTicketPrice) || 0;
    const totalFoodPrice = Number(bookingData.totalFoodPrice) || 0;
    const showtimeDetail = bookingData.showtimeDetail || {};
    const ownerToken = bookingData.ownerToken || localStorage.getItem('bookingOwnerToken') || '';

    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id || showtimeDetail?.showtime_id || showtimeDetail?.id || '';

    // ============================================================
    // 🔥 SỬ DỤNG useOTPGuard
    // ============================================================

    const { safeNavigate, invalidateOTP } = useOTPGuard(customerEmail, 'PAYMENT', {
        onInvalidate: () => {
            console.log('🔴 [MOMO] OTP đã bị vô hiệu do rời trang');
        }
    });

    // ============================================================
    // MOMO QR
    // ============================================================

    const myMomoPhone = '0909489611';
    const myName = 'NGUYEN PHAM QUANG DUNG';
    const qrImageUrl = `https://img.vietqr.io/image/momo-${myMomoPhone}-compact.jpg?amount=${totalAmount || 85000}&addInfo=DungCinema%20${tempBookingId}&accountName=${encodeURIComponent(myName)}`;

    // ============================================================
    // REFS
    // ============================================================

    const hasSentOtp = useRef(localStorage.getItem('momoHasSentOtp') === 'true');
    const hasVisitedMomoApp = useRef(localStorage.getItem('momoHasVisited') === 'true');
    const redirectTimeoutRef = useRef(null);
    const autoNavigateRef = useRef(null);
    const isModalOpenRef = useRef(false);
    const isFirstLoad = useRef(true);
    const paymentCompletedRef = useRef(false);
    const isPaymentInitiated = useRef(localStorage.getItem('momoPaymentInitiated') === 'true');
    const isCancellingRef = useRef(false);
    const isReleasingSeatsRef = useRef(false);
    const otpInputsRef = useRef([]);
    const hasShownModalRef = useRef(false);
    const hasShownExpiredModalRef = useRef(false);
    const timerCheckRef = useRef(null);
    const otpExpiredRef = useRef(false);
    const otpAttemptsRef = useRef(parseInt(localStorage.getItem('momoOtpAttempts') || '0', 10));
    const isLockedRef = useRef(localStorage.getItem('momoIsLocked') === 'true');
    const timerIntervalRef = useRef(null);

    // ============================================================
    // ✅ TIME STATE - CHỈ LƯU MỐC TUYỆT ĐỐI
    // ============================================================

    // Mốc hết hạn OTP (tuyệt đối)
    const [otpExpiresAt, setOtpExpiresAt] = useState(() => {
        const saved = parseInt(localStorage.getItem('momoOtpExpiresAt') || '0', 10);
        return saved > 0 ? saved : 0;
    });

    // Mốc hết cooldown gửi lại (tuyệt đối)
    const [resendCooldownExpiresAt, setResendCooldownExpiresAt] = useState(() => {
        const saved = parseInt(localStorage.getItem('momoResendCooldownExpiresAt') || '0', 10);
        return saved > 0 ? saved : 0;
    });

    // Mốc hết khóa (tuyệt đối)
    const [lockExpiresAt, setLockExpiresAt] = useState(() => {
        const saved = parseInt(localStorage.getItem('momoLockTime') || '0', 10);
        return saved > 0 ? saved : 0;
    });

    // ✅ TIME LEFT - Cập nhật mỗi giây từ mốc tuyệt đối
    const [timeLeft, setTimeLeft] = useState(OTP_TTL);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    // ✅ UNIFIED TIMER - 1 interval duy nhất cập nhật TẤT CẢ timer
    useEffect(() => {
        const tick = () => {
            const now = Date.now();

            // OTP timer
            if (otpExpiresAt > 0) {
                const otpRemaining = Math.max(0, Math.ceil((otpExpiresAt - now) / 1000));
                setTimeLeft(otpRemaining);
                if (otpRemaining <= 0 && !otpExpiredRef.current) {
                    otpExpiredRef.current = true;
                }
            }

            // Resend cooldown
            if (resendCooldownExpiresAt > 0) {
                const cooldownRemaining = Math.max(0, Math.ceil((resendCooldownExpiresAt - now) / 1000));
                setResendCooldown(cooldownRemaining);
                if (cooldownRemaining <= 0) {
                    setResendCooldownExpiresAt(0);
                    localStorage.removeItem('momoResendCooldownExpiresAt');
                }
            } else {
                setResendCooldown(0);
            }

            // Lock timer
            if (lockExpiresAt > 0) {
                const lockRemaining = Math.max(0, Math.ceil((lockExpiresAt - now) / 1000));
                setLockTimeLeft(lockRemaining);
                if (lockRemaining <= 0) {
                    // Mở khóa
                    setLockExpiresAt(0);
                    localStorage.removeItem('momoIsLocked');
                    localStorage.removeItem('momoLockTime');
                    localStorage.removeItem('momoOtpAttempts');
                    isLockedRef.current = false;
                }
            } else {
                setLockTimeLeft(0);
            }
        };

        tick(); // Chạy ngay
        timerIntervalRef.current = setInterval(tick, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [otpExpiresAt, resendCooldownExpiresAt, lockExpiresAt]);

    // ============================================================
    // DERIVED STATE
    // ============================================================

    const isLocked = lockExpiresAt > 0 && lockTimeLeft > 0;
    const isOtpExpired = otpExpiresAt > 0 && timeLeft <= 0;

    // ============================================================
    // OTP
    // ============================================================

    const [otp, setOtp] = useState(() => localStorage.getItem('momoOtpInput') || '');

    // ============================================================
    // LOADING
    // ============================================================

    const [loadingVerify, setLoadingVerify] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true);

    // ============================================================
    // BACK CONFIRM
    // ============================================================

    const [showBackConfirm, setShowBackConfirm] = useState(false);

    // ============================================================
    // MODAL
    // ============================================================

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    // ============================================================
    // RESET OTP INPUT
    // ============================================================

    const resetOtpInput = useCallback(() => {
        setOtp('');
        localStorage.setItem('momoOtpInput', '');
        if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
    }, []);

    // ============================================================
    // FORMAT TIME
    // ============================================================

    const formatTime = useCallback((seconds) => {
        if (seconds <= 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, []);

    // ============================================================
    // MODAL
    // ============================================================

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({ ...prev, show: false }));
        hasShownModalRef.current = false;
    }, []);

    const openModal = useCallback((type, title, message, onConfirmCustom = null, onCancelCustom = null) => {
        if (isModalOpenRef.current) return;
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
    }, [closeModal]);

    // ============================================================
    // TRACK MODAL
    // ============================================================

    useEffect(() => {
        isModalOpenRef.current = modalConfig.show;
    }, [modalConfig.show]);

    // ============================================================
    // REDIS TTL
    // ============================================================

    const fetchTimeFromRedis = useCallback(async () => {
        if (!tempBookingId) return null;
        try {
            const response = await api.get(`/api/momo/check-ttl/${tempBookingId}`);
            if (response.data?.success) {
                const { expiresIn, isExpired } = response.data.data || {};
                if (!isExpired && expiresIn > 0) return expiresIn;
                return 0;
            }
            return null;
        } catch (error) {
            console.error('❌ Lỗi lấy TTL từ Redis:', error);
            return null;
        }
    }, [tempBookingId]);

    const syncTimerWithRedis = useCallback(async () => {
        const hasOtp = localStorage.getItem('momoOtpInput');
        if (hasOtp) return;
        try {
            setIsSyncing(true);
            const redisTime = await fetchTimeFromRedis();
            if (redisTime !== null) {
                if (redisTime > 0) {
                    const newExpiresAt = Date.now() + redisTime * 1000;
                    setOtpExpiresAt(newExpiresAt);
                    localStorage.setItem('momoOtpExpiresAt', String(newExpiresAt));
                    otpExpiredRef.current = false;
                } else {
                    setOtpExpiresAt(0);
                    localStorage.setItem('momoOtpExpiresAt', '0');
                    otpExpiredRef.current = true;
                }
            }
        } catch (error) {
            console.error('❌ Lỗi đồng bộ timer:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [fetchTimeFromRedis]);

    // ============================================================
    // RESET OTP LOCK
    // ============================================================

    const resetLockState = useCallback(() => {
        setLockExpiresAt(0);
        otpAttemptsRef.current = 0;
        localStorage.removeItem('momoIsLocked');
        localStorage.removeItem('momoLockTime');
        localStorage.removeItem('momoOtpAttempts');
        isLockedRef.current = false;
    }, []);

    // ============================================================
    // LOCK ACCOUNT
    // ============================================================

    const lockAccount = useCallback((remainingSeconds = 300) => {
        const lockEndTime = Date.now() + remainingSeconds * 1000;
        setLockExpiresAt(lockEndTime);
        isLockedRef.current = true;
        localStorage.setItem('momoIsLocked', 'true');
        localStorage.setItem('momoLockTime', String(lockEndTime));
        localStorage.setItem('momoOtpAttempts', String(otpAttemptsRef.current));
        const timeStr = formatTime(remainingSeconds);
        openModal(
            'error',
            'OTP BỊ KHÓA',
            `Bạn đã nhập sai OTP quá 5 lần. Tài khoản đã bị khóa ${timeStr}. Vui lòng thử lại sau.`,
            () => closeModal()
        );
    }, [openModal, closeModal, formatTime]);

    // ============================================================
    // RELEASE REDIS SEAT LOCK
    // ============================================================

    const releaseSeatLocks = useCallback(async () => {
        if (isReleasingSeatsRef.current) return;
        if (!showtimeId) return;
        if (!socketService.isConnectedStatus()) {
            console.warn('⚠️ Socket không còn kết nối, không thể gửi release seat.');
            return;
        }
        isReleasingSeatsRef.current = true;
        try {
            socketService.emit('clear_all_holding_seats', { showtimeId, ownerToken });
            console.log('🔓 [MOMO] Đã yêu cầu giải phóng ghế:', { showtimeId, ownerToken });
        } catch (error) {
            console.error('❌ [MOMO] Lỗi release seat locks:', error);
        } finally {
            setTimeout(() => {
                isReleasingSeatsRef.current = false;
            }, 500);
        }
    }, [showtimeId, ownerToken]);

    // ============================================================
    // XÓA BOOKING DATA
    // ============================================================

    const clearAllBookingData = useCallback(() => {
        const momoKeys = [
            'momoHasSentOtp', 'momoHasVisited', 'momoOtpInput', 'momoLastOtpSentAt',
            'momoPaymentInitiated', 'momoPaymentCompleted', 'momoCompletedBookingId',
            'momoHoldExpiresAt', 'momoSelectedSeats', 'momoCurrentShowtimeId',
            'momoLastSuccessTicket', 'momoTempBookingId', 'momoSelectedFoods',
            'momoBookingTemp', 'momoIsLocked', 'momoLockTime', 'momoOtpAttempts',
            'momoCustomerEmail', 'momoCustomerName', 'momoCustomerPhone', 'momoTotalAmount',
            'momoMovie', 'momoSelectedCinema', 'momoSelectedDate', 'momoSelectedShowtime',
            'momoFoods', 'momoTotalTicketPrice', 'momoTotalFoodPrice', 'momoShowtimeDetail',
            'momoOtpExpiresAt', 'momoResendCooldownExpiresAt'
        ];
        momoKeys.forEach(key => localStorage.removeItem(key));

        const commonKeys = [
            'lastSuccessTicket', 'booking_temp', 'tempBookingId', 'selectedSeats',
            'selectedFoods', 'holdExpiresAt', 'currentShowtimeId', 'paymentInitiated',
            'paymentCompleted', 'completedBookingId'
        ];
        commonKeys.forEach(key => localStorage.removeItem(key));

        localStorage.removeItem('bookingOwnerToken');

        setOtpExpiresAt(0);
        setResendCooldownExpiresAt(0);
        setOtp('');
        hasShownModalRef.current = false;
        hasShownExpiredModalRef.current = false;
        otpExpiredRef.current = false;
        resetLockState();
    }, [resetLockState]);

    // ============================================================
    // CANCEL TEMP BOOKING
    // ============================================================

    const cancelBookingOnServer = useCallback(async () => {
        if (!tempBookingId) return;
        if (isCancellingRef.current) return;
        isCancellingRef.current = true;
        try {
            await api.post('/api/momo/cancel', { tempBookingId }, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('✅ [MOMO] Temp booking cancelled');
        } catch (err) {
            console.error('❌ [MOMO] Lỗi hủy temp booking:', err);
        } finally {
            isCancellingRef.current = false;
        }
    }, [tempBookingId]);

    // ============================================================
    // EXPIRE FLOW
    // ============================================================

    const handleExpireFlow = useCallback(async () => {
        if (paymentCompletedRef.current) return;
        console.log('⏰ [MOMO] Payment/OTP expired');
        await invalidateOTP();
        await releaseSeatLocks();
        await cancelBookingOnServer();
        clearAllBookingData();
        openModal(
            'warning',
            'HẾT THỜI GIAN',
            'Thời gian thanh toán đã hết. Ghế của bạn đã được giải phóng. Vui lòng đặt vé lại.',
            () => {
                closeModal();
                safeNavigate('/booking');
            }
        );
    }, [releaseSeatLocks, cancelBookingOnServer, clearAllBookingData, openModal, closeModal, safeNavigate, invalidateOTP]);

    // ============================================================
    // CHECK PAYMENT COMPLETED
    // ============================================================

    useEffect(() => {
        const completed = localStorage.getItem('momoPaymentCompleted');
        const completedId = localStorage.getItem('momoCompletedBookingId');
        if (completed === 'true' && completedId === tempBookingId) {
            paymentCompletedRef.current = true;
            hasSentOtp.current = true;
            clearAllBookingData();
            if (!modalConfig.show && !hasShownModalRef.current) {
                openModal(
                    'info',
                    'THÔNG BÁO',
                    'Bạn đã thanh toán thành công! Vui lòng quay lại trang chủ.',
                    () => {
                        closeModal();
                        safeNavigate('/');
                    }
                );
            }
        }
    }, [tempBookingId, clearAllBookingData, modalConfig.show, openModal, closeModal, safeNavigate]);

    // ============================================================
    // CHECK DATA
    // ============================================================

    useEffect(() => {
        if (!tempBookingId || !customerEmail) {
            const hasSavedData = localStorage.getItem('momoLastSuccessTicket') || localStorage.getItem('momoBookingTemp');
            if (!hasSavedData && !isFirstLoad.current) {
                openModal(
                    'error',
                    'THIẾU THÔNG TIN',
                    'Không tìm thấy thông tin đặt vé. Vui lòng đặt lại.',
                    () => {
                        closeModal();
                        safeNavigate('/');
                    }
                );
            }
        }
        isFirstLoad.current = false;
    }, [tempBookingId, customerEmail, openModal, closeModal, safeNavigate]);

    // ============================================================
    // CHECK OWNER TOKEN
    // ============================================================

    useEffect(() => {
        if (!ownerToken || paymentCompletedRef.current) return;
        const currentSocketId = socketService.getSocketId();
        if (currentSocketId && currentSocketId !== ownerToken) {
            console.warn('⚠️ [MOMO] Owner token không khớp socket hiện tại:', { ownerToken, currentSocketId });
            openModal(
                'error',
                'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ',
                'Kết nối giữ ghế đã thay đổi hoặc đã hết hiệu lực. Vui lòng quay lại đặt vé.',
                async () => {
                    closeModal();
                    await cancelBookingOnServer();
                    clearAllBookingData();
                    safeNavigate('/booking');
                }
            );
        }
    }, [ownerToken, cancelBookingOnServer, clearAllBookingData, openModal, closeModal, safeNavigate]);

    // ============================================================
    // CLEANUP
    // ============================================================

    useEffect(() => {
        return () => {
            if (autoNavigateRef.current) clearTimeout(autoNavigateRef.current);
            if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
            if (timerCheckRef.current) clearInterval(timerCheckRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    // ============================================================
    // CLEAR ALL + GO HOME
    // ============================================================

    const clearAllAndGoHome = async () => {
        await invalidateOTP();
        await releaseSeatLocks();
        await cancelBookingOnServer();
        clearAllBookingData();
        safeNavigate('/');
    };

    // ============================================================
    // STAY
    // ============================================================

    const handleStay = () => {
        setShowBackConfirm(false);
    };

    // ============================================================
    // SAVE LOCAL STATE
    // ============================================================

    useEffect(() => {
        localStorage.setItem('momoOtpInput', otp);
    }, [otp]);

    // ============================================================
    // SEND OTP
    // ============================================================

    const sendOtpApi = async () => {
        if (!tempBookingId || !customerEmail) {
            openModal('error', 'THIẾU THÔNG TIN', 'Không tìm thấy thông tin thanh toán.');
            return false;
        }
        setLoadingSendOtp(true);
        try {
            const payload = { email: customerEmail, tempBookingId };
            const response = await api.post('/api/momo/send-otp', payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || 'Không thể gửi OTP.');
            }
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
            setOtp('');
            localStorage.setItem('momoOtpInput', '');

            // ✅ TÍNH MỐC TUYỆT ĐỐI
            const responseTTL = Number(response.data?.data?.expiresIn || 0);
            const serverTime = Number(response.data?.data?.serverTime || Date.now());
            const expiresAt = serverTime + (responseTTL * 1000);
            localStorage.setItem('momoOtpExpiresAt', String(expiresAt));
            setOtpExpiresAt(expiresAt);

            // ✅ RESEND COOLDOWN - MỐC TUYỆT ĐỐI
            const cooldownExpiresAt = Date.now() + RESEND_COOLDOWN * 1000;
            setResendCooldownExpiresAt(cooldownExpiresAt);
            localStorage.setItem('momoResendCooldownExpiresAt', String(cooldownExpiresAt));

            otpExpiredRef.current = false;
            hasShownExpiredModalRef.current = false;
            return true;
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
            if (!isFirstLoad.current) {
                openModal('error', 'LỖI GỬI OTP', errorMsg);
            }
            return false;
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // ============================================================
    // RESEND OTP
    // ============================================================

    const handleResendOtp = async () => {
        if (isLocked) {
            openModal('error', 'TÀI KHOẢN BỊ KHÓA', `Tài khoản đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng thử lại sau ${formatTime(lockTimeLeft)}.`);
            return;
        }
        if (paymentCompletedRef.current) {
            openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công!');
            return;
        }
        if (resendCooldown > 0) {
            openModal('info', 'THÔNG BÁO', `Vui lòng đợi ${formatTime(resendCooldown)} trước khi gửi lại OTP.`);
            return;
        }
        if (!tempBookingId || !customerEmail) {
            openModal('error', 'THIẾU THÔNG TIN', 'Không tìm thấy thông tin thanh toán.');
            return;
        }
        setLoadingSendOtp(true);
        try {
            const payload = { email: customerEmail, tempBookingId };
            const response = await api.post('/api/momo/resend-otp', payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.data?.success) {
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

                resetOtpInput();

                // ✅ TÍNH MỐC TUYỆT ĐỐI
                const responseTTL = Number(response.data?.data?.expiresIn || 0);
                const serverTime = Number(response.data?.data?.serverTime || Date.now());
                const expiresAt = serverTime + (responseTTL * 1000);
                localStorage.setItem('momoOtpExpiresAt', String(expiresAt));
                setOtpExpiresAt(expiresAt);

                // ✅ RESEND COOLDOWN - MỐC TUYỆT ĐỐI
                const cooldownExpiresAt = Date.now() + RESEND_COOLDOWN * 1000;
                setResendCooldownExpiresAt(cooldownExpiresAt);
                localStorage.setItem('momoResendCooldownExpiresAt', String(cooldownExpiresAt));

                otpExpiredRef.current = false;
                hasShownExpiredModalRef.current = false;
                openModal('success', 'THÀNH CÔNG', 'Mã OTP mới đã được gửi tới email của bạn.');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.';
            if (err.response?.status === 429) {
                const remainingSeconds = err.response?.data?.data?.remainingSeconds || 300;
                const cooldownExpiresAt = Date.now() + remainingSeconds * 1000;
                setResendCooldownExpiresAt(cooldownExpiresAt);
                localStorage.setItem('momoResendCooldownExpiresAt', String(cooldownExpiresAt));
                openModal('error', 'QUÁ NHIỀU YÊU CẦU', `Bạn đã gửi quá nhiều lần (tối đa 3 lần/5 phút). Vui lòng thử lại sau ${formatTime(remainingSeconds)}.`);
            } else {
                openModal('error', 'LỖI GỬI OTP', errorMsg);
            }
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // ============================================================
    // ✅ INITIALIZE MOMO APP - KHÔNG GỬI OTP LẠI
    // ============================================================

    useEffect(() => {
        let cancelled = false;
        const initializeMomoApp = async () => {
            if (paymentCompletedRef.current) return;
            if (!customerEmail || !tempBookingId) return;

            await syncTimerWithRedis();
            if (cancelled) return;

            const hasOtpInStorage = localStorage.getItem('momoOtpInput');
            const hasSentOtpFlag = localStorage.getItem('momoHasSentOtp') === 'true';
            const hasOtp = hasOtpInStorage || hasSentOtpFlag;
            if (hasOtp) return;

            const initiated = localStorage.getItem('momoPaymentInitiated') === 'true' || isPaymentInitiated.current;

            // ✅ SỬA: Nếu đã initiated → Payment ĐÃ GỬI OTP → KHÔNG gửi lại
            if (initiated) {
                console.log('✅ [MOMO] OTP đã được gửi từ Payment, không gửi lại');

                // Đánh dấu đã gửi OTP
                hasSentOtp.current = true;
                hasVisitedMomoApp.current = true;
                localStorage.setItem('momoHasSentOtp', 'true');
                localStorage.setItem('momoHasVisited', 'true');

                // ✅ Resend cooldown - set mốc tuyệt đối
                if (!localStorage.getItem('momoResendCooldownExpiresAt')) {
                    const cooldownExpiresAt = Date.now() + RESEND_COOLDOWN * 1000;
                    setResendCooldownExpiresAt(cooldownExpiresAt);
                    localStorage.setItem('momoResendCooldownExpiresAt', String(cooldownExpiresAt));
                }

                // Sync timer từ Redis
                const redisTime = await fetchTimeFromRedis();
                if (redisTime !== null && redisTime > 0) {
                    const newExpiresAt = Date.now() + redisTime * 1000;
                    setOtpExpiresAt(newExpiresAt);
                    localStorage.setItem('momoOtpExpiresAt', String(newExpiresAt));
                    otpExpiredRef.current = false;
                } else {
                    const expiresAt = Number(localStorage.getItem('momoOtpExpiresAt') || 0);
                    if (expiresAt > 0) {
                        setOtpExpiresAt(expiresAt);
                        if (expiresAt <= Date.now()) otpExpiredRef.current = true;
                    }
                }

                return;  // ✅ DỪNG - KHÔNG GỌI sendOtpApi()
            }

            // Chưa initiated → chặn truy cập trực tiếp
            if (!isFirstLoad.current && !modalConfig.show && !hasShownModalRef.current) {
                openModal(
                    'error',
                    'TRUY CẬP KHÔNG HỢP LỆ',
                    'Vui lòng thanh toán từ trang Payment để nhận OTP.',
                    () => {
                        closeModal();
                        navigate('/payment', { state: bookingData });
                    }
                );
            }
        };
        const timer = setTimeout(initializeMomoApp, 100);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [customerEmail, tempBookingId, syncTimerWithRedis, modalConfig.show, openModal, closeModal, navigate, bookingData, fetchTimeFromRedis]);

    // ============================================================
    // REDIS TIMER CHECK (Định kỳ)
    // ============================================================

    useEffect(() => {
        if (paymentCompletedRef.current) return;
        timerCheckRef.current = setInterval(async () => {
            const redisTime = await fetchTimeFromRedis();
            if (redisTime !== null) {
                if (redisTime > 0) {
                    const newExpiresAt = Date.now() + redisTime * 1000;
                    setOtpExpiresAt(newExpiresAt);
                    localStorage.setItem('momoOtpExpiresAt', String(newExpiresAt));
                    otpExpiredRef.current = false;
                } else {
                    setOtpExpiresAt(0);
                    otpExpiredRef.current = true;
                }
            }
        }, 30000);
        return () => {
            if (timerCheckRef.current) {
                clearInterval(timerCheckRef.current);
            }
        };
    }, [tempBookingId, fetchTimeFromRedis]);

    // ============================================================
    // ✅ AUTO SHOW MODAL KHI OTP HẾT HẠN
    // ============================================================

    useEffect(() => {
        if (
            !paymentCompletedRef.current &&
            !isLocked &&
            (otpExpiredRef.current || timeLeft <= 0) &&
            (hasSentOtp.current || localStorage.getItem('momoHasSentOtp') === 'true') &&
            !hasShownExpiredModalRef.current &&
            otpExpiresAt > 0
        ) {
            hasShownExpiredModalRef.current = true;
            openModal(
                'warning',
                '⏰ OTP ĐÃ HẾT HẠN',
                'Mã OTP đã hết hạn. Vui lòng bấm "🔄 GỬI LẠI OTP" để nhận mã mới.',
                closeModal
            );
        }
    }, [timeLeft, isLocked, openModal, closeModal, otpExpiresAt]);

    // ============================================================
    // VERIFY OTP
    // ============================================================

    const handleVerifyPayment = async () => {
        if (paymentCompletedRef.current) {
            openModal('info', 'THÔNG BÁO', 'Mã OTP này đã được thanh toán thành công trước đó.');
            return;
        }

        if (isLocked) {
            openModal('error', 'TÀI KHOẢN BỊ KHÓA', `Tài khoản đã bị khóa do nhập sai OTP quá 5 lần. Vui lòng thử lại sau ${formatTime(lockTimeLeft)}.`);
            return;
        }

        if (otpExpiredRef.current || timeLeft <= 0) {
            openModal('warning', 'OTP HẾT HẠN', 'Mã OTP đã hết hạn. Vui lòng gửi lại OTP nếu bạn chưa thanh toán.');
            return;
        }

        if (otp.length < 6) {
            openModal('error', 'THÔNG BÁO', 'Vui lòng nhập đủ 6 số OTP.');
            return;
        }

        if (!tempBookingId) {
            openModal('error', 'PHIÊN THANH TOÁN KHÔNG HỢP LỆ', 'Không tìm thấy phiên thanh toán. Vui lòng đặt vé lại.');
            return;
        }

        if (!ownerToken) {
            openModal('error', 'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ', 'Không tìm thấy phiên giữ ghế. Vui lòng quay lại chọn ghế.');
            return;
        }

        const currentSocketId = socketService.getSocketId();
        if (!socketService.isConnectedStatus() || !currentSocketId || currentSocketId !== ownerToken) {
            openModal('error', 'MẤT KẾT NỐI GIỮ GHẾ', 'Phiên giữ ghế đã bị gián đoạn. Vui lòng quay lại đặt vé.');
            return;
        }

        setLoadingVerify(true);
        try {
            const payload = {
                email: customerEmail,
                otp,
                tempBookingId,
                full_name: customerName,
                phone: customerPhone
            };
            const res = await api.post('/api/momo/verify-otp', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.data?.success) {
                otpAttemptsRef.current = 0;
                localStorage.setItem('momoOtpAttempts', '0');
                resetLockState();
                const realBookingId = res.data?.data?.bookingId || tempBookingId;
                localStorage.setItem('momoPaymentCompleted', 'true');
                localStorage.setItem('momoCompletedBookingId', String(realBookingId));
                paymentCompletedRef.current = true;
                clearAllBookingData();
                openModal(
                    'success',
                    'THANH TOÁN THÀNH CÔNG',
                    'Cảm ơn bạn đã đặt vé! Vui lòng kiểm tra email để nhận vé.',
                    () => {
                        if (autoNavigateRef.current) {
                            clearTimeout(autoNavigateRef.current);
                        }
                        closeModal();
                        safeNavigate('/confirm-success', { state: bookingData });
                    }
                );
                autoNavigateRef.current = setTimeout(() => {
                    if (isModalOpenRef.current) {
                        closeModal();
                        safeNavigate('/confirm-success', { state: bookingData });
                    }
                    autoNavigateRef.current = null;
                }, 3000);
            } else {
                const errorData = res.data?.data || {};
                const remainingAttempts = errorData.remainingAttempts !== undefined ? errorData.remainingAttempts : 0;

                if (!(res.data?.message?.toLowerCase()?.includes('khóa') || remainingAttempts === 0)) {
                    resetOtpInput();
                }

                if (res.data?.message?.toLowerCase()?.includes('khóa') || remainingAttempts === 0) {
                    const lockDuration = errorData.lockDuration || 300;
                    lockAccount(lockDuration);
                    return;
                }
                if (remainingAttempts > 0) {
                    otpAttemptsRef.current = 5 - remainingAttempts;
                    localStorage.setItem('momoOtpAttempts', String(otpAttemptsRef.current));
                    openModal('error', 'THẤT BẠI', `${res.data?.message || 'Mã OTP không đúng!'} Còn ${remainingAttempts} lần thử.`);
                } else {
                    openModal('error', 'THẤT BẠI', res.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
                }
            }
        } catch (err) {
            const errorData = err.response?.data || {};
            const errorMsg = errorData.message || 'Mã OTP không đúng hoặc đã hết hạn!';

            if (!(err.response?.status === 429 || errorMsg.toLowerCase().includes('khóa') || errorData.code === 'OTP_LOCKED')) {
                resetOtpInput();
            }

            if (err.response?.status === 429 || errorMsg.toLowerCase().includes('khóa') || errorData.code === 'OTP_LOCKED') {
                const lockDuration = errorData?.data?.remainingSeconds || 300;
                lockAccount(lockDuration);
            } else {
                const remainingAttempts = errorData?.data?.remainingAttempts;
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

    // ============================================================
    // OTP CHANGE
    // ============================================================

    const handleOtpChange = (e, index) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 1);
        if (value) {
            const newOtp = otp.split('').slice(0, 6);
            while (newOtp.length < 6) {
                newOtp.push('');
            }
            newOtp[index] = value;
            setOtp(newOtp.join(''));
            if (index < 5) {
                const nextInput = otpInputsRef.current[index + 1];
                if (nextInput) {
                    nextInput.focus();
                }
            }
        }
    };

    // ============================================================
    // OTP KEY DOWN
    // ============================================================

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index]) {
            if (index > 0) {
                const prevInput = otpInputsRef.current[index - 1];
                if (prevInput) {
                    prevInput.focus();
                    const newOtp = otp.split('').slice(0, 6);
                    while (newOtp.length < 6) {
                        newOtp.push('');
                    }
                    newOtp[index - 1] = '';
                    setOtp(newOtp.join(''));
                }
            }
        }
    };

    // ============================================================
    // OTP PASTE
    // ============================================================

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasteData) return;
        const newOtp = pasteData.split('');
        while (newOtp.length < 6) {
            newOtp.push('');
        }
        setOtp(newOtp.join(''));
        const lastIndex = Math.min(pasteData.length, 5);
        const lastInput = otpInputsRef.current[lastIndex];
        if (lastInput) {
            lastInput.focus();
        }
    };

    // ============================================================
    // TIMER BOX CLASS
    // ============================================================

    const getTimerBoxClass = () => {
        if (isLocked) return 'momo-timer-box locked';
        if (otpExpiredRef.current || timeLeft <= 0) return 'momo-timer-box expired';
        return 'momo-timer-box';
    };

    // ============================================================
    // RENDER
    // ============================================================

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
                        selectedSeats={selectedSeats}
                        foods={foods}
                        selectedFoods={selectedFoods}
                        totalTicketPrice={totalTicketPrice}
                        totalFoodPrice={totalFoodPrice}
                        grandTotal={totalAmount}
                        isTimerActive={true}
                        remainingTime={timeLeft}
                        showFoodSection={true}
                        onTimeExpire={handleExpireFlow}
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
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
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

                        <div className={getTimerBoxClass()}>
                            {isLocked ? (
                                <span className="timer-text">🔒 Tài khoản bị khóa: {formatTime(lockTimeLeft)}</span>
                            ) : otpExpiredRef.current ? (
                                <span className="timer-text">⏰ OTP đã hết hạn</span>
                            ) : (
                                <>
                                    <span className="timer-label">OTP hết hạn sau:</span>
                                    <span className="timer-value">{formatTime(timeLeft)}</span>
                                </>
                            )}
                        </div>

                        <div className="momo-resend-wrapper">
                            <button
                                type="button"
                                className="btn-resend-otp"
                                onClick={handleResendOtp}
                                disabled={loadingSendOtp || paymentCompletedRef.current || isLocked || resendCooldown > 0}
                            >
                                {loadingSendOtp ? 'Đang gửi...' :
                                 isLocked ? `🔒 Đã khóa (${formatTime(lockTimeLeft)})` :
                                 resendCooldown > 0 ? `⏳ Gửi lại sau ${formatTime(resendCooldown)}` :
                                 '🔄 GỬI LẠI OTP'}
                            </button>
                        </div>

                        <LoadingButton
                            type="button"
                            loading={loadingVerify}
                            loadingText="Đang xác nhận..."
                            onClick={handleVerifyPayment}
                            disabled={loadingVerify || loadingSendOtp || paymentCompletedRef.current ||
                                otpExpiredRef.current || isLocked}
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