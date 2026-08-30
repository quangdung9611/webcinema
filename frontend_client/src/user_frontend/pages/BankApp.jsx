import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import api from '../../api/api';

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

import '../styles/BankApp.css';

const BankApp = () => {
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
        localStorage.getItem('tempBookingId') ||
        bookingData.tempBookingId ||
        ''
    );

    const customerEmail = bookingData.customerEmail || localStorage.getItem('customerEmail') || '';
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

    // =========================
    // REFS
    // =========================
    const hasSentOtp = useRef(localStorage.getItem('bankHasSentOtp') === 'true');
    const hasVisitedBankApp = useRef(localStorage.getItem('bankHasVisited') === 'true');
    const redirectTimeoutRef = useRef(null);
    const autoNavigateRef = useRef(null);
    const isModalOpenRef = useRef(false);
    const isFirstLoad = useRef(true);
    const paymentCompletedRef = useRef(false);
    const isPaymentInitiated = useRef(localStorage.getItem('paymentInitiated') === 'true');
    const isCancellingRef = useRef(false);
    const otpInputsRef = useRef([]);
    const hasShownModalRef = useRef(false);
    const timerCheckRef = useRef(null);
    const isTimerSyncedRef = useRef(false);

    // =========================
    // STATES
    // =========================
    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = localStorage.getItem('bankOtpTimeLeft');
        return saved ? parseInt(saved, 10) : 300;
    });

    const [otp, setOtp] = useState(() => localStorage.getItem('bankOtpInput') || '');
    const [loadingVerify, setLoadingVerify] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true);
    const [resendCooldown, setResendCooldown] = useState(0);

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
    
    // Lấy thời gian còn lại từ Redis
    const fetchTimeFromRedis = async () => {
        if (!tempBookingId) return null;
        
        try {
            const response = await api.get(`/api/bank/check-ttl/${tempBookingId}`);
            if (response.data.success) {
                const { expiresIn, isExpired } = response.data.data;
                if (!isExpired && expiresIn > 0) {
                    return expiresIn;
                }
                return 0;
            }
            return null;
        } catch (error) {
            console.error('❌ Lỗi lấy TTL từ Redis:', error);
            return null;
        }
    };

    // Đồng bộ timer với Redis
    const syncTimerWithRedis = async () => {
        if (isTimerSyncedRef.current) return;
        
        setIsSyncing(true);
        try {
            const redisTime = await fetchTimeFromRedis();
            
            if (redisTime !== null) {
                if (redisTime > 0) {
                    setTimeLeft(redisTime);
                    localStorage.setItem('bankOtpTimeLeft', String(redisTime));
                    isTimerSyncedRef.current = true;
                    console.log(`✅ Đồng bộ timer với Redis: ${redisTime}s`);
                } else {
                    handleTimeout();
                }
            } else {
                const saved = localStorage.getItem('bankOtpTimeLeft');
                if (saved) {
                    const time = parseInt(saved, 10);
                    if (time > 0) {
                        setTimeLeft(time);
                    }
                }
                console.log('⚠️ Không lấy được TTL từ Redis, sử dụng localStorage');
            }
        } catch (error) {
            console.error('❌ Lỗi đồng bộ timer:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // =========================
    // BLOCKER
    // =========================
    const shouldBlock = useCallback(() => {
        if (paymentCompletedRef.current) return false;
        if (!otp && timeLeft <= 0) return false;
        return location.pathname === '/bank-app';
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
    useEffect(() => {
        localStorage.setItem('bankOtpTimeLeft', String(timeLeft));
    }, [timeLeft]);

    useEffect(() => {
        localStorage.setItem('bankOtpInput', otp);
    }, [otp]);

    // =========================
    // CALL API CANCEL BOOKING
    // =========================
    const cancelBookingOnServer = async () => {
        if (isCancellingRef.current) return;
        isCancellingRef.current = true;
        try {
            await api.post('/api/bank/cancel-timeout', {
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
        const completed = localStorage.getItem('paymentCompleted');
        const completedId = localStorage.getItem('completedBookingId');

        if (completed === 'true' && completedId === tempBookingId) {
            paymentCompletedRef.current = true;
            hasSentOtp.current = true;
            localStorage.removeItem('bankOtpTimeLeft');
            localStorage.removeItem('bankOtpInput');
            localStorage.removeItem('bankHasSentOtp');
            localStorage.removeItem('bankHasVisited');
            localStorage.removeItem('bankLastOtpSentAt');
            localStorage.removeItem('paymentInitiated');

            if (!modalConfig.show && !hasShownModalRef.current) {
                openModal(
                    'info',
                    'THÔNG BÁO',
                    'Bạn đã thanh toán thành công! Vui lòng quay lại trang chủ.',
                    () => {
                        localStorage.removeItem('paymentCompleted');
                        localStorage.removeItem('completedBookingId');
                        closeModal();
                        navigate('/');
                    }
                );
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
            const hasSavedData = localStorage.getItem('lastSuccessTicket') || localStorage.getItem('booking_temp');
            
            if (!hasSavedData && !isFirstLoad.current) {
                openModal(
                    'error',
                    'THIẾU THÔNG TIN',
                    `Không tìm thấy thông tin đặt vé. Vui lòng đặt lại.`,
                    () => {
                        closeModal();
                        navigate('/');
                    }
                );
            }
        }
        
        isFirstLoad.current = false;
    }, [tempBookingId, customerEmail, navigate]);

    // =========================
    // TRACK MODAL STATE
    // =========================
    useEffect(() => {
        isModalOpenRef.current = modalConfig.show;
    }, [modalConfig.show]);

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
    // HANDLE TIMEOUT
    // =========================
    const handleTimeout = async () => {
        await cancelBookingOnServer();
        
        const keysToRemove = [
            'bankHasSentOtp',
            'bankHasVisited',
            'bankOtpTimeLeft',
            'bankOtpInput',
            'bankLastOtpSentAt',
            'paymentInitiated',
            'paymentCompleted',
            'completedBookingId',
            'holdExpiresAt',
            'selectedSeats',
            'currentShowtimeId',
            'lastSuccessTicket',
            'tempBookingId',
            'selectedFoods',
            'booking_temp'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        setShowBackConfirm(false);
        hasShownModalRef.current = false;
        isTimerSyncedRef.current = false;

        if (blocker.state === 'blocked') {
            blocker.proceed();
        }
        navigate('/');
    };

    // =========================
    // CLEAR ALL & GO HOME
    // =========================
    const clearAllAndGoHome = async () => {
        await cancelBookingOnServer();

        const keysToRemove = [
            'bankHasSentOtp',
            'bankHasVisited',
            'bankOtpTimeLeft',
            'bankOtpInput',
            'bankLastOtpSentAt',
            'paymentInitiated',
            'paymentCompleted',
            'completedBookingId',
            'holdExpiresAt',
            'selectedSeats',
            'currentShowtimeId',
            'lastSuccessTicket',
            'tempBookingId',
            'selectedFoods',
            'booking_temp'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        setShowBackConfirm(false);
        hasShownModalRef.current = false;
        isTimerSyncedRef.current = false;

        if (blocker.state === 'blocked') {
            blocker.proceed();
        }
        navigate('/');
    };

    // =========================
    // XỬ LÝ KHI BẤM "Ở LẠI"
    // =========================
    const handleStay = () => {
        setShowBackConfirm(false);
        if (blocker.state === 'blocked') {
            blocker.reset();
        }
    };

    // =========================
    // SEND OTP API (Lần đầu)
    // =========================
    const sendOtpApi = async () => {
        setLoadingSendOtp(true);
        try {
            const payload = {
                email: customerEmail,
                tempBookingId: tempBookingId
            };
            console.log('📤 [BankApp] sendOtp payload:', JSON.stringify(payload));

            const response = await api.post('/api/bank/send-otp', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('✅ [BankApp] sendOtp response:', response.data);

            const now = Date.now();
            localStorage.setItem('bankLastOtpSentAt', String(now));
            hasSentOtp.current = true;
            hasVisitedBankApp.current = true;
            localStorage.setItem('bankHasSentOtp', 'true');
            localStorage.setItem('bankHasVisited', 'true');
            localStorage.removeItem('paymentInitiated');
            
            // Sau khi gửi OTP, đồng bộ timer với Redis
            const redisTime = await fetchTimeFromRedis();
            if (redisTime !== null && redisTime > 0) {
                setTimeLeft(redisTime);
                localStorage.setItem('bankOtpTimeLeft', String(redisTime));
                isTimerSyncedRef.current = true;
            } else {
                setTimeLeft(300);
                localStorage.setItem('bankOtpTimeLeft', '300');
            }

            // Bắt đầu cooldown 60s
            setResendCooldown(60);

            return true;
        } catch (err) {
            console.error('❌ [BankApp] sendOtp error:', err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
            
            if (!isFirstLoad.current) {
                openModal('error', 'LỖI GỬI OTP', errorMsg);
            }
            return false;
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // 🆕 RESEND OTP API (Gửi lại)
    // =========================
    const handleResendOtp = async () => {
        if (resendCooldown > 0) {
            openModal('info', 'THÔNG BÁO', `Vui lòng đợi ${resendCooldown} giây trước khi gửi lại.`);
            return;
        }

        if (paymentCompletedRef.current) {
            openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công!');
            return;
        }

        setLoadingSendOtp(true);
        try {
            const payload = {
                email: customerEmail,
                tempBookingId: tempBookingId
            };
            console.log('📤 [BankApp] resendOtp payload:', JSON.stringify(payload));

            const response = await api.post('/api/bank/resend-otp', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('✅ [BankApp] resendOtp response:', response.data);

            if (response.data.success) {
                const now = Date.now();
                localStorage.setItem('bankLastOtpSentAt', String(now));
                hasSentOtp.current = true;
                hasVisitedBankApp.current = true;
                localStorage.setItem('bankHasSentOtp', 'true');
                localStorage.setItem('bankHasVisited', 'true');

                // Cập nhật timer từ response
                if (response.data.data?.expiresIn) {
                    setTimeLeft(response.data.data.expiresIn);
                    localStorage.setItem('bankOtpTimeLeft', String(response.data.data.expiresIn));
                    isTimerSyncedRef.current = true;
                } else {
                    // Fallback: lấy từ Redis
                    const redisTime = await fetchTimeFromRedis();
                    if (redisTime !== null && redisTime > 0) {
                        setTimeLeft(redisTime);
                        localStorage.setItem('bankOtpTimeLeft', String(redisTime));
                        isTimerSyncedRef.current = true;
                    }
                }

                // Bắt đầu cooldown 60s
                setResendCooldown(60);

                openModal('success', 'THÀNH CÔNG', 'Mã OTP đã được gửi lại tới email của bạn.');
            }
        } catch (err) {
            console.error('❌ [BankApp] resendOtp error:', err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.';
            
            if (err.response?.status === 429) {
                const remainingSeconds = err.response?.data?.data?.remainingSeconds || 60;
                openModal('error', 'QUÁ NHIỀU YÊU CẦU', `Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ${remainingSeconds} giây.`);
            } else {
                openModal('error', 'LỖI GỬI OTP', errorMsg);
            }
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // Cooldown timer cho resend
    // =========================
    useEffect(() => {
        if (resendCooldown <= 0) return;

        const timer = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [resendCooldown]);

    // =========================
    // TRIGGER SEND OTP - ĐỒNG BỘ VỚI REDIS
    // =========================
    useEffect(() => {
        const initializeBankApp = async () => {
            if (paymentCompletedRef.current) return;
            if (!customerEmail || !tempBookingId) return;

            // Đồng bộ timer với Redis trước
            await syncTimerWithRedis();

            if (!isPaymentInitiated.current) {
                if (!modalConfig.show && !hasShownModalRef.current && !isFirstLoad.current) {
                    openModal(
                        'error',
                        'TRUY CẬP KHÔNG HỢP LỆ',
                        'Vui lòng thanh toán từ trang chủ để nhận OTP.',
                        () => {
                            closeModal();
                            navigate('/payment', { state: bookingData });
                        }
                    );
                }
                return;
            }

            // Nếu đã gửi OTP trước đó, kiểm tra thời gian còn lại
            if (hasSentOtp.current || hasVisitedBankApp.current) {
                const lastSentAt = localStorage.getItem('bankLastOtpSentAt');
                if (lastSentAt) {
                    const elapsed = (Date.now() - parseInt(lastSentAt)) / 1000;
                    if (elapsed < 300) {
                        return;
                    }
                }
                
                if (!modalConfig.show && !hasShownModalRef.current && !isFirstLoad.current) {
                    openModal(
                        'info',
                        'THÔNG BÁO',
                        'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã.'
                    );
                }
                return;
            }

            await sendOtpApi();
        };

        const timer = setTimeout(() => {
            initializeBankApp();
        }, 500);

        return () => clearTimeout(timer);
    }, [customerEmail, tempBookingId]);

    // =========================
    // TIMER - CHẠY ĐỒNG BỘ VỚI REDIS
    // =========================
    useEffect(() => {
        if (paymentCompletedRef.current) return;

        if (isTimerSyncedRef.current && timeLeft > 0) {
            timerCheckRef.current = setInterval(async () => {
                const redisTime = await fetchTimeFromRedis();
                if (redisTime !== null && redisTime > 0) {
                    if (Math.abs(redisTime - timeLeft) > 5) {
                        console.log(`🔄 Đồng bộ lại timer: client=${timeLeft}s, redis=${redisTime}s`);
                        setTimeLeft(redisTime);
                        localStorage.setItem('bankOtpTimeLeft', String(redisTime));
                    }
                } else if (redisTime === 0) {
                    handleTimeout();
                }
            }, 30000);
        }

        if (timeLeft <= 0) {
            const timeoutId = setTimeout(() => {
                handleTimeout();
            }, 1500);

            return () => clearTimeout(timeoutId);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            if (timerCheckRef.current) clearInterval(timerCheckRef.current);
        };
    }, [timeLeft, tempBookingId, customerEmail, navigate, isTimerSyncedRef.current]);

    // =========================
    // VERIFY OTP
    // =========================
    const handleVerifyPayment = async () => {
        if (paymentCompletedRef.current) {
            openModal('info', 'THÔNG BÁO', 'Bạn đã thanh toán thành công!');
            return;
        }

        if (otp.length < 6) {
            openModal('error', 'THÔNG BÁO', 'Vui lòng nhập đủ 6 số OTP');
            return;
        }

        setLoadingVerify(true);
        try {
            const payload = {
                email: customerEmail,
                otp,
                tempBookingId: tempBookingId,
                full_name: customerName,
                phone: customerPhone
            };
            console.log('📤 [BankApp] verify payload:', JSON.stringify(payload));

            const res = await api.post('/api/bank/verify-otp', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('✅ [BankApp] verify response:', res.data);

            if (res.data.success) {
                const realBookingId = res.data.data?.bookingId || tempBookingId;
                localStorage.setItem('paymentCompleted', 'true');
                localStorage.setItem('completedBookingId', String(realBookingId));
                paymentCompletedRef.current = true;
                
                const keysToRemove = [
                    'bankOtpTimeLeft',
                    'bankOtpInput',
                    'bankHasSentOtp',
                    'bankHasVisited',
                    'bankLastOtpSentAt',
                    'paymentInitiated',
                    'holdExpiresAt',
                    'selectedSeats',
                    'currentShowtimeId'
                ];

                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                });
                
                isTimerSyncedRef.current = false;

                openModal(
                    'success',
                    'THANH TOÁN THÀNH CÔNG',
                    'Cảm ơn bạn đã đặt vé! Vui lòng kiểm tra email để nhận vé.',
                    () => {
                        if (autoNavigateRef.current) clearTimeout(autoNavigateRef.current);
                        closeModal();
                        navigate('/confirm-success', { state: bookingData });
                    }
                );

                autoNavigateRef.current = setTimeout(() => {
                    if (isModalOpenRef.current) {
                        closeModal();
                        navigate('/confirm-success', { state: bookingData });
                    }
                    autoNavigateRef.current = null;
                }, 3000);
            } else {
                const errorCode = res.data.code;
                if (errorCode === 'OTP_LOCKED' || (res.data.message && res.data.message.includes('khóa'))) {
                    openModal(
                        'error',
                        'OTP BỊ KHÓA',
                        'Bạn đã nhập sai OTP quá nhiều lần. Toàn bộ thông tin đặt vé sẽ bị xóa.',
                        async () => {
                            closeModal();
                            await clearAllAndGoHome();
                        }
                    );
                } else {
                    openModal('error', 'THẤT BẠI', res.data.message || 'Mã OTP không đúng hoặc đã hết hạn!');
                }
            }
        } catch (err) {
            console.error('❌ [BankApp] verify error:', err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!';
            if (err.response?.status === 429 || errorMsg.includes('khóa') || errorMsg.includes('quá nhiều lần')) {
                openModal(
                    'error',
                    'OTP BỊ KHÓA',
                    'Bạn đã nhập sai OTP quá nhiều lần. Toàn bộ thông tin đặt vé sẽ bị xóa.',
                    async () => {
                        closeModal();
                        await clearAllAndGoHome();
                    }
                );
            } else {
                openModal('error', 'THẤT BẠI', errorMsg);
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
                if (nextInput) {
                    nextInput.focus();
                }
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
            if (lastInput) {
                lastInput.focus();
            }
        }
    };

    // =========================
    // FORMAT TIME
    // =========================
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    // =========================
    // RENDER
    // =========================
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

                <div className="bank-otp-section">
                    <div className="otp-card">
                        <div className="bank-qr-mini-wrapper">
                            <img
                                src="https://api.quangdungcinema.id.vn/uploads/Bank/Qr_nganhang.jpg"
                                alt="QR"
                                className="bank-qr-mini"
                            />
                            <div className="qr-scan-line"></div>
                        </div>

                        <h3 className="otp-title">NHẬP MÃ OTP</h3>
                        <p className="otp-sub">
                            Gửi đến: <strong>{customerEmail || 'Chưa có email'}</strong>
                        </p>

                        {/* OTP 6 ô tròn */}
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
                                    disabled={paymentCompletedRef.current}
                                    autoFocus={index === 0}
                                    ref={(el) => (otpInputsRef.current[index] = el)}
                                />
                            ))}
                        </div>

                        <div className="bank-timer-box">
                            OTP hết hạn sau:
                            <span>
                                {mins < 10 ? `0${mins}` : mins}:
                                {secs < 10 ? `0${secs}` : secs}
                            </span>
                        </div>

                        {/* ===== NÚT GỬI LẠI OTP ===== */}
                        <div className="bank-resend-wrapper">
                            <button
                                type="button"
                                className="btn-resend-otp"
                                onClick={handleResendOtp}
                                disabled={loadingSendOtp || paymentCompletedRef.current || resendCooldown > 0}
                            >
                                {loadingSendOtp ? (
                                    'Đang gửi...'
                                ) : resendCooldown > 0 ? (
                                    `Gửi lại sau ${resendCooldown}s`
                                ) : (
                                    '🔄 GỬI LẠI OTP'
                                )}
                            </button>
                        </div>

                        <LoadingButton
                            type="button"
                            loading={loadingVerify}
                            loadingText="Đang xác nhận..."
                            onClick={handleVerifyPayment}
                            disabled={loadingVerify || loadingSendOtp || paymentCompletedRef.current}
                            className="btn-confirm-payment"
                            spinnerColor="#ffffff"
                        >
                            XÁC NHẬN THANH TOÁN
                        </LoadingButton>
                    </div>
                </div>
            </main>

            {/* ===== MODAL THÔNG BÁO CHUNG ===== */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            {/* ===== MODAL XÁC NHẬN RỜI TRANG ===== */}
            <Modal
                show={showBackConfirm}
                type="warning"
                title="CẢNH BÁO"
                message="Bạn đang trong quá trình nhập OTP. Nếu thoát, toàn bộ thông tin đặt vé sẽ bị xóa! Bạn có chắc chắn muốn rời khỏi?"
                onConfirm={clearAllAndGoHome}
                onCancel={handleStay}
                confirmText="Xác nhận rời"
                cancelText="Ở lại"
            />
        </div>
    );
};

export default BankApp;