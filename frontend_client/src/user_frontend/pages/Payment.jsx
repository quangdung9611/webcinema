import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';

// COMPONENTS
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

// Import PaymentPinModal
import PaymentPinModal from '../components/PaymentPinModal';

// STYLES
import '../styles/Payment.css';

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
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
    } = location.state || {};

    // =========================
    // STATES
    // =========================
    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [couponCode, setCouponCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedCouponId, setAppliedCouponId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bank');
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [tempBookingId, setTempBookingId] = useState(null);

    const [userInfo, setUserInfo] = useState({
        user_id: '',
        full_name: '',
        email: '',
        phone: ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // 🆕 STATE CHO MODAL NHẬP MÃ PIN
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);

    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id;

    // =========================
    // NOTICE
    // =========================
    const showNotice = (type, title, message, onConfirm = null) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    // =========================
    // TOTAL
    // =========================
    const subTotal = Number(totalTicketPrice || 0) + Number(totalFoodPrice || 0);
    const grandTotal = subTotal - Number(discountAmount || 0);

    // =========================
    // CHECK SESSION FROM COOKIE
    // =========================
    const checkSession = async () => {
        setIsLoadingUser(true);
        try {
            const response = await api.get('/api/auth/me');
            const userData = response.data?.user;
            
            if (userData && userData.user_id) {
                setUser(userData);
                setUserInfo({
                    user_id: userData.user_id,
                    full_name: userData.full_name || '',
                    email: userData.email || '',
                    phone: userData.phone || ''
                });
                return true;
            } else {
                throw new Error('Invalid session');
            }
        } catch (error) {
            if (error.response?.status === 401) {
                showNotice(
                    'error',
                    'YÊU CẦU ĐĂNG NHẬP',
                    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                    () => navigate('/login', { state: { from: location.pathname } })
                );
            }
            return false;
        } finally {
            setIsLoadingUser(false);
        }
    };

    // =========================
    // INIT
    // =========================
    useEffect(() => {
        window.scrollTo(0, 0);

        if (!movie || !selectedSeats || selectedSeats.length === 0) {
            navigate('/');
            return;
        }

        sessionStorage.removeItem('lastSuccessTicket');
        sessionStorage.removeItem('bankHasSentOtp');
        sessionStorage.removeItem('bankHasVisited');
        sessionStorage.removeItem('bankOtpTimeLeft');
        sessionStorage.removeItem('bankOtpInput');
        sessionStorage.removeItem('bankLastOtpSentAt');
        sessionStorage.removeItem('paymentCompleted');
        sessionStorage.removeItem('completedBookingId');
        sessionStorage.removeItem('paymentInitiated');
        sessionStorage.removeItem('tempBookingId');

        const verifySession = async () => {
            const isValid = await checkSession();
            if (!isValid) return;

            if (sessionStorage.getItem('holdExpiresAt')) {
                setIsTimerActive(true);
            }
        };

        verifySession();

        const handleSessionExpired = (event) => {
            console.log('🔴 Session expired event received:', event.detail);
            showNotice(
                'error',
                'PHIÊN ĐĂNG NHẬP HẾT HẠN',
                event.detail?.message || 'Vui lòng đăng nhập lại để tiếp tục.',
                () => navigate('/login', { state: { from: location.pathname } })
            );
        };

        window.addEventListener('sessionExpired', handleSessionExpired);
        return () => window.removeEventListener('sessionExpired', handleSessionExpired);
    }, [movie, selectedSeats, navigate, location.pathname]);

    // =========================
    // TIMER EXPIRE (giữ ghế)
    // =========================
    const handleTimeExpire = async () => {
        if (tempBookingId) {
            try {
                await api.post('/api/bank/cancel-timeout', { tempBookingId });
            } catch (err) {
                console.error('Lỗi hủy temp booking:', err);
            }
        }
        sessionStorage.clear();
        showNotice(
            'error',
            'HẾT THỜI GIAN',
            'Phiên đặt vé đã hết hạn.',
            () => {
                navigate('/');
                window.location.reload();
            }
        );
    };

    // =========================
    // APPLY COUPON
    // =========================
    const handleApplyCoupon = async () => {
        const inputCode = couponCode.toUpperCase().trim();
        if (!inputCode) {
            showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập mã giảm giá.');
            return;
        }

        if (!userInfo.user_id) {
            showNotice('error', 'LỖI', 'Vui lòng đăng nhập lại.');
            return;
        }

        setIsApplyingCoupon(true);
        try {
            const res = await api.post('/api/coupons/check', {
                code: inputCode,
                userId: userInfo.user_id
            });

            if (res.data.success) {
                const { discount_value, coupon_id } = res.data.data;
                setDiscountAmount(Number(discount_value));
                setAppliedCouponId(coupon_id);
                showNotice('success', 'THÀNH CÔNG', 'Áp dụng mã giảm giá thành công.');
            }
        } catch (err) {
            showNotice(
                'error',
                'THÔNG BÁO',
                err.response?.data?.message || 'Mã không hợp lệ.'
            );
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    // =========================
    // KIỂM TRA MÃ PIN TRƯỚC KHI THANH TOÁN
    // =========================
    const onConfirmPaymentClick = () => {
        if (!userInfo.user_id) {
            showNotice('error', 'YÊU CẦU ĐĂNG NHẬP', 'Vui lòng đăng nhập để tiếp tục.', () => navigate('/login', { state: { from: location.pathname } }));
            return;
        }

        if (!userInfo.full_name || !userInfo.email || !userInfo.phone) {
            showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập đầy đủ thông tin nhận vé.');
            return;
        }

        setShowPinModal(true);
        setPin('');
        setPinError('');
    };

    // =========================
    // XÁC THỰC MÃ PIN VÀ TIẾP TỤC
    // =========================
    const handleVerifyPinAndProceed = async (e) => {
        if (!/^\d{6}$/.test(pin)) {
            setPinError('Vui lòng nhập mã PIN gồm 6 chữ số');
            return;
        }

        setIsVerifyingPin(true);
        setPinError('');

        try {
            // 1. Gọi API xác thực PIN
            const pinResponse = await api.post('/api/users/verify-pin', { pin });

            if (pinResponse.data.success) {
                // 2. Nếu PIN đúng -> Đóng modal PIN -> Gọi xử lý thanh toán
                setShowPinModal(false);
                setPin('');
                await handleProceed();
            }
        } catch (err) {
            console.error('Verify PIN Error:', err);
            setPinError(err.response?.data?.message || 'Mã PIN không đúng');
        } finally {
            setIsVerifyingPin(false);
        }
    };

    // =========================
    // PAYMENT – GỌI API /payment/process
    // =========================
    const handleProceed = async () => {
        if (!userInfo.user_id) {
            showNotice('error', 'YÊU CẦU ĐĂNG NHẬP', 'Vui lòng đăng nhập để tiếp tục.', () => navigate('/login', { state: { from: location.pathname } }));
            return;
        }

        const email = userInfo.email.trim();
        const fullName = userInfo.full_name.trim();
        const phone = userInfo.phone.trim();
        const userId = userInfo.user_id;

        if (!fullName || !email || !phone) {
            showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập đầy đủ thông tin nhận vé.');
            return;
        }

        sessionStorage.removeItem('bankHasSentOtp');
        sessionStorage.removeItem('bankHasVisited');
        sessionStorage.removeItem('bankOtpTimeLeft');
        sessionStorage.removeItem('bankOtpInput');
        sessionStorage.removeItem('bankLastOtpSentAt');
        sessionStorage.removeItem('paymentCompleted');
        sessionStorage.removeItem('completedBookingId');
        sessionStorage.removeItem('paymentInitiated');
        sessionStorage.removeItem('lastSuccessTicket');

        setIsProcessing(true);

        try {
            const seatsWithPrice = selectedSeats.map(seat => ({
                seat_id: seat.seat_id,
                seat_row: seat.seat_row || '',
                seat_number: seat.seat_number || '',
                price: seat.price || 0
            }));

            const foodsWithQuantity = (selectedFoods || []).map(food => ({
                product_id: food.product_id,
                product_name: food.product_name || '',
                quantity: food.quantity || 1,
                price: food.price || 0
            }));

            const postData = {
                userId: userId,
                showtimeId: showtimeId,
                totalAmount: Number(grandTotal),
                discountAmount: Number(discountAmount),
                couponId: appliedCouponId || null,
                selectedSeats: seatsWithPrice,
                selectedFoods: foodsWithQuantity,
                customerEmail: email,
                customerName: fullName,
                customerPhone: phone,
                movieTitle: movie?.title || '',
                cinemaName: selectedCinema?.cinema_name || '',
                startTime: selectedShowtime?.start_time || ''
            };

            const response = await api.post('/api/payment/process', postData);

            if (response.data.success) {
                const tempId = response.data.tempBookingId;
                setTempBookingId(tempId);
                sessionStorage.setItem('tempBookingId', tempId);

                const finalState = {
                    tempBookingId: tempId,
                    totalAmount: Number(grandTotal),
                    customerName: fullName,
                    customerEmail: email,
                    customerPhone: phone,
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
                };

                sessionStorage.setItem('lastSuccessTicket', JSON.stringify(finalState));
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('selectedSeats');
                sessionStorage.removeItem('currentShowtimeId');
                setIsTimerActive(false);

                if (paymentMethod === 'bank') {
                    sessionStorage.setItem('paymentInitiated', 'true');
                    navigate('/bank-app', { state: finalState });
                } else {
                    sessionStorage.removeItem('paymentInitiated');
                    navigate('/momo-app', { state: finalState });
                }
            } else {
                sessionStorage.removeItem('paymentInitiated');
                showNotice('error', 'LỖI', response.data?.message || 'Không thể xử lý thanh toán.');
            }
        } catch (err) {
            console.error('Lỗi thanh toán:', err);
            
            if (err.response?.status === 401) {
                sessionStorage.removeItem('paymentInitiated');
                return;
            }
            
            const errorMessage = err.response?.data?.message || err.message || 'Không thể xử lý thanh toán.';
            sessionStorage.removeItem('paymentInitiated');
            showNotice('error', 'LỖI', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // =========================
    // RENDER
    // =========================
    return (
        <div className="booking-wrapper">
            <Modal
                show={modal.show}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                onCancel={() => setModal({ ...modal, show: false })}
            />

            {/* 🆕 MODAL NHẬP MÃ PIN - Đã tự chứa ForgotPinModal bên trong */}
            <PaymentPinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onConfirm={handleVerifyPinAndProceed}
                pin={pin}
                setPin={setPin}
                error={pinError}
                isLoading={isVerifyingPin}
                email={userInfo.email} // Truyền email
                api={api} // Truyền api
            />

            <div className="booking-container">
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
                    grandTotal={grandTotal}
                    isTimerActive={isTimerActive}
                    onExpire={handleTimeExpire}
                    showFoodSection={true}
                />

                <section className="main-booking-area">
                    {isLoadingUser && (
                        <div className="payment-card">
                            <h3>⏳ ĐANG KIỂM TRA ĐĂNG NHẬP...</h3>
                            <div className="loading-spinner" style={{ textAlign: 'center', padding: '20px' }}>
                                Vui lòng chờ...
                            </div>
                        </div>
                    )}

                    {!isLoadingUser && userInfo.user_id && (
                        <>
                            <div className="payment-card">
                                <h3>MÃ GIẢM GIÁ</h3>
                                <div className="coupon-group">
                                    <input
                                        type="text"
                                        placeholder="Nhập mã giảm giá..."
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value)}
                                        disabled={isApplyingCoupon}
                                    />
                                    <LoadingButton
                                        type="button"
                                        loading={isApplyingCoupon}
                                        loadingText="Đang áp dụng..."
                                        onClick={handleApplyCoupon}
                                        disabled={isApplyingCoupon}
                                        className="coupon-btn"
                                        spinnerColor="#ffffff"
                                    >
                                        ÁP DỤNG
                                    </LoadingButton>
                                </div>
                            </div>

                            <div className="payment-card">
                                <h3>THÔNG TIN NHẬN VÉ</h3>
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        placeholder="Họ và tên"
                                        value={userInfo.full_name}
                                        onChange={e => setUserInfo({ ...userInfo, full_name: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Số điện thoại"
                                        value={userInfo.phone}
                                        onChange={e => setUserInfo({ ...userInfo, phone: e.target.value })}
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email nhận vé"
                                    value={userInfo.email}
                                    onChange={e => setUserInfo({ ...userInfo, email: e.target.value })}
                                />
                            </div>

                            <div className="payment-card">
                                <h3>HÌNH THỨC THANH TOÁN</h3>
                                <div className="payment-methods">
                                    <label className={`payment-method ${paymentMethod === 'bank' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            checked={paymentMethod === 'bank'}
                                            onChange={() => setPaymentMethod('bank')}
                                        />
                                        <span>VietQR</span>
                                    </label>
                                    <label className={`payment-method ${paymentMethod === 'momo' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            checked={paymentMethod === 'momo'}
                                            onChange={() => setPaymentMethod('momo')}
                                        />
                                        <span>MoMo</span>
                                    </label>
                                </div>

                                <LoadingButton
                                    type="button"
                                    loading={isProcessing}
                                    loadingText="Đang xử lý..."
                                    onClick={onConfirmPaymentClick}
                                    disabled={isProcessing}
                                    className="btn-next"
                                    spinnerColor="#ffffff"
                                >
                                    XÁC NHẬN THANH TOÁN
                                </LoadingButton>

                                <button className="btn-back" onClick={() => navigate(-1)}>
                                    QUAY LẠI
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Payment;