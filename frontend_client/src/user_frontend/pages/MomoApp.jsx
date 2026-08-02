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

import api from '../../api/api'; // ✅ Import api

// COMPONENT
import BookingSidebar from '../components/BookingSidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

// CSS
import '../styles/MomoApp.css';

const MomoApp = () => {

    const location = useLocation();
    const navigate = useNavigate();

    // =============================
    // DATA FROM PAYMENT
    // =============================

    const ticketData =
        location.state ||
        JSON.parse(sessionStorage.getItem('lastSuccessTicket')) ||
        {};

    const {
        bookingId,
        totalAmount,
        movieTitle,

        movie,
        selectedCinema,
        selectedDate,
        selectedShowtime,
        selectedSeats,
        selectedFoods,

        totalTicketPrice,
        totalFoodPrice,
        grandTotal,

        showtimeDetail
    } = ticketData;

    // =============================
    // REFS
    // =============================
    const paymentCompletedRef = useRef(false);
    const isCancellingRef = useRef(false);
    const confirmTimerRef = useRef(null);
    const navigateTimerRef = useRef(null);
    const isFirstLoad = useRef(true);
    const isPaymentInitiated = useRef(sessionStorage.getItem('paymentInitiated') === 'true');

    // =============================
    // STATES
    // =============================
    const [isConfirming, setIsConfirming] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    // =============================
    // MOMO INFO
    // =============================
    const myMomoPhone = '0909489611';
    const myName = 'NGUYEN PHAM QUANG DUNG';

    // =============================
    // QR URL
    // =============================
    const qrImageUrl =
        `https://img.vietqr.io/image/momo-${myMomoPhone}-compact.jpg?amount=${
            totalAmount || grandTotal || 85000
        }&addInfo=DungCinema%20${
            bookingId || '2F5B7196'
        }&accountName=${encodeURIComponent(myName)}`;

    // =============================
    // MODAL HANDLERS
    // =============================
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

    // =============================
    // BLOCKER – chặn mọi navigate khi ở MomoApp & chưa thanh toán
    // =============================
    const shouldBlock = useCallback(() => {
        if (paymentCompletedRef.current) return false;
        if (!bookingId) return false;
        return location.pathname === '/momo-app';
    }, [bookingId, location.pathname]);

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

    // =============================
    // POPSTATE (BACK/FORWARD) – Dự phòng
    // =============================
    useEffect(() => {
        const handlePopState = () => {
            if (paymentCompletedRef.current) return;
            if (!bookingId) return;
            if (modalConfig.show || showBackConfirm) return;

            setShowBackConfirm(true);
            window.history.pushState(null, '', window.location.href);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [bookingId, modalConfig.show, showBackConfirm]);

    // =============================
    // CALL API CANCEL BOOKING
    // =============================
    const cancelBookingOnServer = async () => {
        if (isCancellingRef.current) return;
        isCancellingRef.current = true;
        try {
            await api.post('/api/bank/cancel-timeout', { // ✅ Dùng api
                bookingId,
                email: ticketData?.customerEmail || ''
            });
            console.log('✅ Booking cancelled on server');
        } catch (err) {
            console.error('❌ Lỗi hủy booking:', err);
        } finally {
            isCancellingRef.current = false;
        }
    };

    // =============================
    // CLEAR ALL & GO HOME
    // =============================
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

    // =============================
    // XỬ LÝ KHI BẤM "Ở LẠI"
    // =============================
    const handleStay = () => {
        setShowBackConfirm(false);
        if (blocker.state === 'blocked') {
            blocker.reset();
        }
    };

    // =============================
    // CHECK PAYMENT COMPLETED
    // =============================
    useEffect(() => {
        const completed = sessionStorage.getItem('paymentCompleted');
        const completedId = sessionStorage.getItem('completedBookingId');

        if (completed === 'true' && completedId === String(bookingId)) {
            paymentCompletedRef.current = true;
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

    // =============================
    // BEFORE UNLOAD (đóng tab)
    // =============================
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!paymentCompletedRef.current && bookingId) {
                e.preventDefault();
                e.returnValue = 'Bạn đang trong quá trình thanh toán. Nếu rời trang, giao dịch sẽ bị hủy!';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [bookingId]);

    // =============================
    // CHECK DATA
    // =============================
    useEffect(() => {
        if (!bookingId) {
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
    }, [bookingId, navigate]);

    // =============================
    // AUTO CONFIRM
    // =============================
    useEffect(() => {
        // Nếu đã thanh toán rồi thì không chạy
        if (paymentCompletedRef.current) return;

        // Kiểm tra flag paymentInitiated
        if (!isPaymentInitiated.current) {
            if (!modalConfig.show) {
                openModal(
                    'error',
                    'TRUY CẬP KHÔNG HỢP LỆ',
                    'Vui lòng thanh toán từ trang chủ để tiếp tục.',
                    () => {
                        closeModal();
                        navigate('/payment', { state: ticketData });
                    }
                );
            }
            return;
        }

        // Clear timer cũ nếu có
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);

        const autoConfirm = setTimeout(() => {
            setIsConfirming(true);

            api.post('/api/momo/confirm-fast', { // ✅ Dùng api
                bookingId
            })
            .then(() => {
                console.log('✅ Thanh toán thành công');
                // Đánh dấu đã thanh toán
                paymentCompletedRef.current = true;
                sessionStorage.setItem('paymentCompleted', 'true');
                sessionStorage.setItem('completedBookingId', String(bookingId));
            })
            .catch(error => {
                console.error('❌ Lỗi backend:', error);
                setIsConfirming(false);
                openModal(
                    'error',
                    'LỖI THANH TOÁN',
                    'Không thể xác nhận thanh toán. Vui lòng thử lại.'
                );
            });

            navigateTimerRef.current = setTimeout(() => {
                // Xóa session trước khi navigate
                sessionStorage.removeItem('bankHasSentOtp');
                sessionStorage.removeItem('bankHasVisited');
                sessionStorage.removeItem('bankOtpTimeLeft');
                sessionStorage.removeItem('bankOtpInput');
                sessionStorage.removeItem('bankLastOtpSentAt');
                sessionStorage.removeItem('paymentInitiated');
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('selectedSeats');
                sessionStorage.removeItem('currentShowtimeId');

                navigate('/confirm-success', {
                    state: {
                        ...ticketData
                    },
                    replace: true
                });
            }, 1500);

        }, 5000);

        confirmTimerRef.current = autoConfirm;

        return () => {
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
        };

    }, [bookingId, navigate, ticketData]);

    // =============================
    // CLEANUP
    // =============================
    useEffect(() => {
        return () => {
            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
            if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
        };
    }, []);

    // =============================
    // RENDER
    // =============================

    return (

        <div className="booking-wrapper">

            <div className="booking-container">

                {/* ================= SIDEBAR ================= */}

                <BookingSidebar
                    movie={movie}
                    showtimeDetail={showtimeDetail}
                    selectedCinema={selectedCinema}
                    selectedDate={selectedDate}
                    selectedShowtime={selectedShowtime}
                    selectedSeats={Array.isArray(selectedSeats) ? selectedSeats : []}
                    selectedFoods={Array.isArray(selectedFoods) ? selectedFoods : []}
                    totalTicketPrice={totalTicketPrice || 0}
                    totalFoodPrice={totalFoodPrice || 0}
                    grandTotal={grandTotal || totalAmount || 0}
                    showFoodSection={true}
                    showContinueButton={false}
                    showBackButton={true}
                    onBack={() => {
                        // Nếu chưa thanh toán, hiển thị modal cảnh báo
                        if (!paymentCompletedRef.current) {
                            setShowBackConfirm(true);
                        } else {
                            navigate(-1);
                        }
                    }}
                />

                {/* ================= QR PAYMENT ================= */}

                <section className="main-booking-area">

                    <div className="momo-payment-wrapper">

                        {/* TITLE */}

                        <div className="momo-title-box">

                            <h2>
                                QUÉT QR
                                THANH TOÁN
                            </h2>

                            <p>
                                Mở ứng dụng
                                <strong>
                                    {' '}
                                    MoMo
                                </strong>{' '}
                                để quét mã
                            </p>

                        </div>

                        {/* QR */}

                        <div className="qr-card">

                            <div className="qr-wrapper">

                                <img
                                    src={qrImageUrl}
                                    alt="QR Payment"
                                    style={{
                                        opacity: isConfirming ? 0.3 : 1
                                    }}
                                />

                                {!isConfirming && (
                                    <div className="scan-line"></div>
                                )}

                                {isConfirming && (
                                    <div className="confirm-overlay">
                                        <LoadingSpinner
                                            size={48}
                                            color="#dc2626"
                                            message="Đang kiểm tra giao dịch..."
                                            blur={false}
                                            overlay={false}
                                        />
                                    </div>
                                )}

                            </div>

                        </div>

                        {/* HELP */}

                        <div className="help-text">
                            Hệ thống sẽ tự động xác nhận sau 5 giây...
                        </div>

                    </div>

                </section>

            </div>

            {/* ========================= */}
            {/* MODAL CHUNG */}
            {/* ========================= */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            {/* ========================= */}
            {/* MODAL XÁC NHẬN BACK */}
            {/* ========================= */}
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
                            Bạn đang trong quá trình thanh toán MoMo. Nếu thoát, toàn bộ thông tin đặt vé sẽ bị xóa!
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

export default MomoApp;