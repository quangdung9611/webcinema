import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import api from '../../api/api'; // ✅ Import api

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

import '../styles/BankApp.css';

const BankApp = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const bookingData =
        location.state ||
        JSON.parse(sessionStorage.getItem('lastSuccessTicket')) ||
        {};

    const {
        bookingId,
        customerEmail,
        totalAmount,
        movie,
        selectedCinema,
        selectedDate,
        selectedShowtime,
        selectedSeats,
        selectedFoods,
        foods,
        totalTicketPrice,
        totalFoodPrice,
        showtimeDetail
    } = bookingData;

    // =========================
    // REFS
    // =========================
    const hasSentOtp = useRef(sessionStorage.getItem('bankHasSentOtp') === 'true');
    const hasVisitedBankApp = useRef(sessionStorage.getItem('bankHasVisited') === 'true');
    const redirectTimeoutRef = useRef(null);
    const autoNavigateRef = useRef(null);
    const isModalOpenRef = useRef(false);
    const isFirstLoad = useRef(true);
    const paymentCompletedRef = useRef(false);
    const isPaymentInitiated = useRef(sessionStorage.getItem('paymentInitiated') === 'true');
    const isCancellingRef = useRef(false);

    // =========================
    // STATES
    // =========================
    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = sessionStorage.getItem('bankOtpTimeLeft');
        return saved ? parseInt(saved, 10) : 300;
    });

    const [otp, setOtp] = useState(() => sessionStorage.getItem('bankOtpInput') || '');
    const [loadingVerify, setLoadingVerify] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    // =========================
    // BLOCKER – chặn mọi navigate khi ở BankApp & chưa thanh toán
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
    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const openModal = (type, title, message, onConfirmCustom = null, onCancelCustom = null) => {
        if (modalConfig.show) return;
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
    // SAVE STATE TO SESSION
    // =========================
    useEffect(() => {
        sessionStorage.setItem('bankOtpTimeLeft', String(timeLeft));
    }, [timeLeft]);

    useEffect(() => {
        sessionStorage.setItem('bankOtpInput', otp);
    }, [otp]);

    // =========================
    // CALL API CANCEL BOOKING
    // =========================
    const cancelBookingOnServer = async () => {
        if (isCancellingRef.current) return;
        isCancellingRef.current = true;
        try {
            await api.post('/api/bank/cancel-timeout', {
                bookingId,
                email: customerEmail
            });
            console.log('✅ Booking cancelled on server');
        } catch (err) {
            console.error('❌ Lỗi hủy booking:', err);
        } finally {
            isCancellingRef.current = false;
        }
    };

    // =========================
    // CHECK PAYMENT COMPLETED
    // =========================
    useEffect(() => {
        const completed = sessionStorage.getItem('paymentCompleted');
        const completedId = sessionStorage.getItem('completedBookingId');

        if (completed === 'true' && completedId === String(bookingId)) {
            paymentCompletedRef.current = true;
            hasSentOtp.current = true;
            sessionStorage.removeItem('bankOtpTimeLeft');
            sessionStorage.removeItem('bankOtpInput');
            sessionStorage.removeItem('bankHasSentOtp');
            sessionStorage.removeItem('bankHasVisited');
            sessionStorage.removeItem('bankLastOtpSentAt');
            sessionStorage.removeItem('paymentInitiated');

            if (!modalConfig.show) {
                openModal(
                    'info',
                    'THÔNG BÁO',
                    'Bạn đã thanh toán thành công! Vui lòng quay lại trang chủ.',
                    () => {
                        sessionStorage.removeItem('paymentCompleted');
                        sessionStorage.removeItem('completedBookingId');
                        closeModal();
                        navigate('/');
                    }
                );
            }
        }
    }, [bookingId]);

    // =========================
    // BEFORE UNLOAD (đóng tab)
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
        if (!bookingId || !customerEmail) {
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
    }, [bookingId, customerEmail, navigate]);

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
        };
    }, []);

    // =========================
    // CLEAR ALL & GO HOME (có gọi API hủy + giải phóng blocker)
    // =========================
    const clearAllAndGoHome = async () => {
        await cancelBookingOnServer();

        sessionStorage.removeItem('bankHasSentOtp');
        sessionStorage.removeItem('bankHasVisited');
        sessionStorage.removeItem('bankOtpTimeLeft');
        sessionStorage.removeItem('bankOtpInput');
        sessionStorage.removeItem('bankLastOtpSentAt');
        sessionStorage.removeItem('paymentInitiated');
        sessionStorage.removeItem('paymentCompleted');
        sessionStorage.removeItem('completedBookingId');
        sessionStorage.removeItem('holdExpiresAt');
        sessionStorage.removeItem('selectedSeats');
        sessionStorage.removeItem('currentShowtimeId');
        sessionStorage.removeItem('lastSuccessTicket');
        setShowBackConfirm(false);

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
    // SEND OTP API
    // =========================
    const sendOtpApi = async () => {
        setLoadingSendOtp(true);
        try {
            await api.post('/api/bank/send-otp', {
                email: customerEmail,
                bookingId
            });
            const now = Date.now();
            sessionStorage.setItem('bankLastOtpSentAt', String(now));
            hasSentOtp.current = true;
            hasVisitedBankApp.current = true;
            sessionStorage.setItem('bankHasSentOtp', 'true');
            sessionStorage.setItem('bankHasVisited', 'true');
            sessionStorage.removeItem('paymentInitiated');
            setTimeLeft(300);
            return true;
        } catch (err) {
            console.error('❌ Lỗi gửi OTP:', err);
            const errorMsg = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
            openModal('error', 'LỖI GỬI OTP', errorMsg);
            return false;
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // TRIGGER SEND OTP (chỉ gửi 1 lần)
    // =========================
    useEffect(() => {
        const triggerSendOtp = async () => {
            if (paymentCompletedRef.current) return;
            if (!customerEmail || !bookingId) return;

            if (!isPaymentInitiated.current) {
                if (!modalConfig.show) {
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

            if (hasSentOtp.current || hasVisitedBankApp.current) {
                if (!modalConfig.show) {
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

        triggerSendOtp();
    }, [customerEmail, bookingId]);

    // =========================
    // TIMER (không tự động gửi lại)
    // =========================
    useEffect(() => {
        if (paymentCompletedRef.current) return;

        if (timeLeft <= 0) {
            const handleTimeout = async () => {
                await cancelBookingOnServer();

                openModal(
                    'error',
                    'HẾT HẠN',
                    'Phiên giao dịch đã hết hạn! Hệ thống sẽ tự động quay về trang chủ.',
                    () => {
                        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
                        clearAllAndGoHome();
                    }
                );

                redirectTimeoutRef.current = setTimeout(() => {
                    clearAllAndGoHome();
                }, 3000);
            };

            handleTimeout();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, bookingId, customerEmail, navigate]);

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
            const res = await api.post('/api/bank/verify-otp', {
                email: customerEmail,
                otp,
                bookingId
            });

            if (res.data.success) {
                sessionStorage.setItem('paymentCompleted', 'true');
                sessionStorage.setItem('completedBookingId', String(bookingId));
                paymentCompletedRef.current = true;
                sessionStorage.removeItem('bankOtpTimeLeft');
                sessionStorage.removeItem('bankOtpInput');
                sessionStorage.removeItem('bankHasSentOtp');
                sessionStorage.removeItem('bankHasVisited');
                sessionStorage.removeItem('bankLastOtpSentAt');
                sessionStorage.removeItem('paymentInitiated');
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('selectedSeats');
                sessionStorage.removeItem('currentShowtimeId');

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
            console.error('❌ Lỗi verify OTP:', err);
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
                            Gửi đến: <strong>{customerEmail}</strong>
                        </p>

                        <div className="otp-input-wrapper">
                            <input
                                type="text"
                                className="otp-field"
                                placeholder="●●●●●●"
                                maxLength="6"
                                autoFocus
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={paymentCompletedRef.current}
                            />
                        </div>

                        <div className="bank-timer-box">
                            OTP hết hạn sau:
                            <span>
                                {mins < 10 ? `0${mins}` : mins}:
                                {secs < 10 ? `0${secs}` : secs}
                            </span>
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

            {/* MODAL CHUNG */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            {/* MODAL XÁC NHẬN BACK */}
            {showBackConfirm && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div className="modal-content" style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        textAlign: 'center',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <div style={{ marginBottom: '20px' }}><span style={{ fontSize: '48px' }}>⚠️</span></div>
                        <h3 style={{ color: '#e74c3c', fontSize: '22px', marginBottom: '15px' }}>CẢNH BÁO</h3>
                        <p style={{ fontSize: '16px', color: '#333', marginBottom: '15px' }}>
                            Bạn đang trong quá trình nhập OTP. Nếu thoát, toàn bộ thông tin đặt vé sẽ bị xóa!
                        </p>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '25px' }}>
                            Bạn có chắc chắn muốn rời khỏi?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={handleStay}
                                style={{
                                    padding: '10px 30px',
                                    background: '#3498db',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.target.style.background = '#2980b9'}
                                onMouseLeave={e => e.target.style.background = '#3498db'}
                            >
                                Ở LẠI
                            </button>
                            <button
                                onClick={clearAllAndGoHome}
                                style={{
                                    padding: '10px 30px',
                                    background: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.target.style.background = '#c0392b'}
                                onMouseLeave={e => e.target.style.background = '#e74c3c'}
                            >
                                XÁC NHẬN RỜI
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default BankApp;