// ============================================================
// PAYMENT PAGE
// Bước 4: THANH TOÁN
// HỖ TRỢ CẢ ĐẶT VÉ THƯỜNG VÀ ĐỔI VÉ (RESCHEDULE)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';
import PaymentPinModal from '../components/PaymentPinModal';
import BookingProgress from '../components/BookingProgress';
import useOTPGuard from '../../hooks/useOTPGuard';
import { RefreshCw, Check } from 'lucide-react';
import '../styles/Payment.css';

// ============================================================
// COMPONENT
// ============================================================

const Payment = () => {

    const location = useLocation();
    const navigate = useNavigate();

    // ============================================================
    // ✅ RESCHEDULE MODE
    // ============================================================

    const isRescheduleMode = location.state?.mode === 'reschedule';
    const rescheduleBookingId = location.state?.rescheduleBookingId || null;
    const oldTotalAmount = Number(location.state?.oldTotalAmount || 0);
    const deltaAmount = Number(location.state?.deltaAmount || 0);

    // ============================================================
    // LẤY DỮ LIỆU BOOKING
    // ============================================================

    const getStateData = () => {
        const stateData = location.state || {};
        if (Array.isArray(stateData.selectedSeats) && stateData.selectedSeats.length > 0) {
            return stateData;
        }
        try {
            const savedBooking = localStorage.getItem('booking_temp');
            if (savedBooking) {
                const parsed = JSON.parse(savedBooking);
                if (parsed && typeof parsed === 'object') {
                    return { ...parsed, ...stateData };
                }
            }
        } catch (err) {
            console.error('❌ [PAYMENT] Lỗi đọc booking_temp:', err);
        }
        return stateData;
    };

    const initialData = getStateData();

    // ============================================================
    // BOOKING DATA
    // ============================================================

    const movie = initialData.movie || {};
    const selectedCinema = initialData.selectedCinema || {};
    const selectedDate = initialData.selectedDate || '';
    const selectedShowtime = initialData.selectedShowtime || {};
    const selectedSeats = Array.isArray(initialData.selectedSeats) ? initialData.selectedSeats : [];
    const selectedFoods = Array.isArray(initialData.selectedFoods) ? initialData.selectedFoods : [];
    const foods = Array.isArray(initialData.foods) ? initialData.foods : [];
    const totalTicketPrice = Number(initialData.totalTicketPrice || 0);
    const totalFoodPrice = Number(initialData.totalFoodPrice || 0);
    const showtimeDetail = initialData.showtimeDetail || {};
    const ownerToken = initialData.ownerToken || localStorage.getItem('booking_owner_token') || '';
    const showtimeId = initialData.showtimeId || initialData.showtime_id || selectedShowtime?.showtime_id || selectedShowtime?.id || null;

    // ============================================================
    // STATES
    // ============================================================

    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [couponCode, setCouponCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedCouponId, setAppliedCouponId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bank');
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [tempBookingId, setTempBookingId] = useState(() => localStorage.getItem('tempBookingId') || null);
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
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);

    // ✅ RESCHEDULE: đang xử lý hoàn điểm tự động
    const [rescheduleProcessing, setRescheduleProcessing] = useState(false);

    // ============================================================
    // NOTICE MODAL
    // ============================================================

    const showNotice = (type, title, message, onConfirm = null) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    // ============================================================
    // TOTAL
    // ============================================================

    const subTotal = Number(totalTicketPrice || 0) + Number(totalFoodPrice || 0);
    const grandTotal = Math.max(0, subTotal - Number(discountAmount || 0));

    // ✅ Reschedule: số tiền cần bù (nếu > 0)
    const reschedulePayAmount = isRescheduleMode ? Math.max(0, deltaAmount) : 0;

    // ============================================================
    // CHECK SESSION
    // ============================================================

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
            }
            throw new Error('Invalid session');
        } catch (error) {
            console.error('❌ [PAYMENT] Check session error:', error);
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

    // ============================================================
    // ✅ RESCHEDULE: XỬ LÝ HOÀN ĐIỂM NGAY (delta <= 0)
    // ============================================================

    const processRescheduleNoPayment = async () => {
        if (rescheduleProcessing) return;
        setRescheduleProcessing(true);

        try {
            const res = await api.post(
                `/api/bookings/${rescheduleBookingId}/reschedule`,
                {
                    new_showtime_id: showtimeId,
                    new_seat_ids: selectedSeats.map(s => Number(s.seat_id))
                }
            );

            if (res.data?.success) {
                const data = res.data.data;
                const delta = Number(data.priceDifference || 0);
                const refund = Math.abs(delta);

                let message = 'Đổi suất chiếu thành công!';
                if (refund > 0) {
                    message = `Đổi suất thành công! Hệ thống đã hoàn ${refund.toLocaleString('vi-VN')} điểm vào tài khoản của bạn.`;
                } else if (delta > 0) {
                    message = `Đổi suất thành công! Bạn đã bù thêm ${delta.toLocaleString('vi-VN')} điểm.`;
                }

                showNotice(
                    'success',
                    'ĐỔI SUẤT THÀNH CÔNG',
                    message,
                    () => navigate('/profile')
                );

                // Tự về profile sau 5s
                setTimeout(() => navigate('/profile'), 5000);
            } else {
                showNotice(
                    'error',
                    'ĐỔI SUẤT THẤT BẠI',
                    res.data?.message || 'Có lỗi xảy ra.',
                    () => navigate(-1)
                );
            }
        } catch (err) {
            console.error('❌ [PAYMENT] Reschedule error:', err);
            showNotice(
                'error',
                'ĐỔI SUẤT THẤT BẠI',
                err.response?.data?.message || 'Có lỗi xảy ra khi đổi suất.',
                () => navigate(-1)
            );
        } finally {
            setRescheduleProcessing(false);
        }
    };

    // ============================================================
    // QUAY LẠI TỪ FORGOT PIN
    // ============================================================

    useEffect(() => {
        if (location.state?.fromForgotPin) {
            setShowPinModal(true);
            setPin('');
            setPinError('');
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ============================================================
    // INIT
    // ============================================================

    useEffect(() => {
        window.scrollTo(0, 0);

        // =============================================
        // ✅ RESCHEDULE MODE
        // =============================================
        if (isRescheduleMode) {
            if (!rescheduleBookingId) {
                showNotice('error', 'LỖI', 'Không tìm thấy mã booking để đổi.', () => navigate('/profile'));
                return;
            }
            if (selectedSeats.length === 0) {
                showNotice('error', 'LỖI', 'Chưa có ghế nào được chọn.', () => navigate('/profile'));
                return;
            }
            if (!showtimeId) {
                showNotice('error', 'LỖI', 'Không xác định được suất chiếu mới.', () => navigate('/profile'));
                return;
            }

            // ✅ Nếu delta <= 0 → hoàn điểm ngay, không cần thanh toán
            if (deltaAmount <= 0) {
                processRescheduleNoPayment();
                return;
            }

            // ✅ Nếu delta > 0 → cho user thanh toán bù
            // (tiếp tục flow bên dưới)
            verifySessionAndProceed();
            return;
        }

        // =============================================
        // FLOW THƯỜNG
        // =============================================
        if (!movie || typeof movie !== 'object' || selectedSeats.length === 0) {
            console.warn('⚠️ [PAYMENT] Booking không hợp lệ');
            navigate('/');
            return;
        }
        if (!ownerToken) {
            console.warn('⚠️ [PAYMENT] Không có ownerToken');
            showNotice(
                'error',
                'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ',
                'Không xác định được phiên giữ ghế. Vui lòng chọn ghế lại.',
                () => { navigate('/'); }
            );
            return;
        }
        if (!showtimeId) {
            console.warn('⚠️ [PAYMENT] Không có showtimeId');
            showNotice(
                'error',
                'THÔNG TIN SUẤT CHIẾU KHÔNG HỢP LỆ',
                'Không xác định được suất chiếu. Vui lòng chọn lại.',
                () => { navigate('/'); }
            );
            return;
        }

        try {
            localStorage.setItem('booking_owner_token', ownerToken);
        } catch (err) {
            console.error('❌ [PAYMENT] Không thể lưu ownerToken:', err);
        }

        const holdExpiresAt = Number(localStorage.getItem('holdExpiresAt'));
        if (!Number.isFinite(holdExpiresAt) || holdExpiresAt <= Date.now()) {
            console.warn('⏰ [PAYMENT] Hold time đã hết');
            handleTimeExpireInternal();
            return;
        }

        setIsTimerActive(true);

        const bankKeys = [
            'lastSuccessTicket', 'bankHasSentOtp', 'bankHasVisited', 'bankOtpTimeLeft',
            'bankOtpInput', 'bankLastOtpSentAt', 'paymentCompleted', 'completedBookingId', 'paymentInitiated'
        ];
        bankKeys.forEach(key => localStorage.removeItem(key));
        const momoKeys = [
            'momoHasSentOtp', 'momoHasVisited', 'momoOtpTimeLeft', 'momoOtpInput', 'momoLastOtpSentAt',
            'momoPaymentCompleted', 'momoCompletedBookingId', 'momoPaymentInitiated',
            'momoTempBookingId', 'momoCustomerEmail', 'momoCustomerName', 'momoCustomerPhone',
            'momoTotalAmount', 'momoMovie', 'momoSelectedCinema', 'momoSelectedDate',
            'momoSelectedShowtime', 'momoSelectedSeats', 'momoSelectedFoods', 'momoFoods',
            'momoTotalTicketPrice', 'momoTotalFoodPrice', 'momoShowtimeDetail',
            'momoIsLocked', 'momoLockTime', 'momoOtpAttempts', 'momoResendCooldown', 'momoOwnerToken'
        ];
        momoKeys.forEach(key => localStorage.removeItem(key));

        const savedTempId = localStorage.getItem('tempBookingId');
        if (savedTempId) setTempBookingId(savedTempId);

        verifySessionAndProceed();

        const handleSessionExpired = event => {
            console.log('🔴 [PAYMENT] Session expired event:', event.detail);
            showNotice(
                'error',
                'PHIÊN ĐĂNG NHẬP HẾT HẠN',
                event.detail?.message || 'Vui lòng đăng nhập lại để tiếp tục.',
                () => navigate('/login', { state: { from: location.pathname } })
            );
        };
        window.addEventListener('sessionExpired', handleSessionExpired);
        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [navigate, location.pathname, ownerToken, showtimeId, selectedSeats.length, isRescheduleMode, deltaAmount, rescheduleBookingId]);

    const verifySessionAndProceed = async () => {
        const isValid = await checkSession();
        if (!isValid) return;
        const currentHold = Number(localStorage.getItem('holdExpiresAt'));
        if (Number.isFinite(currentHold) && currentHold > Date.now()) {
            setIsTimerActive(true);
        } else if (!isRescheduleMode) {
            handleTimeExpireInternal();
        }
    };

    // ============================================================
    // CLEAR BOOKING DATA
    // ============================================================

    const clearBookingData = () => {
        const keysToRemove = [
            'selectedSeats', 'holdExpiresAt', 'currentShowtimeId', 'booking_owner_token',
            'booking_seats', 'booking_showtime', 'booking_data',
            'booking_cinema', 'booking_date', 'booking_movie', 'booking_showtime',
            'selected_foods', 'food_selection', 'selectedFoods',
            'booking_temp', 'tempBookingId',
            'lastSuccessTicket', 'paymentInitiated'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    };

    // ============================================================
    // TIMER EXPIRE - INTERNAL
    // ============================================================

    const handleTimeExpireInternal = () => {
        if (isRescheduleMode) return;
        clearBookingData();
        setTempBookingId(null);
        setIsTimerActive(false);
        showNotice(
            'error',
            'HẾT THỜI GIAN GIỮ GHẾ',
            'Thời gian giữ ghế đã kết thúc. Vui lòng chọn lại ghế để tiếp tục.',
            () => { navigate('/'); window.location.reload(); }
        );
    };

    // ============================================================
    // TIMER EXPIRE
    // ============================================================

    const handleTimeExpire = async () => {
        if (isRescheduleMode) return;
        if (tempBookingId) {
            try {
                await api.post('/api/bank/cancel-timeout', { tempBookingId });
            } catch (err) {
                console.error('❌ [PAYMENT] Lỗi hủy temp booking:', err);
            }
        }
        clearBookingData();
        setTempBookingId(null);
        setIsTimerActive(false);
        showNotice(
            'error',
            'HẾT THỜI GIAN GIỮ GHẾ',
            'Thời gian giữ ghế đã kết thúc. Vui lòng chọn lại ghế để tiếp tục.',
            () => { navigate('/'); window.location.reload(); }
        );
    };

    // ============================================================
    // APPLY COUPON
    // ============================================================

    const handleApplyCoupon = async () => {
        if (isRescheduleMode) {
            showNotice('info', 'THÔNG BÁO', 'Không áp dụng mã giảm giá khi đổi suất chiếu.');
            return;
        }
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
            console.error('❌ [PAYMENT] Coupon error:', err);
            showNotice('error', 'THÔNG BÁO', err.response?.data?.message || 'Mã không hợp lệ.');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    // ============================================================
    // CLICK THANH TOÁN
    // ============================================================

    const onConfirmPaymentClick = () => {
        if (isProcessing) return;
        if (!userInfo.user_id) {
            showNotice(
                'error',
                'YÊU CẦU ĐĂNG NHẬP',
                'Vui lòng đăng nhập để tiếp tục.',
                () => navigate('/login', { state: { from: location.pathname } })
            );
            return;
        }
        if (selectedSeats.length === 0) {
            showNotice('error', 'CHƯA CHỌN GHẾ', 'Vui lòng chọn ghế trước khi thanh toán.');
            return;
        }
        if (!showtimeId) {
            showNotice('error', 'LỖI SUẤT CHIẾU', 'Không xác định được suất chiếu.');
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

    // ============================================================
    // VERIFY PIN
    // ============================================================

    const handleVerifyPinAndProceed = async () => {
        if (!/^\d{6}$/.test(pin)) {
            setPinError('Vui lòng nhập mã PIN gồm 6 chữ số');
            return;
        }
        setIsVerifyingPin(true);
        setPinError('');
        try {
            const pinResponse = await api.post('/api/users/verify-pin', { pin });
            if (pinResponse.data.success) {
                setShowPinModal(false);
                setPin('');
                await handleProceed();
            }
        } catch (err) {
            console.error('❌ [PAYMENT] Verify PIN Error:', err);
            setPinError(err.response?.data?.message || 'Mã PIN không đúng');
        } finally {
            setIsVerifyingPin(false);
        }
    };

    // ============================================================
    // ✅ PAYMENT PROCESS
    // ============================================================

    const handleProceed = async () => {
        if (isProcessing) return;

        // =============================================
        // ✅ RESCHEDULE MODE — thanh toán bù
        // =============================================
        if (isRescheduleMode) {
            if (!userInfo.user_id) {
                showNotice(
                    'error',
                    'YÊU CẦU ĐĂNG NHẬP',
                    'Vui lòng đăng nhập để tiếp tục.',
                    () => navigate('/login', { state: { from: location.pathname } })
                );
                return;
            }
            const email = userInfo.email.trim();
            const fullName = userInfo.full_name.trim();
            const phone = userInfo.phone.trim();
            if (!fullName || !email || !phone) {
                showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập đầy đủ thông tin nhận vé.');
                return;
            }

            setIsProcessing(true);

            try {
                // ✅ Bước 1: Tạo temp booking cho phần bù tiền
                const seatsWithPrice = selectedSeats.map(seat => ({
                    seat_id: seat.seat_id,
                    seat_row: seat.seat_row || '',
                    seat_number: seat.seat_number || '',
                    price: Number(seat.price || 0)
                }));

                const postData = {
                    userId: userInfo.user_id,
                    showtimeId,
                    ownerToken: null,
                    totalAmount: reschedulePayAmount, // ✅ Chỉ phần bù
                    discountAmount: 0,
                    couponId: null,
                    selectedSeats: seatsWithPrice,
                    selectedFoods: [],
                    customerEmail: email,
                    customerName: fullName,
                    customerPhone: phone,
                    movieTitle: movie?.title || '',
                    cinemaName: selectedCinema?.cinema_name || '',
                    startTime: selectedShowtime?.start_time || '',
                    // ✅ Báo cho backend biết đây là reschedule
                    isReschedule: true,
                    rescheduleBookingId,
                    newShowtimeId: showtimeId,
                    newSeatIds: selectedSeats.map(s => Number(s.seat_id)),
                };

                const response = await api.post('/api/payment/process-reschedule', postData);

                if (response.data?.success) {
                    const tempId = response.data.tempBookingId;
                    if (!tempId) throw new Error('Server không trả về tempBookingId.');

                    setTempBookingId(tempId);
                    localStorage.setItem('tempBookingId', tempId);

                    const finalState = {
                        tempBookingId: tempId,
                        mode: 'reschedule',
                        rescheduleBookingId,
                        isReschedulePayment: true,
                        deltaAmount: reschedulePayAmount,
                        oldTotalAmount,
                        newTotalAmount: grandTotal,
                        ownerToken: null,
                        showtimeId,
                        totalAmount: reschedulePayAmount,
                        customerName: fullName,
                        customerEmail: email,
                        customerPhone: phone,
                        movie,
                        selectedCinema,
                        selectedDate,
                        selectedShowtime,
                        selectedSeats,
                        selectedFoods: [],
                        foods: [],
                        totalTicketPrice,
                        totalFoodPrice: 0,
                        discountAmount: 0,
                        couponId: null,
                        showtimeDetail,
                    };

                    localStorage.setItem('lastSuccessTicket', JSON.stringify(finalState));

                    showNotice('info', 'ĐANG XỬ LÝ', 'Vui lòng chờ trong giây lát...');

                    if (paymentMethod === 'bank') {
                        const sendOtpResponse = await api.post('/api/bank/send-otp', {
                            email,
                            tempBookingId: tempId,
                            isReschedule: true,
                            rescheduleBookingId,
                        });
                        if (!sendOtpResponse.data?.success) {
                            throw new Error(sendOtpResponse.data?.message || 'Không thể gửi OTP.');
                        }
                        localStorage.setItem('paymentInitiated', 'true');
                        navigate('/bank-app', { state: finalState });
                        return;
                    }

                    // MOMO
                    const sendMomoOtpResponse = await api.post('/api/momo/send-otp', {
                        email,
                        tempBookingId: tempId,
                        isReschedule: true,
                        rescheduleBookingId,
                    });
                    if (!sendMomoOtpResponse.data?.success) {
                        throw new Error(sendMomoOtpResponse.data?.message || 'Không thể gửi OTP.');
                    }
                    localStorage.setItem('momoTempBookingId', tempId);
                    localStorage.setItem('momoPaymentInitiated', 'true');
                    localStorage.setItem('momoCustomerEmail', email);
                    localStorage.setItem('momoCustomerName', fullName);
                    localStorage.setItem('momoCustomerPhone', phone);
                    localStorage.setItem('momoTotalAmount', String(reschedulePayAmount));
                    localStorage.setItem('momoMovie', JSON.stringify(movie));
                    localStorage.setItem('momoSelectedCinema', JSON.stringify(selectedCinema));
                    localStorage.setItem('momoSelectedDate', selectedDate || '');
                    localStorage.setItem('momoSelectedShowtime', JSON.stringify(selectedShowtime));
                    localStorage.setItem('momoSelectedSeats', JSON.stringify(selectedSeats));
                    localStorage.setItem('momoSelectedFoods', JSON.stringify([]));
                    localStorage.setItem('momoFoods', JSON.stringify([]));
                    localStorage.setItem('momoTotalTicketPrice', String(totalTicketPrice));
                    localStorage.setItem('momoTotalFoodPrice', '0');
                    localStorage.setItem('momoShowtimeDetail', JSON.stringify(showtimeDetail));
                    navigate('/momo-app', { state: finalState });
                    return;
                }

                showNotice('error', 'KHÔNG THỂ TIẾP TỤC', response.data?.message || 'Không thể xử lý thanh toán.');
            } catch (err) {
                console.error('❌ [PAYMENT] Reschedule payment error:', err);
                showNotice(
                    'error',
                    'LỖI THANH TOÁN',
                    err.response?.data?.message || err.message || 'Không thể xử lý thanh toán.'
                );
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // =============================================
        // FLOW THƯỜNG
        // =============================================
        if (!ownerToken) {
            showNotice(
                'error',
                'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ',
                'Không xác định được phiên giữ ghế. Vui lòng chọn lại ghế.',
                () => navigate('/')
            );
            return;
        }
        const holdExpiry = Number(localStorage.getItem('holdExpiresAt'));
        if (!Number.isFinite(holdExpiry) || holdExpiry <= Date.now()) {
            await handleTimeExpire();
            return;
        }
        if (!userInfo.user_id) {
            showNotice(
                'error',
                'YÊU CẦU ĐĂNG NHẬP',
                'Vui lòng đăng nhập để tiếp tục.',
                () => navigate('/login', { state: { from: location.pathname } })
            );
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

        // 🔥 Xóa OTP cũ
        try {
            await api.post('/api/auth/invalidate-otp', {
                email: email,
                purpose: 'PAYMENT'
            });
        } catch (err) {
            console.warn('⚠️ [PAYMENT] Failed to invalidate old OTP:', err);
        }

        const bankKeys = [
            'bankHasSentOtp', 'bankHasVisited', 'bankOtpTimeLeft', 'bankOtpInput',
            'bankLastOtpSentAt', 'paymentCompleted', 'completedBookingId', 'paymentInitiated', 'lastSuccessTicket'
        ];
        bankKeys.forEach(key => localStorage.removeItem(key));
        const momoKeys = [
            'momoHasSentOtp', 'momoHasVisited', 'momoOtpTimeLeft', 'momoOtpInput', 'momoLastOtpSentAt',
            'momoPaymentCompleted', 'momoCompletedBookingId', 'momoPaymentInitiated',
            'momoTempBookingId', 'momoCustomerEmail', 'momoCustomerName', 'momoCustomerPhone',
            'momoTotalAmount', 'momoMovie', 'momoSelectedCinema', 'momoSelectedDate',
            'momoSelectedShowtime', 'momoSelectedSeats', 'momoSelectedFoods', 'momoFoods',
            'momoTotalTicketPrice', 'momoTotalFoodPrice', 'momoShowtimeDetail',
            'momoIsLocked', 'momoLockTime', 'momoOtpAttempts', 'momoResendCooldown', 'momoOwnerToken'
        ];
        momoKeys.forEach(key => localStorage.removeItem(key));
        setIsProcessing(true);

        try {
            const seatsWithPrice = selectedSeats.map(seat => ({
                seat_id: seat.seat_id,
                seat_row: seat.seat_row || '',
                seat_number: seat.seat_number || '',
                price: Number(seat.price || 0)
            }));
            const invalidSeat = seatsWithPrice.some(seat => !seat.seat_id);
            if (invalidSeat) {
                showNotice('error', 'GHẾ KHÔNG HỢP LỆ', 'Dữ liệu ghế không hợp lệ. Vui lòng chọn lại ghế.');
                return;
            }
            const foodsWithQuantity = selectedFoods.map(food => ({
                product_id: food.product_id,
                product_name: food.product_name || '',
                quantity: Number(food.quantity || 1),
                price: Number(food.price || 0)
            }));
            const postData = {
                userId,
                showtimeId,
                ownerToken,
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
            if (response.data?.success) {
                const tempId = response.data.tempBookingId;
                if (!tempId) throw new Error('Server không trả về tempBookingId.');
                setTempBookingId(tempId);
                localStorage.setItem('tempBookingId', tempId);
                const finalState = {
                    tempBookingId: tempId,
                    ownerToken,
                    showtimeId,
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
                    discountAmount: Number(discountAmount),
                    couponId: appliedCouponId || null,
                    showtimeDetail
                };
                localStorage.setItem('lastSuccessTicket', JSON.stringify(finalState));
                localStorage.setItem('booking_owner_token', ownerToken);
                localStorage.removeItem('holdExpiresAt');
                localStorage.removeItem('selectedSeats');
                localStorage.removeItem('currentShowtimeId');
                setIsTimerActive(false);

                showNotice('info', 'ĐANG XỬ LÝ', 'Vui lòng chờ trong giây lát để hệ thống gửi mã OTP...');

                if (paymentMethod === 'bank') {
                    const sendOtpResponse = await api.post('/api/bank/send-otp', {
                        email,
                        tempBookingId: tempId
                    });
                    if (!sendOtpResponse.data?.success) {
                        throw new Error(sendOtpResponse.data?.message || 'Không thể gửi OTP.');
                    }
                    localStorage.setItem('paymentInitiated', 'true');
                    navigate('/bank-app', { state: finalState });
                    return;
                }

                // MOMO
                const sendMomoOtpResponse = await api.post('/api/momo/send-otp', {
                    email,
                    tempBookingId: tempId
                });
                if (!sendMomoOtpResponse.data?.success) {
                    throw new Error(sendMomoOtpResponse.data?.message || 'Không thể gửi OTP.');
                }
                localStorage.setItem('momoTempBookingId', tempId);
                localStorage.setItem('momoOwnerToken', ownerToken);
                localStorage.setItem('momoCustomerEmail', email);
                localStorage.setItem('momoCustomerName', fullName);
                localStorage.setItem('momoCustomerPhone', phone);
                localStorage.setItem('momoTotalAmount', String(grandTotal));
                localStorage.setItem('momoPaymentInitiated', 'true');
                localStorage.setItem('momoMovie', JSON.stringify(movie));
                localStorage.setItem('momoSelectedCinema', JSON.stringify(selectedCinema));
                localStorage.setItem('momoSelectedDate', selectedDate || '');
                localStorage.setItem('momoSelectedShowtime', JSON.stringify(selectedShowtime));
                localStorage.setItem('momoSelectedSeats', JSON.stringify(selectedSeats));
                localStorage.setItem('momoSelectedFoods', JSON.stringify(selectedFoods));
                localStorage.setItem('momoFoods', JSON.stringify(foods));
                localStorage.setItem('momoTotalTicketPrice', String(totalTicketPrice));
                localStorage.setItem('momoTotalFoodPrice', String(totalFoodPrice));
                localStorage.setItem('momoShowtimeDetail', JSON.stringify(showtimeDetail));
                localStorage.removeItem('paymentInitiated');
                navigate('/momo-app', { state: finalState });
                return;
            }
            localStorage.removeItem('paymentInitiated');
            showNotice('error', 'KHÔNG THỂ TIẾP TỤC', response.data?.message || 'Không thể xử lý thanh toán.');
        } catch (err) {
            console.error('❌ [PAYMENT] Lỗi thanh toán:', err);
            if (err.response?.status === 401) {
                localStorage.removeItem('paymentInitiated');
                showNotice(
                    'error',
                    'PHIÊN ĐĂNG NHẬP HẾT HẠN',
                    err.response?.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                    () => navigate('/login', { state: { from: location.pathname } })
                );
                return;
            }
            const errorCode = err.response?.data?.code || '';
            const errorMessage = err.response?.data?.message || err.message || 'Không thể xử lý thanh toán.';
            if (errorCode === 'SEAT_LOCKED' || errorCode === 'SEAT_NOT_LOCKED' || errorCode === 'LOCK_NOT_FOUND' || errorCode === 'LOCK_OWNER_MISMATCH' || errorCode === 'SEAT_HOLD_EXPIRED') {
                localStorage.removeItem('paymentInitiated');
                showNotice(
                    'error',
                    'GHẾ KHÔNG CÒN ĐƯỢC GIỮ',
                    'Ghế của bạn không còn được giữ. Vui lòng quay lại chọn ghế.',
                    () => { clearBookingData(); navigate('/'); }
                );
                return;
            }
            localStorage.removeItem('paymentInitiated');
            showNotice('error', 'LỖI THANH TOÁN', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // ============================================================
    // BEFORE UNLOAD
    // ============================================================

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            const hasOtp = localStorage.getItem('bankOtpInput') || localStorage.getItem('momoOtpInput');
            const hasSentOtp = localStorage.getItem('bankHasSentOtp') === 'true' || 
                               localStorage.getItem('momoHasSentOtp') === 'true';
            
            if ((hasOtp || hasSentOtp) && !isProcessing) {
                const email = userInfo.email || localStorage.getItem('momoCustomerEmail') || '';
                if (email) {
                    navigator.sendBeacon(
                        '/api/auth/invalidate-otp',
                        JSON.stringify({ email, purpose: 'PAYMENT' })
                    );
                }
                event.preventDefault();
                event.returnValue = 'Bạn đang trong quá trình thanh toán. Nếu rời trang, bạn có thể mất tiến trình!';
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [userInfo.email, isProcessing]);

    // ============================================================
    // ✅ RESCHEDULE: ĐANG XỬ LÝ HOÀN ĐIỂM
    // ============================================================

    if (isRescheduleMode && deltaAmount <= 0 && !modal.show) {
        return (
            <div className="payment-page">
                <div className="payment-container">
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh',
                        gap: 16
                    }}>
                        <RefreshCw size={48} className="spin-icon" style={{ color: '#f37021' }} />
                        <h2 style={{ margin: 0 }}>ĐANG XỬ LÝ ĐỔI SUẤT</h2>
                        <p style={{ color: '#666', margin: 0 }}>
                            {deltaAmount < 0
                                ? `Hệ thống đang hoàn ${Math.abs(deltaAmount).toLocaleString('vi-VN')} điểm vào tài khoản của bạn...`
                                : 'Đang xử lý đổi suất chiếu...'}
                        </p>
                    </div>
                </div>
                <Modal
                    show={modal.show}
                    type={modal.type}
                    title={modal.title}
                    message={modal.message}
                    onConfirm={modal.onConfirm}
                    onCancel={() => setModal(prev => ({ ...prev, show: false }))}
                />
            </div>
        );
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="payment-page">
            <Modal
                show={modal.show}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                onCancel={() => setModal(prev => ({ ...prev, show: false }))}
            />
            <PaymentPinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onConfirm={handleVerifyPinAndProceed}
                pin={pin}
                setPin={setPin}
                error={pinError}
                isLoading={isVerifyingPin}
                email={userInfo.email}
            />
            <div className="payment-container">
                <div className="payment-progress-wrapper">
                    <BookingProgress currentStep={4} />
                </div>
                <div className="payment-layout">
                    <main className="main-booking-area">
                        {isLoadingUser && (
                            <div className="payment-card loading-card">
                                <div className="payment-section-heading">
                                    <span className="payment-section-number">04</span>
                                    <div>
                                        <h3>KIỂM TRA PHIÊN ĐĂNG NHẬP</h3>
                                        <p>Vui lòng chờ trong giây lát...</p>
                                    </div>
                                </div>
                                <div className="loading-spinner">Đang kiểm tra đăng nhập...</div>
                            </div>
                        )}
                        {!isLoadingUser && userInfo.user_id && (
                            <>
                                {/* ✅ RESCHEDULE BANNER */}
                                {isRescheduleMode && (
                                    <div className="payment-card reschedule-notice-card">
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '12px 16px',
                                            background: '#fff3e6',
                                            border: '1px solid #f37021',
                                            borderRadius: 8
                                        }}>
                                            <RefreshCw size={20} style={{ color: '#f37021', flexShrink: 0 }} />
                                            <div>
                                                <strong style={{ display: 'block', marginBottom: 4 }}>
                                                    BẠN ĐANG ĐỔI SUẤT CHIẾU
                                                </strong>
                                                <span style={{ fontSize: 13, color: '#666' }}>
                                                    Chỉ cần bù thêm <strong style={{ color: '#f37021' }}>
                                                        {reschedulePayAmount.toLocaleString('vi-VN')} ₫
                                                    </strong> để hoàn tất đổi suất
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* COUPON — chỉ hiện khi KHÔNG phải reschedule */}
                                {!isRescheduleMode && (
                                    <div className="payment-card">
                                        <div className="payment-section-heading">
                                            <span className="payment-section-number">01</span>
                                            <div>
                                                <h3>MÃ GIẢM GIÁ</h3>
                                                <p>Nhập mã ưu đãi nếu bạn có</p>
                                            </div>
                                        </div>
                                        <div className="coupon-group">
                                            <input
                                                type="text"
                                                placeholder="Nhập mã giảm giá..."
                                                value={couponCode}
                                                onChange={e => setCouponCode(e.target.value)}
                                                disabled={isApplyingCoupon || isProcessing}
                                            />
                                            <LoadingButton
                                                type="button"
                                                loading={isApplyingCoupon}
                                                loadingText="Đang áp dụng..."
                                                onClick={handleApplyCoupon}
                                                disabled={isApplyingCoupon || isProcessing}
                                                className="coupon-btn"
                                                spinnerColor="#ffffff"
                                            >
                                                ÁP DỤNG
                                            </LoadingButton>
                                        </div>
                                    </div>
                                )}

                                {/* THÔNG TIN NHẬN VÉ */}
                                <div className="payment-card">
                                    <div className="payment-section-heading">
                                        <span className="payment-section-number">{isRescheduleMode ? '01' : '02'}</span>
                                        <div>
                                            <h3>THÔNG TIN NHẬN VÉ</h3>
                                            <p>Thông tin dùng để gửi vé điện tử</p>
                                        </div>
                                    </div>
                                    <div className="form-grid">
                                        <div className="payment-field">
                                            <label>HỌ VÀ TÊN</label>
                                            <input
                                                type="text"
                                                placeholder="Nhập họ và tên"
                                                value={userInfo.full_name}
                                                onChange={e => setUserInfo(prev => ({ ...prev, full_name: e.target.value }))}
                                                disabled={isProcessing}
                                            />
                                        </div>
                                        <div className="payment-field">
                                            <label>SỐ ĐIỆN THOẠI</label>
                                            <input
                                                type="text"
                                                placeholder="Nhập số điện thoại"
                                                value={userInfo.phone}
                                                onChange={e => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>
                                    <div className="payment-field">
                                        <label>EMAIL NHẬN VÉ</label>
                                        <input
                                            type="email"
                                            placeholder="Nhập email nhận vé"
                                            value={userInfo.email}
                                            onChange={e => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                </div>

                                {/* HÌNH THỨC THANH TOÁN */}
                                <div className="payment-card">
                                    <div className="payment-section-heading">
                                        <span className="payment-section-number">{isRescheduleMode ? '02' : '03'}</span>
                                        <div>
                                            <h3>HÌNH THỨC THANH TOÁN</h3>
                                            <p>Chọn phương thức thanh toán</p>
                                        </div>
                                    </div>
                                    <div className="payment-methods">
                                        <label className={`payment-method ${paymentMethod === 'bank' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                checked={paymentMethod === 'bank'}
                                                onChange={() => setPaymentMethod('bank')}
                                                disabled={isProcessing}
                                            />
                                            <div className="payment-method-info">
                                                <strong>VietQR</strong>
                                                <span>Thanh toán qua ngân hàng</span>
                                            </div>
                                            <span className="payment-method-check">{paymentMethod === 'bank' && '✓'}</span>
                                        </label>
                                        <label className={`payment-method ${paymentMethod === 'momo' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                checked={paymentMethod === 'momo'}
                                                onChange={() => setPaymentMethod('momo')}
                                                disabled={isProcessing}
                                            />
                                            <div className="payment-method-info">
                                                <strong>MoMo</strong>
                                                <span>Thanh toán qua ví điện tử</span>
                                            </div>
                                            <span className="payment-method-check">{paymentMethod === 'momo' && '✓'}</span>
                                        </label>
                                    </div>
                                    <div className="payment-total">
                                        <span>TỔNG THANH TOÁN</span>
                                        <strong>
                                            {isRescheduleMode
                                                ? reschedulePayAmount.toLocaleString('vi-VN')
                                                : grandTotal.toLocaleString('vi-VN')
                                            } ₫
                                        </strong>
                                    </div>
                                    <div className="payment-actions">
                                        <LoadingButton
                                            type="button"
                                            loading={isProcessing}
                                            loadingText="ĐANG XỬ LÝ..."
                                            onClick={onConfirmPaymentClick}
                                            disabled={isProcessing || isLoadingUser}
                                            className="btn-next"
                                            spinnerColor="#ffffff"
                                        >
                                            {isRescheduleMode ? 'XÁC NHẬN ĐỔI VÉ' : 'XÁC NHẬN THANH TOÁN'}
                                        </LoadingButton>
                                        <button type="button" className="btn-back" onClick={() => navigate(-1)} disabled={isProcessing}>
                                            ← QUAY LẠI
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </main>
                    <aside className="payment-sidebar">
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
                            grandTotal={isRescheduleMode ? reschedulePayAmount : grandTotal}
                            isTimerActive={isTimerActive}
                            onExpire={handleTimeExpire}
                            showFoodSection={!isRescheduleMode}
                        />
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default Payment;