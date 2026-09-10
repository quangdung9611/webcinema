// ============================================================
// BANK APP
// Bước 5: THANH TOÁN QUA NGÂN HÀNG / VIETQR
// ✅ ĐÃ SỬA: Không gửi OTP lại khi Payment đã gửi
// ✅ ĐÃ SỬA: Bỏ hết inline style → CSS
// ✅ ĐÃ SỬA: OTP hết hạn hiện modal thay vì chữ to
// ✅ ĐÃ SỬA: Dùng MỐC TUYỆT ĐỐI cho TẤT CẢ timer (đồng bộ 100%)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import api from '../../api/api';
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';
import useOTPGuard from '../../hooks/useOTPGuard';
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
    if (stateData.tempBookingId) return stateData;
    try {
      const savedTicket = localStorage.getItem('lastSuccessTicket');
      if (savedTicket) return JSON.parse(savedTicket);
    } catch (error) {
      console.error('❌ [BANK APP] Lỗi đọc lastSuccessTicket:', error);
    }
    return stateData;
  };

  const bookingData = getBookingData();

  const tempBookingId = String(bookingData.tempBookingId || localStorage.getItem('tempBookingId') || '');
  const ownerToken = bookingData.ownerToken || localStorage.getItem('bookingOwnerToken') || '';
  const customerEmail = bookingData.customerEmail || localStorage.getItem('customerEmail') || '';
  const customerName = bookingData.customerName || '';
  const customerPhone = bookingData.customerPhone || '';
  const totalAmount = Number(bookingData.totalAmount || 0);
  const movie = bookingData.movie || {};
  const selectedCinema = bookingData.selectedCinema || {};
  const selectedDate = bookingData.selectedDate || '';
  const selectedShowtime = bookingData.selectedShowtime || {};
  const selectedSeats = Array.isArray(bookingData.selectedSeats) ? bookingData.selectedSeats : [];
  const selectedFoods = Array.isArray(bookingData.selectedFoods) ? bookingData.selectedFoods : [];
  const foods = Array.isArray(bookingData.foods) ? bookingData.foods : [];
  const totalTicketPrice = Number(bookingData.totalTicketPrice || 0);
  const totalFoodPrice = Number(bookingData.totalFoodPrice || 0);
  const showtimeDetail = bookingData.showtimeDetail || {};

  // ========================================================
  // 🔥 SỬ DỤNG useOTPGuard
  // ========================================================

  const { safeNavigate, invalidateOTP } = useOTPGuard(customerEmail, 'PAYMENT', {
    onInvalidate: () => {
      console.log('🔴 [BANK APP] OTP đã bị vô hiệu do rời trang');
    }
  });

  // ========================================================
  // REFS
  // ========================================================

  const hasSentOtp = useRef(localStorage.getItem('bankHasSentOtp') === 'true');
  const hasVisitedBankApp = useRef(localStorage.getItem('bankHasVisited') === 'true');
  const paymentCompletedRef = useRef(false);
  const isPaymentInitiated = useRef(localStorage.getItem('paymentInitiated') === 'true');
  const isCancellingRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const hasShownModalRef = useRef(false);
  const hasShownExpiredModalRef = useRef(false);
  const isFirstLoad = useRef(true);
  const otpInputsRef = useRef([]);
  const otpExpiredRef = useRef(false);
  const timerIntervalRef = useRef(null);
  const redisSyncIntervalRef = useRef(null);
  const autoNavigateRef = useRef(null);
  const redirectTimeoutRef = useRef(null);
  const otpAttemptsRef = useRef(parseInt(localStorage.getItem('bankOtpAttempts') || '0', 10));
  const isLockedRef = useRef(localStorage.getItem('bankIsLocked') === 'true');

  // ========================================================
  // ✅ TIME STATE - CHỈ LƯU MỐC TUYỆT ĐỐI
  // ========================================================

  // Mốc hết hạn OTP (tuyệt đối)
  const [otpExpiresAt, setOtpExpiresAt] = useState(() => {
    const saved = parseInt(localStorage.getItem('bankOtpExpiresAt') || '0', 10);
    return saved > 0 ? saved : 0;
  });

  // Mốc hết cooldown gửi lại (tuyệt đối)
  const [resendCooldownExpiresAt, setResendCooldownExpiresAt] = useState(() => {
    const saved = parseInt(localStorage.getItem('bankResendCooldownExpiresAt') || '0', 10);
    return saved > 0 ? saved : 0;
  });

  // Mốc hết khóa (tuyệt đối)
  const [lockExpiresAt, setLockExpiresAt] = useState(() => {
    const saved = parseInt(localStorage.getItem('bankLockTime') || '0', 10);
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
          localStorage.removeItem('bankResendCooldownExpiresAt');
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
          localStorage.removeItem('bankIsLocked');
          localStorage.removeItem('bankLockTime');
          localStorage.removeItem('bankOtpAttempts');
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

  // ========================================================
  // DERIVED STATE
  // ========================================================

  const isLocked = lockExpiresAt > 0 && lockTimeLeft > 0;
  const isOtpExpired = otpExpiresAt > 0 && timeLeft <= 0;

  // ========================================================
  // OTP
  // ========================================================

  const [otp, setOtp] = useState(() => localStorage.getItem('bankOtpInput') || '');

  // ========================================================
  // LOADING
  // ========================================================

  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingSendOtp, setLoadingSendOtp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  // ========================================================
  // BACK CONFIRM
  // ========================================================

  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // ========================================================
  // MODAL
  // ========================================================

  const [modalConfig, setModalConfig] = useState({
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

  const formatTime = useCallback(seconds => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // ========================================================
  // RESET OTP INPUT
  // ========================================================

  const resetOtpInput = useCallback(() => {
    setOtp('');
    localStorage.setItem('bankOtpInput', '');
    if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
  }, []);

  // ========================================================
  // CLOSE MODAL
  // ========================================================

  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, show: false }));
    hasShownModalRef.current = false;
  }, []);

  // ========================================================
  // OPEN MODAL
  // ========================================================

  const openModal = useCallback((type, title, message, onConfirmCustom = null, onCancelCustom = null) => {
    if (isModalOpenRef.current || hasShownModalRef.current) return;
    hasShownModalRef.current = true;
    setModalConfig({
      show: true,
      type,
      title,
      message,
      onConfirm: onConfirmCustom || closeModal,
      onCancel: onCancelCustom || closeModal,
    });
  }, [closeModal]);

  // ========================================================
  // TRACK MODAL
  // ========================================================

  useEffect(() => {
    isModalOpenRef.current = modalConfig.show;
  }, [modalConfig.show]);

  // ========================================================
  // FETCH REDIS TTL
  // ========================================================

  const fetchTimeFromRedis = useCallback(async () => {
    if (!tempBookingId) return null;
    try {
      const response = await api.get(`/api/bank/check-ttl/${tempBookingId}`);
      if (response.data?.success) {
        const expiresIn = Number(response.data?.data?.expiresIn || 0);
        const isExpired = Boolean(response.data?.data?.isExpired);
        if (!isExpired && expiresIn > 0) return expiresIn;
        return 0;
      }
      return null;
    } catch (error) {
      console.error('❌ [BANK APP] Lỗi lấy TTL Redis:', error);
      return null;
    }
  }, [tempBookingId]);

  // ========================================================
  // SYNC TIMER WITH REDIS
  // ========================================================

  const syncTimerWithRedis = useCallback(async () => {
    if (!tempBookingId) {
      setIsSyncing(false);
      return;
    }
    try {
      setIsSyncing(true);
      const redisTime = await fetchTimeFromRedis();
      if (redisTime !== null) {
        if (redisTime > 0) {
          const newExpiresAt = Date.now() + redisTime * 1000;
          setOtpExpiresAt(newExpiresAt);
          localStorage.setItem('bankOtpExpiresAt', String(newExpiresAt));
          otpExpiredRef.current = false;
        } else {
          setOtpExpiresAt(0);
          localStorage.setItem('bankOtpExpiresAt', '0');
          otpExpiredRef.current = true;
        }
        return;
      }
      // Fallback: đọc từ localStorage
      const saved = parseInt(localStorage.getItem('bankOtpExpiresAt') || '0', 10);
      if (saved > 0) {
        setOtpExpiresAt(saved);
      }
    } catch (error) {
      console.error('❌ [BANK APP] Lỗi đồng bộ timer:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [tempBookingId, fetchTimeFromRedis]);

  // ========================================================
  // RESET LOCK
  // ========================================================

  const resetLockState = useCallback(() => {
    setLockExpiresAt(0);
    isLockedRef.current = false;
    otpAttemptsRef.current = 0;
    localStorage.removeItem('bankIsLocked');
    localStorage.removeItem('bankLockTime');
    localStorage.removeItem('bankOtpAttempts');
  }, []);

  // ========================================================
  // LOCK ACCOUNT
  // ========================================================

  const lockAccount = useCallback((remainingSeconds = 300) => {
    const safeSeconds = Math.max(1, Number(remainingSeconds) || 300);
    const lockEndTime = Date.now() + safeSeconds * 1000;
    setLockExpiresAt(lockEndTime);
    isLockedRef.current = true;
    localStorage.setItem('bankIsLocked', 'true');
    localStorage.setItem('bankLockTime', String(lockEndTime));
    localStorage.setItem('bankOtpAttempts', String(otpAttemptsRef.current));
    openModal(
      'error',
      'OTP BỊ KHÓA',
      `Bạn đã nhập sai OTP quá ${OTP_MAX_ATTEMPTS} lần. Tài khoản đã bị khóa ${formatTime(safeSeconds)}. Vui lòng thử lại sau.`,
      closeModal
    );
  }, [closeModal, formatTime, openModal]);

  // ========================================================
  // CLEAR ALL BOOKING DATA
  // ========================================================

  const clearAllBookingData = useCallback(() => {
    const keysToRemove = [
      'bankHasSentOtp', 'bankHasVisited', 'bankOtpTimeLeft', 'bankOtpInput',
      'bankLastOtpSentAt', 'bankResendCooldown', 'bankResendCooldownExpiresAt',
      'paymentInitiated', 'paymentCompleted',
      'completedBookingId', 'holdExpiresAt', 'selectedSeats', 'currentShowtimeId',
      'selectedFoods', 'booking_temp', 'tempBookingId', 'bookingOwnerToken',
      'bankIsLocked', 'bankLockTime', 'bankOtpAttempts', 'bankOtpExpiresAt'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setOtpExpiresAt(0);
    setResendCooldownExpiresAt(0);
    setOtp('');
    resetLockState();
    hasSentOtp.current = false;
    hasVisitedBankApp.current = false;
    otpExpiredRef.current = false;
    paymentCompletedRef.current = true;
    isPaymentInitiated.current = false;
    hasShownModalRef.current = false;
    hasShownExpiredModalRef.current = false;
  }, [resetLockState]);

  // ========================================================
  // CANCEL TEMP BOOKING SERVER
  // ========================================================

  const cancelBookingOnServer = useCallback(async () => {
    if (!tempBookingId || isCancellingRef.current) return;
    isCancellingRef.current = true;
    try {
      await api.post('/api/bank/cancel-timeout', {
        tempBookingId,
        ownerToken: ownerToken || undefined,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('✅ [BANK APP] Temp booking cancelled');
    } catch (error) {
      console.error('❌ [BANK APP] Lỗi hủy temp booking:', error);
    } finally {
      isCancellingRef.current = false;
    }
  }, [tempBookingId, ownerToken]);

  // ========================================================
  // TIMER EXPIRED
  // ========================================================

  const handleTimeExpire = useCallback(async () => {
    if (paymentCompletedRef.current) return;
    await invalidateOTP();
    await cancelBookingOnServer();
    const keysToRemove = [
      'selectedSeats', 'holdExpiresAt', 'currentShowtimeId', 'booking_seats',
      'booking_showtime', 'booking_data', 'selected_foods', 'food_selection',
      'booking_cinema', 'booking_date', 'booking_movie', 'booking_showtime',
      'selectedFoods', 'booking_temp', 'bookingOwnerToken', 'tempBookingId',
      'lastSuccessTicket', 'paymentInitiated', 'bankOtpExpiresAt'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setOtpExpiresAt(0);
    setOtp('');
    otpExpiredRef.current = true;
    openModal(
      'error',
      'HẾT THỜI GIAN GIỮ GHẾ',
      'Thời gian giữ ghế hoặc thanh toán đã kết thúc. Vui lòng chọn lại ghế để tiếp tục.',
      () => {
        closeModal();
        safeNavigate('/');
      }
    );
  }, [cancelBookingOnServer, closeModal, openModal, invalidateOTP, safeNavigate]);

  // ========================================================
  // CLEAR + GO HOME
  // ========================================================

  const clearAllAndGoHome = async () => {
    setShowBackConfirm(false);
    await invalidateOTP();
    await cancelBookingOnServer();
    clearAllBookingData();
    safeNavigate('/');
  };

  // ========================================================
  // STAY
  // ========================================================

  const handleStay = () => {
    setShowBackConfirm(false);
  };

  // ========================================================
  // SAVE LOCAL STATE
  // ========================================================

  useEffect(() => {
    localStorage.setItem('bankOtpInput', otp);
  }, [otp]);

  // ========================================================
  // SEND OTP API
  // ========================================================

  const sendOtpApi = useCallback(async () => {
    if (!customerEmail || !tempBookingId) return false;
    setLoadingSendOtp(true);
    try {
      const response = await api.post('/api/bank/send-otp', {
        email: customerEmail,
        tempBookingId,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể gửi OTP.');
      }
      const now = Date.now();
      localStorage.setItem('bankLastOtpSentAt', String(now));
      hasSentOtp.current = true;
      hasVisitedBankApp.current = true;
      localStorage.setItem('bankHasSentOtp', 'true');
      localStorage.setItem('bankHasVisited', 'true');
      localStorage.setItem('paymentInitiated', 'true');
      isPaymentInitiated.current = true;
      otpAttemptsRef.current = 0;
      localStorage.setItem('bankOtpAttempts', '0');
      resetLockState();
      setOtp('');
      localStorage.setItem('bankOtpInput', '');

      // ✅ TÍNH MỐC TUYỆT ĐỐI
      const responseTTL = Number(response.data?.data?.expiresIn || 0);
      const serverTime = Number(response.data?.data?.serverTime || Date.now());
      const expiresAt = serverTime + (responseTTL * 1000);
      localStorage.setItem('bankOtpExpiresAt', String(expiresAt));
      setOtpExpiresAt(expiresAt);

      // ✅ RESEND COOLDOWN - MỐC TUYỆT ĐỐI
      const cooldownExpiresAt = Date.now() + RESEND_COOLDOWN * 1000;
      setResendCooldownExpiresAt(cooldownExpiresAt);
      localStorage.setItem('bankResendCooldownExpiresAt', String(cooldownExpiresAt));

      otpExpiredRef.current = false;
      hasShownExpiredModalRef.current = false;
      console.log('✅ [BANK APP] OTP đã được gửi');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
      openModal('error', 'LỖI GỬI OTP', message);
      return false;
    } finally {
      setLoadingSendOtp(false);
    }
  }, [customerEmail, tempBookingId, openModal, resetLockState]);

  // ========================================================
  // RESEND OTP
  // ========================================================

  const handleResendOtp = async () => {
    if (paymentCompletedRef.current) {
      openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công.');
      return;
    }
    if (isLockedRef.current || isLocked) {
      openModal('error', 'TÀI KHOẢN BỊ KHÓA', `Tài khoản đang bị khóa. Vui lòng thử lại sau ${formatTime(lockTimeLeft)}.`);
      return;
    }
    if (resendCooldown > 0) {
      openModal('info', 'THÔNG BÁO', `Vui lòng đợi ${formatTime(resendCooldown)} trước khi gửi lại OTP.`);
      return;
    }
    if (!customerEmail || !tempBookingId) {
      openModal('error', 'THIẾU THÔNG TIN', 'Không tìm thấy thông tin thanh toán.');
      return;
    }
    setLoadingSendOtp(true);
    try {
      const response = await api.post('/api/bank/resend-otp', {
        email: customerEmail,
        tempBookingId,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể gửi lại OTP.');
      }
      const now = Date.now();
      localStorage.setItem('bankLastOtpSentAt', String(now));
      hasSentOtp.current = true;
      hasVisitedBankApp.current = true;
      localStorage.setItem('bankHasSentOtp', 'true');
      localStorage.setItem('bankHasVisited', 'true');
      localStorage.setItem('paymentInitiated', 'true');
      isPaymentInitiated.current = true;
      otpAttemptsRef.current = 0;
      localStorage.setItem('bankOtpAttempts', '0');
      resetLockState();

      resetOtpInput();

      // ✅ TÍNH MỐC TUYỆT ĐỐI
      const responseTTL = Number(response.data?.data?.expiresIn || 0);
      const serverTime = Number(response.data?.data?.serverTime || Date.now());
      const expiresAt = serverTime + (responseTTL * 1000);
      localStorage.setItem('bankOtpExpiresAt', String(expiresAt));
      setOtpExpiresAt(expiresAt);

      // ✅ RESEND COOLDOWN - MỐC TUYỆT ĐỐI
      const cooldownExpiresAt = Date.now() + RESEND_COOLDOWN * 1000;
      setResendCooldownExpiresAt(cooldownExpiresAt);
      localStorage.setItem('bankResendCooldownExpiresAt', String(cooldownExpiresAt));

      otpExpiredRef.current = false;
      hasShownExpiredModalRef.current = false;
      openModal('success', 'THÀNH CÔNG', 'Mã OTP mới đã được gửi tới email của bạn.');
    } catch (error) {
      const errorData = error.response?.data || {};
      const message = errorData.message || 'Không thể gửi lại mã OTP.';
      if (error.response?.status === 429) {
        const remaining = Number(errorData?.data?.remainingSeconds || errorData?.remainingSeconds || 60);
        const cooldownExpiresAt = Date.now() + remaining * 1000;
        setResendCooldownExpiresAt(cooldownExpiresAt);
        localStorage.setItem('bankResendCooldownExpiresAt', String(cooldownExpiresAt));
        openModal(
          'warning',
          'VUI LÒNG CHỜ',
          `Bạn vừa gửi OTP. Vui lòng đợi ${formatTime(remaining)} trước khi gửi lại.`,
          closeModal
        );
        return;
      }
      openModal('error', 'LỖI GỬI OTP', message);
    } finally {
      setLoadingSendOtp(false);
    }
  };

  // ========================================================
  // ✅ INITIALIZE BANK APP
  // ========================================================

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      if (paymentCompletedRef.current) return;
      if (!customerEmail || !tempBookingId) return;

      await syncTimerWithRedis();
      if (cancelled) return;

      const hasOtp = Boolean(localStorage.getItem('bankOtpInput'));
      const hasSent = localStorage.getItem('bankHasSentOtp') === 'true';
      if (hasOtp || hasSent) return;

      const initiated = localStorage.getItem('paymentInitiated') === 'true' || isPaymentInitiated.current;

      if (initiated) {
        console.log('✅ [BANK APP] OTP đã được gửi từ Payment, không gửi lại');

        hasSentOtp.current = true;
        hasVisitedBankApp.current = true;
        localStorage.setItem('bankHasSentOtp', 'true');
        localStorage.setItem('bankHasVisited', 'true');

        // ✅ Resend cooldown - set mốc tuyệt đối
        if (!localStorage.getItem('bankResendCooldownExpiresAt')) {
          const cooldownExpiresAt = Date.now() + RESEND_COOLDOWN * 1000;
          setResendCooldownExpiresAt(cooldownExpiresAt);
          localStorage.setItem('bankResendCooldownExpiresAt', String(cooldownExpiresAt));
        }

        return;
      }

      if (!isFirstLoad.current) {
        openModal(
          'error',
          'TRUY CẬP KHÔNG HỢP LỆ',
          'Vui lòng bắt đầu thanh toán từ trang Payment.',
          () => {
            closeModal();
            navigate('/payment', { state: bookingData });
          }
        );
      }
    };

    const timer = setTimeout(initialize, 100);
    isFirstLoad.current = false;
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerEmail, tempBookingId, syncTimerWithRedis, navigate, closeModal, openModal, bookingData]);

  // ========================================================
  // ✅ AUTO SHOW MODAL KHI OTP HẾT HẠN (CHỈ 1 LẦN)
  // ========================================================

  useEffect(() => {
    if (
      !paymentCompletedRef.current &&
      !isLocked &&
      (otpExpiredRef.current || timeLeft <= 0) &&
      (hasSentOtp.current || localStorage.getItem('bankHasSentOtp') === 'true') &&
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

  // ========================================================
  // REDIS TIMER SYNC (Định kỳ)
  // ========================================================

  useEffect(() => {
    if (!tempBookingId || paymentCompletedRef.current) return;
    redisSyncIntervalRef.current = setInterval(async () => {
      const redisTime = await fetchTimeFromRedis();
      if (redisTime === null) return;
      if (redisTime <= 0) {
        setOtpExpiresAt(0);
        otpExpiredRef.current = true;
        return;
      }
      // Cập nhật lại mốc tuyệt đối từ Redis
      const newExpiresAt = Date.now() + redisTime * 1000;
      setOtpExpiresAt(newExpiresAt);
      localStorage.setItem('bankOtpExpiresAt', String(newExpiresAt));
    }, 30000);
    return () => {
      if (redisSyncIntervalRef.current) {
        clearInterval(redisSyncIntervalRef.current);
        redisSyncIntervalRef.current = null;
      }
    };
  }, [tempBookingId, fetchTimeFromRedis]);

  // ========================================================
  // PAYMENT COMPLETED CHECK
  // ========================================================

  useEffect(() => {
    const completed = localStorage.getItem('paymentCompleted');
    const completedId = localStorage.getItem('completedBookingId');
    if (completed === 'true' && completedId && String(completedId) === String(tempBookingId)) {
      paymentCompletedRef.current = true;
      openModal(
        'success',
        'THANH TOÁN THÀNH CÔNG',
        'Bạn đã thanh toán thành công! Vui lòng quay lại trang xác nhận.',
        () => {
          closeModal();
          safeNavigate('/confirm-success', { state: bookingData });
        }
      );
    }
  }, [tempBookingId, closeModal, openModal, safeNavigate, bookingData]);

  // ========================================================
  // CHECK BOOKING DATA
  // ========================================================

  useEffect(() => {
    if (tempBookingId && customerEmail) return;
    const hasSavedData = localStorage.getItem('lastSuccessTicket') || localStorage.getItem('booking_temp');
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
  }, [tempBookingId, customerEmail, closeModal, openModal, safeNavigate]);

  // ========================================================
  // BEFORE UNLOAD
  // ========================================================

  useEffect(() => {
    const handleBeforeUnload = event => {
      if (paymentCompletedRef.current) return;
      if (timeLeft > 0 && otp.length > 0) {
        event.preventDefault();
        event.returnValue = 'Bạn đang nhập OTP. Nếu rời trang, bạn có thể mất tiến trình thanh toán!';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timeLeft, otp]);

  // ========================================================
  // CLEANUP
  // ========================================================

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (redisSyncIntervalRef.current) clearInterval(redisSyncIntervalRef.current);
      if (autoNavigateRef.current) clearTimeout(autoNavigateRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  // ========================================================
  // VERIFY OTP
  // ========================================================

  const handleVerifyPayment = async () => {
    if (paymentCompletedRef.current) {
      openModal('info', 'THÔNG BÁO', 'Mã OTP này đã được thanh toán thành công trước đó.');
      return;
    }
    if (isLockedRef.current || isLocked) {
      openModal('error', 'TÀI KHOẢN BỊ KHÓA', `Tài khoản đang bị khóa. Vui lòng thử lại sau ${formatTime(lockTimeLeft)}.`);
      return;
    }
    if (otpExpiredRef.current || timeLeft <= 0) {
      openModal('warning', 'OTP HẾT HẠN', 'Mã OTP đã hết hạn. Vui lòng gửi lại OTP nếu bạn chưa thanh toán.');
      return;
    }
    if (otp.length !== 6) {
      openModal('error', 'THÔNG BÁO', 'Vui lòng nhập đủ 6 số OTP.');
      return;
    }
    if (!customerEmail || !tempBookingId) {
      openModal('error', 'THIẾU THÔNG TIN', 'Không tìm thấy thông tin thanh toán.');
      return;
    }

    setLoadingVerify(true);
    try {
      const payload = {
        email: customerEmail,
        otp,
        tempBookingId,
        full_name: customerName,
        phone: customerPhone,
        ownerToken: ownerToken || undefined,
      };
      const response = await api.post('/api/bank/verify-otp', payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.data?.success) {
        otpAttemptsRef.current = 0;
        localStorage.setItem('bankOtpAttempts', '0');
        resetLockState();
        const realBookingId = response.data?.data?.bookingId || tempBookingId;
        localStorage.setItem('paymentCompleted', 'true');
        localStorage.setItem('completedBookingId', String(realBookingId));
        paymentCompletedRef.current = true;
        clearAllBookingData();
        openModal(
          'success',
          'THANH TOÁN THÀNH CÔNG',
          'Cảm ơn bạn đã đặt vé! Vui lòng kiểm tra email để nhận vé.',
          () => {
            closeModal();
            safeNavigate('/confirm-success', { state: bookingData });
          }
        );
        autoNavigateRef.current = setTimeout(() => {
          if (isModalOpenRef.current) {
            closeModal();
            safeNavigate('/confirm-success', { state: bookingData });
          }
        }, 3000);
        return;
      }
      const errorData = response.data?.data || {};
      const remainingAttempts = errorData?.remainingAttempts;
      const message = response.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.';

      if (!(response.data?.code === 'OTP_LOCKED' || response.data?.code === 'ACCOUNT_LOCKED' ||
          message.toLowerCase().includes('khóa') || remainingAttempts === 0)) {
        resetOtpInput();
      }

      if (response.data?.code === 'OTP_LOCKED' || response.data?.code === 'ACCOUNT_LOCKED' ||
          message.toLowerCase().includes('khóa') || remainingAttempts === 0) {
        const lockDuration = Number(errorData?.remainingSeconds || errorData?.lockDuration || 300);
        lockAccount(lockDuration);
        return;
      }
      if (typeof remainingAttempts === 'number' && remainingAttempts > 0) {
        otpAttemptsRef.current = Math.max(0, OTP_MAX_ATTEMPTS - remainingAttempts);
        localStorage.setItem('bankOtpAttempts', String(otpAttemptsRef.current));
        openModal('error', 'THẤT BẠI', `${message} Còn ${remainingAttempts} lần thử.`);
        return;
      }
      openModal('error', 'THẤT BẠI', message);
    } catch (error) {
      console.error('❌ [BANK APP] Verify OTP Error:', error);
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || 'Mã OTP không đúng hoặc đã hết hạn.';

      if (!(error.response?.status === 429 || errorData.code === 'OTP_LOCKED' ||
          errorData.code === 'ACCOUNT_LOCKED' || errorMessage.toLowerCase().includes('khóa'))) {
        resetOtpInput();
      }

      if (error.response?.status === 429 || errorData.code === 'OTP_LOCKED' ||
          errorData.code === 'ACCOUNT_LOCKED' || errorMessage.toLowerCase().includes('khóa')) {
        const lockDuration = Number(errorData?.data?.remainingSeconds || errorData?.data?.lockDuration || 300);
        lockAccount(lockDuration);
        return;
      }
      const remainingAttempts = errorData?.data?.remainingAttempts;
      if (typeof remainingAttempts === 'number' && remainingAttempts > 0) {
        otpAttemptsRef.current = Math.max(0, OTP_MAX_ATTEMPTS - remainingAttempts);
        localStorage.setItem('bankOtpAttempts', String(otpAttemptsRef.current));
        openModal('error', 'THẤT BẠI', `${errorMessage} Còn ${remainingAttempts} lần thử.`);
        return;
      }
      openModal('error', 'THẤT BẠI', errorMessage);
    } finally {
      setLoadingVerify(false);
    }
  };

  // ========================================================
  // OTP INPUT CHANGE
  // ========================================================

  const handleOtpChange = (event, index) => {
    if (isLocked || otpExpiredRef.current) return;
    const value = event.target.value.replace(/\D/g, '').slice(0, 1);
    const current = otp.padEnd(6, '').split('');
    current[index] = value;
    const newOtp = current.join('').slice(0, 6);
    setOtp(newOtp);
    if (value && index < 5) {
      const next = otpInputsRef.current[index + 1];
      if (next) next.focus();
    }
  };

  // ========================================================
  // OTP KEY DOWN
  // ========================================================

  const handleOtpKeyDown = (event, index) => {
    if (event.key === 'Backspace') {
      if (otp[index]) {
        const current = otp.padEnd(6, '').split('');
        current[index] = '';
        setOtp(current.join(''));
        return;
      }
      if (index > 0) {
        const previous = otpInputsRef.current[index - 1];
        if (previous) previous.focus();
        const current = otp.padEnd(6, '').split('');
        current[index - 1] = '';
        setOtp(current.join(''));
      }
    }
  };

  // ========================================================
  // OTP PASTE
  // ========================================================

  const handleOtpPaste = event => {
    event.preventDefault();
    if (isLocked || otpExpiredRef.current) return;
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    setOtp(pasted.padEnd(6, ''));
    const focusIndex = Math.min(pasted.length, 5);
    const input = otpInputsRef.current[focusIndex];
    if (input) input.focus();
  };

  // ========================================================
  // TIMER BOX CLASS
  // ========================================================

  const getTimerBoxClass = () => {
    if (isLocked) return 'bank-timer-box locked';
    if (otpExpiredRef.current || timeLeft <= 0) return 'bank-timer-box expired';
    return 'bank-timer-box';
  };

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <div className="bank-checkout-page">
      <main className="bank-checkout-container">
        <div className="bank-sidebar-wrapper">
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
          />
        </div>

        <div className="bank-otp-section">
          <div className="otp-card">
            <div className="bank-qr-mini-wrapper">
              <img
                src="https://api.quangdungcinema.id.vn/uploads/Bank/Qr_nganhang.jpg"
                alt="QR thanh toán ngân hàng"
                className="bank-qr-mini"
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
                  autoComplete="one-time-code"
                  className="otp-circle"
                  maxLength={1}
                  value={otp[index] || ''}
                  onChange={event => handleOtpChange(event, index)}
                  onKeyDown={event => handleOtpKeyDown(event, index)}
                  onPaste={handleOtpPaste}
                  disabled={paymentCompletedRef.current || isLocked || otpExpiredRef.current || loadingVerify}
                  autoFocus={index === 0 && !isLocked && !otpExpiredRef.current}
                  ref={element => { otpInputsRef.current[index] = element; }}
                />
              ))}
            </div>

            <div className={getTimerBoxClass()}>
              {isLocked ? (
                <span className="timer-text">🔒 Tài khoản bị khóa: {formatTime(lockTimeLeft)}</span>
              ) : otpExpiredRef.current || timeLeft <= 0 ? (
                <span className="timer-text">⏰ OTP đã hết hạn</span>
              ) : (
                <>
                  <span className="timer-label">OTP hết hạn sau:</span>
                  <span className="timer-value">{formatTime(timeLeft)}</span>
                </>
              )}
            </div>

            <div className="bank-resend-wrapper">
              <button
                type="button"
                className="btn-resend-otp"
                onClick={handleResendOtp}
                disabled={loadingSendOtp || loadingVerify || paymentCompletedRef.current || resendCooldown > 0 || isLocked}
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
              disabled={loadingVerify || loadingSendOtp || paymentCompletedRef.current || isLocked ||
                otpExpiredRef.current || timeLeft <= 0 || otp.length !== 6}
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

export default BankApp;