import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api'; // ✅ Import api

// COMPONENTS
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

// STYLES
import '../styles/Payment.css';

// CONTEXT
import { useAuth } from '../../context/AuthContext';

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

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
    const [couponCode, setCouponCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedCouponId, setAppliedCouponId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bank');
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const [userInfo, setUserInfo] = useState({
        user_id: user?.user_id || '',
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

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
            onConfirm:
                onConfirm ||
                (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    // =========================
    // TOTAL
    // =========================
    const subTotal = Number(totalTicketPrice || 0) + Number(totalFoodPrice || 0);
    const grandTotal = subTotal - Number(discountAmount || 0);

    // =========================
    // INIT
    // =========================
    useEffect(() => {
        window.scrollTo(0, 0);

        if (!movie || !selectedSeats || selectedSeats.length === 0) {
            navigate('/');
            return;
        }

        if (!user || !user.user_id) {
            showNotice(
                'error',
                'YÊU CẦU ĐĂNG NHẬP',
                'Vui lòng đăng nhập để tiếp tục đặt vé.',
                () => navigate('/login', { state: { from: location.pathname } })
            );
            return;
        }

        if (user) {
            setUserInfo({
                user_id: user.user_id || '',
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }

        // Reset OTP nếu không có giữ ghế
        if (!sessionStorage.getItem('holdExpiresAt')) {
            sessionStorage.removeItem('bankHasSentOtp');
            sessionStorage.removeItem('bankHasVisited');
            sessionStorage.removeItem('bankOtpTimeLeft');
            sessionStorage.removeItem('bankOtpInput');
            sessionStorage.removeItem('bankLastOtpSentAt');
            sessionStorage.removeItem('paymentCompleted');
            sessionStorage.removeItem('completedBookingId');
            sessionStorage.removeItem('paymentInitiated');
        }

        if (sessionStorage.getItem('holdExpiresAt')) {
            setIsTimerActive(true);
        }
    }, [movie, selectedSeats, navigate, user, location.pathname]);

    // =========================
    // TIMER EXPIRE
    // =========================
    const handleTimeExpire = async () => {
        try {
            if (selectedSeats?.length > 0) {
                await api.post('/api/seats/release', {
                    seatIds: selectedSeats.map(s => s.seat_id),
                    showtimeId
                });
            }
        } catch (err) {
            console.error('Lỗi nhả ghế:', err);
        }

        sessionStorage.clear();
        showNotice(
            'error',
            'HẾT THỜI GIAN',
            'Ghế đã được mở khóa.',
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
    // PAYMENT – XÓA OTP CŨ TRƯỚC KHI GỬI
    // =========================
    const handleProceed = async () => {
        if (!userInfo.user_id) {
            showNotice(
                'error',
                'YÊU CẦU ĐĂNG NHẬP',
                'Vui lòng đăng nhập để tiếp tục.',
                () => navigate('/login', { state: { from: location.pathname } })
            );
            return;
        }

        if (!userInfo.full_name || !userInfo.email || !userInfo.phone) {
            showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập đầy đủ thông tin nhận vé.');
            return;
        }

        // Xóa toàn bộ OTP cũ để bắt đầu phiên mới
        sessionStorage.removeItem('bankHasSentOtp');
        sessionStorage.removeItem('bankHasVisited');
        sessionStorage.removeItem('bankOtpTimeLeft');
        sessionStorage.removeItem('bankOtpInput');
        sessionStorage.removeItem('bankLastOtpSentAt');
        sessionStorage.removeItem('paymentCompleted');
        sessionStorage.removeItem('completedBookingId');
        sessionStorage.removeItem('paymentInitiated');

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
                userId: userInfo.user_id,
                showtimeId: showtimeId,
                totalAmount: Number(grandTotal),
                discountAmount: Number(discountAmount),
                couponId: appliedCouponId || null,
                selectedSeats: seatsWithPrice,
                selectedFoods: foodsWithQuantity,
                customerEmail: userInfo.email,
                customerName: userInfo.full_name,
                movieTitle: movie?.title || '',
                cinemaName: selectedCinema?.cinema_name || '',
                startTime: selectedShowtime?.start_time || '',
                status: 'pending'
            };

            const response = await api.post('/api/payment/process', postData);

            if (response.data.success) {
                const finalState = {
                    orderId: response.data.bookingId,
                    bookingId: response.data.bookingId,
                    totalAmount: Number(grandTotal),
                    customerName: userInfo.full_name,
                    customerEmail: userInfo.email,
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
                sessionStorage.removeItem('bankHasSentOtp');
                sessionStorage.removeItem('bankHasVisited');
                sessionStorage.removeItem('bankOtpTimeLeft');
                sessionStorage.removeItem('bankOtpInput');
                sessionStorage.removeItem('bankLastOtpSentAt');
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
            const errorMessage = err.response?.data?.message || err.message || 'Không thể xử lý thanh toán.';
            sessionStorage.removeItem('paymentInitiated');

            // Xử lý riêng lỗi duplicate key
            if (errorMessage.includes('Duplicate entry') || errorMessage.includes('uk_showtime_cinema_room_seat')) {
                showNotice(
                    'error',
                    'GHẾ ĐÃ ĐƯỢC ĐẶT',
                    'Ghế bạn chọn đã được đặt bởi người khác hoặc bạn đã có booking chưa hoàn tất. Vui lòng chọn ghế khác.',
                    () => {
                        sessionStorage.clear();
                        navigate('/');
                        window.location.reload();
                    }
                );
            } else {
                showNotice('error', 'LỖI', errorMessage);
            }
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
                    {/* COUPON */}
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

                    {/* USER INFO */}
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

                    {/* PAYMENT */}
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
                            onClick={handleProceed}
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
                </section>
            </div>
        </div>
    );
};

export default Payment;