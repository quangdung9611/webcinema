// ============================================================
// PAYMENT PAGE
// Bước 4: THANH TOÁN
// ============================================================

import React, {
    useState,
    useEffect
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import api from '../../api/api';

// ============================================================
// COMPONENTS
// ============================================================

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';
import PaymentPinModal from '../components/PaymentPinModal';
import BookingProgress from '../components/BookingProgress';

// ============================================================
// STYLES
// ============================================================

import '../styles/Payment.css';


// ============================================================
// COMPONENT
// ============================================================

const Payment = () => {

    const location = useLocation();
    const navigate = useNavigate();


    // ============================================================
    // LẤY DỮ LIỆU BOOKING
    // ============================================================

    const getStateData = () => {

        const stateData =
            location.state || {};


        // --------------------------------------------------------
        // ƯU TIÊN LOCATION.STATE NẾU CÓ GHẾ
        // --------------------------------------------------------

        if (
            Array.isArray(
                stateData.selectedSeats
            ) &&
            stateData.selectedSeats.length > 0
        ) {

            return stateData;
        }


        // --------------------------------------------------------
        // FALLBACK BOOKING_TEMP
        // --------------------------------------------------------

        try {

            const savedBooking =
                localStorage.getItem(
                    'booking_temp'
                );


            if (savedBooking) {

                const parsed =
                    JSON.parse(savedBooking);


                if (
                    parsed &&
                    typeof parsed === 'object'
                ) {

                    return {
                        ...parsed,
                        ...stateData
                    };
                }
            }

        } catch (err) {

            console.error(
                '❌ [PAYMENT] Lỗi đọc booking_temp:',
                err
            );
        }


        return stateData;
    };


    const initialData =
        getStateData();


    // ============================================================
    // BOOKING DATA
    // ============================================================

    const movie =
        initialData.movie || {};


    const selectedCinema =
        initialData.selectedCinema || {};


    const selectedDate =
        initialData.selectedDate || '';


    const selectedShowtime =
        initialData.selectedShowtime || {};


    const selectedSeats =
        Array.isArray(
            initialData.selectedSeats
        )
            ? initialData.selectedSeats
            : [];


    const selectedFoods =
        Array.isArray(
            initialData.selectedFoods
        )
            ? initialData.selectedFoods
            : [];


    const foods =
        Array.isArray(
            initialData.foods
        )
            ? initialData.foods
            : [];


    const totalTicketPrice =
        Number(
            initialData.totalTicketPrice || 0
        );


    const totalFoodPrice =
        Number(
            initialData.totalFoodPrice || 0
        );


    const showtimeDetail =
        initialData.showtimeDetail || {};


    // ============================================================
    // OWNER TOKEN
    //
    // Backend hiện tại:
    //
    // ownerToken = socket.id
    //
    // Ưu tiên state trước, sau đó localStorage.
    // ============================================================

    const ownerToken =
        initialData.ownerToken ||
        localStorage.getItem(
            'booking_owner_token'
        ) ||
        '';


    // ============================================================
    // SHOWTIME ID
    // ============================================================

    const showtimeId =
        initialData.showtimeId ||
        initialData.showtime_id ||
        selectedShowtime?.showtime_id ||
        selectedShowtime?.id ||
        null;


    // ============================================================
    // STATES
    // ============================================================

    const [user, setUser] =
        useState(null);


    const [isLoadingUser, setIsLoadingUser] =
        useState(true);


    const [couponCode, setCouponCode] =
        useState('');


    const [discountAmount, setDiscountAmount] =
        useState(0);


    const [appliedCouponId, setAppliedCouponId] =
        useState(null);


    const [paymentMethod, setPaymentMethod] =
        useState('bank');


    const [isTimerActive, setIsTimerActive] =
        useState(false);


    const [isProcessing, setIsProcessing] =
        useState(false);


    const [isApplyingCoupon, setIsApplyingCoupon] =
        useState(false);


    const [tempBookingId, setTempBookingId] =
        useState(() => {

            return (
                localStorage.getItem(
                    'tempBookingId'
                ) || null
            );
        });


    const [userInfo, setUserInfo] =
        useState({

            user_id: '',
            full_name: '',
            email: '',
            phone: ''
        });


    const [modal, setModal] =
        useState({

            show: false,
            type: '',
            title: '',
            message: '',
            onConfirm: null
        });


    const [showPinModal, setShowPinModal] =
        useState(false);


    const [pin, setPin] =
        useState('');


    const [pinError, setPinError] =
        useState('');


    const [isVerifyingPin, setIsVerifyingPin] =
        useState(false);


    // ============================================================
    // NOTICE MODAL
    // ============================================================

    const showNotice = (
        type,
        title,
        message,
        onConfirm = null
    ) => {

        setModal({

            show: true,

            type,

            title,

            message,

            onConfirm:
                onConfirm ||
                (() =>
                    setModal(prev => ({
                        ...prev,
                        show: false
                    })))
        });
    };


    // ============================================================
    // TOTAL
    // ============================================================

    const subTotal =
        Number(totalTicketPrice || 0) +
        Number(totalFoodPrice || 0);


    const grandTotal =
        Math.max(
            0,
            subTotal -
            Number(discountAmount || 0)
        );


    // ============================================================
    // CHECK SESSION
    // ============================================================

    const checkSession = async () => {

        setIsLoadingUser(true);


        try {

            const response =
                await api.get(
                    '/api/auth/me'
                );


            const userData =
                response.data?.user;


            if (
                userData &&
                userData.user_id
            ) {

                setUser(userData);


                setUserInfo({

                    user_id:
                        userData.user_id,

                    full_name:
                        userData.full_name || '',

                    email:
                        userData.email || '',

                    phone:
                        userData.phone || ''
                });


                return true;
            }


            throw new Error(
                'Invalid session'
            );

        } catch (error) {

            console.error(
                '❌ [PAYMENT] Check session error:',
                error
            );


            if (
                error.response?.status === 401
            ) {

                showNotice(

                    'error',

                    'YÊU CẦU ĐĂNG NHẬP',

                    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',

                    () =>
                        navigate(
                            '/login',
                            {
                                state: {
                                    from:
                                        location.pathname
                                }
                            }
                        )
                );
            }


            return false;

        } finally {

            setIsLoadingUser(false);
        }
    };


    // ============================================================
    // QUAY LẠI TỪ FORGOT PIN
    // ============================================================

    useEffect(() => {

        if (
            location.state?.fromForgotPin
        ) {

            setShowPinModal(true);

            setPin('');

            setPinError('');


            window.history.replaceState(
                {},
                document.title
            );
        }

    }, [location.state]);


    // ============================================================
    // INIT
    // ============================================================

    useEffect(() => {

        window.scrollTo(0, 0);


        // --------------------------------------------------------
        // CHECK BOOKING
        // --------------------------------------------------------

        if (
            !movie ||
            typeof movie !== 'object' ||
            selectedSeats.length === 0
        ) {

            console.warn(
                '⚠️ [PAYMENT] Booking không hợp lệ'
            );


            navigate('/');

            return;
        }


        // --------------------------------------------------------
        // CHECK OWNER TOKEN
        // --------------------------------------------------------

        if (!ownerToken) {

            console.warn(
                '⚠️ [PAYMENT] Không có ownerToken'
            );


            showNotice(

                'error',

                'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ',

                'Không xác định được phiên giữ ghế. Vui lòng chọn ghế lại.',

                () => {
                    navigate('/');
                }
            );


            return;
        }


        // --------------------------------------------------------
        // CHECK SHOWTIME
        // --------------------------------------------------------

        if (!showtimeId) {

            console.warn(
                '⚠️ [PAYMENT] Không có showtimeId'
            );


            showNotice(

                'error',

                'THÔNG TIN SUẤT CHIẾU KHÔNG HỢP LỆ',

                'Không xác định được suất chiếu. Vui lòng chọn lại.',

                () => {
                    navigate('/');
                }
            );


            return;
        }


        // --------------------------------------------------------
        // SAVE OWNER TOKEN
        // --------------------------------------------------------

        try {

            localStorage.setItem(
                'booking_owner_token',
                ownerToken
            );

        } catch (err) {

            console.error(
                '❌ [PAYMENT] Không thể lưu ownerToken:',
                err
            );
        }


        // --------------------------------------------------------
        // CHECK HOLD TIME
        // --------------------------------------------------------

        const holdExpiresAt =
            Number(
                localStorage.getItem(
                    'holdExpiresAt'
                )
            );


        if (
            !Number.isFinite(
                holdExpiresAt
            ) ||
            holdExpiresAt <= Date.now()
        ) {

            console.warn(
                '⏰ [PAYMENT] Hold time đã hết'
            );


            handleTimeExpireInternal();

            return;
        }


        setIsTimerActive(true);


        // --------------------------------------------------------
        // XÓA STATE BANK CŨ
        // --------------------------------------------------------

        const bankKeys = [

            'lastSuccessTicket',

            'bankHasSentOtp',
            'bankHasVisited',
            'bankOtpTimeLeft',
            'bankOtpInput',
            'bankLastOtpSentAt',

            'paymentCompleted',
            'completedBookingId',
            'paymentInitiated'
        ];


        bankKeys.forEach(
            key =>
                localStorage.removeItem(key)
        );


        // --------------------------------------------------------
        // XÓA STATE MOMO CŨ
        // --------------------------------------------------------

        const momoKeys = [

            'momoHasSentOtp',
            'momoHasVisited',
            'momoOtpTimeLeft',
            'momoOtpInput',
            'momoLastOtpSentAt',

            'momoPaymentCompleted',
            'momoCompletedBookingId',
            'momoPaymentInitiated',

            'momoTempBookingId',

            'momoCustomerEmail',
            'momoCustomerName',
            'momoCustomerPhone',

            'momoTotalAmount',

            'momoMovie',
            'momoSelectedCinema',
            'momoSelectedDate',
            'momoSelectedShowtime',
            'momoSelectedSeats',
            'momoSelectedFoods',
            'momoFoods',

            'momoTotalTicketPrice',
            'momoTotalFoodPrice',
            'momoShowtimeDetail',

            'momoIsLocked',
            'momoLockTime',

            'momoOtpAttempts',
            'momoResendCooldown',

            'momoOwnerToken'
        ];


        momoKeys.forEach(
            key =>
                localStorage.removeItem(key)
        );


        // --------------------------------------------------------
        // TEMP BOOKING ID
        // --------------------------------------------------------

        const savedTempId =
            localStorage.getItem(
                'tempBookingId'
            );


        if (savedTempId) {

            setTempBookingId(
                savedTempId
            );
        }


        // --------------------------------------------------------
        // VERIFY SESSION
        // --------------------------------------------------------

        const verifySession =
            async () => {

                const isValid =
                    await checkSession();


                if (!isValid) {
                    return;
                }


                const currentHold =
                    Number(
                        localStorage.getItem(
                            'holdExpiresAt'
                        )
                    );


                if (
                    Number.isFinite(
                        currentHold
                    ) &&
                    currentHold > Date.now()
                ) {

                    setIsTimerActive(
                        true
                    );

                } else {

                    handleTimeExpireInternal();
                }
            };


        verifySession();


        // --------------------------------------------------------
        // SESSION EXPIRED EVENT
        // --------------------------------------------------------

        const handleSessionExpired =
            event => {

                console.log(
                    '🔴 [PAYMENT] Session expired event:',
                    event.detail
                );


                showNotice(

                    'error',

                    'PHIÊN ĐĂNG NHẬP HẾT HẠN',

                    event.detail?.message ||
                        'Vui lòng đăng nhập lại để tiếp tục.',

                    () =>
                        navigate(
                            '/login',
                            {
                                state: {
                                    from:
                                        location.pathname
                                }
                            }
                        )
                );
            };


        window.addEventListener(
            'sessionExpired',
            handleSessionExpired
        );


        return () => {

            window.removeEventListener(
                'sessionExpired',
                handleSessionExpired
            );
        };

    }, [
        navigate,
        location.pathname,
        ownerToken,
        showtimeId,
        selectedSeats.length
    ]);


    // ============================================================
    // CLEAR BOOKING DATA
    // ============================================================

    const clearBookingData = () => {

        const keysToRemove = [

            // ----------------------------------------------------
            // SEATS
            // ----------------------------------------------------

            'selectedSeats',
            'holdExpiresAt',
            'currentShowtimeId',
            'booking_owner_token',

            // ----------------------------------------------------
            // BOOKING
            // ----------------------------------------------------

            'booking_seats',
            'booking_showtime',
            'booking_data',

            'booking_cinema',
            'booking_date',
            'booking_movie',
            'booking_showtime',

            // ----------------------------------------------------
            // FOOD
            // ----------------------------------------------------

            'selected_foods',
            'food_selection',
            'selectedFoods',

            // ----------------------------------------------------
            // TEMP
            // ----------------------------------------------------

            'booking_temp',
            'tempBookingId',

            // ----------------------------------------------------
            // PAYMENT
            // ----------------------------------------------------

            'lastSuccessTicket',
            'paymentInitiated'
        ];


        keysToRemove.forEach(
            key =>
                localStorage.removeItem(key)
        );
    };


    // ============================================================
    // TIMER EXPIRE - INTERNAL
    // ============================================================

    const handleTimeExpireInternal = () => {

        clearBookingData();

        setTempBookingId(null);

        setIsTimerActive(false);


        showNotice(

            'error',

            'HẾT THỜI GIAN GIỮ GHẾ',

            'Thời gian giữ ghế đã kết thúc. Vui lòng chọn lại ghế để tiếp tục.',

            () => {

                navigate('/');

                window.location.reload();
            }
        );
    };


    // ============================================================
    // TIMER EXPIRE
    // ============================================================

    const handleTimeExpire = async () => {

        // --------------------------------------------------------
        // CANCEL TEMP BOOKING NẾU ĐÃ TẠO
        // --------------------------------------------------------

        if (tempBookingId) {

            try {

                await api.post(
                    '/api/bank/cancel-timeout',
                    {
                        tempBookingId
                    }
                );

            } catch (err) {

                console.error(
                    '❌ [PAYMENT] Lỗi hủy temp booking:',
                    err
                );
            }
        }


        // --------------------------------------------------------
        // CLEAR
        // --------------------------------------------------------

        clearBookingData();

        setTempBookingId(null);

        setIsTimerActive(false);


        // --------------------------------------------------------
        // NOTICE
        // --------------------------------------------------------

        showNotice(

            'error',

            'HẾT THỜI GIAN GIỮ GHẾ',

            'Thời gian giữ ghế đã kết thúc. Vui lòng chọn lại ghế để tiếp tục.',

            () => {

                navigate('/');

                window.location.reload();
            }
        );
    };


    // ============================================================
    // APPLY COUPON
    // ============================================================

    const handleApplyCoupon = async () => {

        const inputCode =
            couponCode
                .toUpperCase()
                .trim();


        if (!inputCode) {

            showNotice(

                'error',

                'THIẾU THÔNG TIN',

                'Vui lòng nhập mã giảm giá.'
            );

            return;
        }


        if (!userInfo.user_id) {

            showNotice(

                'error',

                'LỖI',

                'Vui lòng đăng nhập lại.'
            );

            return;
        }


        setIsApplyingCoupon(true);


        try {

            const res =
                await api.post(
                    '/api/coupons/check',
                    {
                        code:
                            inputCode,

                        userId:
                            userInfo.user_id
                    }
                );


            if (
                res.data.success
            ) {

                const {
                    discount_value,
                    coupon_id
                } =
                    res.data.data;


                setDiscountAmount(
                    Number(
                        discount_value
                    )
                );


                setAppliedCouponId(
                    coupon_id
                );


                showNotice(

                    'success',

                    'THÀNH CÔNG',

                    'Áp dụng mã giảm giá thành công.'
                );
            }

        } catch (err) {

            console.error(
                '❌ [PAYMENT] Coupon error:',
                err
            );


            showNotice(

                'error',

                'THÔNG BÁO',

                err.response?.data?.message ||
                    'Mã không hợp lệ.'
            );

        } finally {

            setIsApplyingCoupon(false);
        }
    };


    // ============================================================
    // CLICK THANH TOÁN
    // ============================================================

    const onConfirmPaymentClick = () => {

        if (isProcessing) {
            return;
        }


        // --------------------------------------------------------
        // CHECK USER
        // --------------------------------------------------------

        if (!userInfo.user_id) {

            showNotice(

                'error',

                'YÊU CẦU ĐĂNG NHẬP',

                'Vui lòng đăng nhập để tiếp tục.',

                () =>
                    navigate(
                        '/login',
                        {
                            state: {
                                from:
                                    location.pathname
                            }
                        }
                    )
            );


            return;
        }


        // --------------------------------------------------------
        // CHECK OWNER TOKEN
        // --------------------------------------------------------

        if (!ownerToken) {

            showNotice(

                'error',

                'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ',

                'Không xác định được phiên giữ ghế. Vui lòng chọn ghế lại.',

                () => {
                    navigate('/');
                }
            );


            return;
        }


        // --------------------------------------------------------
        // CHECK SEATS
        // --------------------------------------------------------

        if (
            selectedSeats.length === 0
        ) {

            showNotice(

                'error',

                'CHƯA CHỌN GHẾ',

                'Vui lòng chọn ghế trước khi thanh toán.'
            );


            return;
        }


        // --------------------------------------------------------
        // CHECK SHOWTIME
        // --------------------------------------------------------

        if (!showtimeId) {

            showNotice(

                'error',

                'LỖI SUẤT CHIẾU',

                'Không xác định được suất chiếu.'
            );


            return;
        }


        // --------------------------------------------------------
        // CHECK HOLD
        // --------------------------------------------------------

        const holdExpiry =
            Number(
                localStorage.getItem(
                    'holdExpiresAt'
                )
            );


        if (
            !Number.isFinite(
                holdExpiry
            ) ||
            holdExpiry <= Date.now()
        ) {

            handleTimeExpire();

            return;
        }


        // --------------------------------------------------------
        // CHECK CUSTOMER INFO
        // --------------------------------------------------------

        if (
            !userInfo.full_name ||
            !userInfo.email ||
            !userInfo.phone
        ) {

            showNotice(

                'error',

                'THIẾU THÔNG TIN',

                'Vui lòng nhập đầy đủ thông tin nhận vé.'
            );


            return;
        }


        // --------------------------------------------------------
        // OPEN PIN
        // --------------------------------------------------------

        setShowPinModal(true);

        setPin('');

        setPinError('');
    };


    // ============================================================
    // VERIFY PIN
    // ============================================================

    const handleVerifyPinAndProceed =
        async () => {

            if (
                !/^\d{6}$/.test(pin)
            ) {

                setPinError(
                    'Vui lòng nhập mã PIN gồm 6 chữ số'
                );

                return;
            }


            setIsVerifyingPin(true);

            setPinError('');


            try {

                const pinResponse =
                    await api.post(
                        '/api/users/verify-pin',
                        {
                            pin
                        }
                    );


                if (
                    pinResponse.data.success
                ) {

                    setShowPinModal(
                        false
                    );

                    setPin('');


                    await handleProceed();
                }

            } catch (err) {

                console.error(
                    '❌ [PAYMENT] Verify PIN Error:',
                    err
                );


                setPinError(
                    err.response?.data?.message ||
                        'Mã PIN không đúng'
                );

            } finally {

                setIsVerifyingPin(false);
            }
        };


    // ============================================================
    // PAYMENT PROCESS
    // ============================================================

    const handleProceed =
        async () => {

            // ----------------------------------------------------
            // PREVENT DOUBLE REQUEST
            // ----------------------------------------------------

            if (isProcessing) {
                return;
            }


            // ----------------------------------------------------
            // CHECK OWNER TOKEN
            // ----------------------------------------------------

            if (!ownerToken) {

                showNotice(

                    'error',

                    'PHIÊN GIỮ GHẾ KHÔNG HỢP LỆ',

                    'Không xác định được phiên giữ ghế. Vui lòng chọn lại ghế.',

                    () => navigate('/')
                );


                return;
            }


            // ----------------------------------------------------
            // CHECK HOLD TIME
            // ----------------------------------------------------

            const holdExpiry =
                Number(
                    localStorage.getItem(
                        'holdExpiresAt'
                    )
                );


            if (
                !Number.isFinite(
                    holdExpiry
                ) ||
                holdExpiry <= Date.now()
            ) {

                await handleTimeExpire();

                return;
            }


            // ----------------------------------------------------
            // CHECK USER
            // ----------------------------------------------------

            if (!userInfo.user_id) {

                showNotice(

                    'error',

                    'YÊU CẦU ĐĂNG NHẬP',

                    'Vui lòng đăng nhập để tiếp tục.',

                    () =>
                        navigate(
                            '/login',
                            {
                                state: {
                                    from:
                                        location.pathname
                                }
                            }
                        )
                );


                return;
            }


            // ----------------------------------------------------
            // CUSTOMER INFO
            // ----------------------------------------------------

            const email =
                userInfo.email
                    .trim();


            const fullName =
                userInfo.full_name
                    .trim();


            const phone =
                userInfo.phone
                    .trim();


            const userId =
                userInfo.user_id;


            if (
                !fullName ||
                !email ||
                !phone
            ) {

                showNotice(

                    'error',

                    'THIẾU THÔNG TIN',

                    'Vui lòng nhập đầy đủ thông tin nhận vé.'
                );


                return;
            }


            // ----------------------------------------------------
            // RESET BANK STATE
            // ----------------------------------------------------

            const bankKeys = [

                'bankHasSentOtp',
                'bankHasVisited',
                'bankOtpTimeLeft',
                'bankOtpInput',
                'bankLastOtpSentAt',

                'paymentCompleted',
                'completedBookingId',
                'paymentInitiated',
                'lastSuccessTicket'
            ];


            bankKeys.forEach(
                key =>
                    localStorage.removeItem(key)
            );


            // ----------------------------------------------------
            // RESET MOMO STATE
            // ----------------------------------------------------

            const momoKeys = [

                'momoHasSentOtp',
                'momoHasVisited',
                'momoOtpTimeLeft',
                'momoOtpInput',
                'momoLastOtpSentAt',

                'momoPaymentCompleted',
                'momoCompletedBookingId',
                'momoPaymentInitiated',

                'momoTempBookingId',

                'momoCustomerEmail',
                'momoCustomerName',
                'momoCustomerPhone',

                'momoTotalAmount',

                'momoMovie',
                'momoSelectedCinema',
                'momoSelectedDate',
                'momoSelectedShowtime',
                'momoSelectedSeats',
                'momoSelectedFoods',
                'momoFoods',

                'momoTotalTicketPrice',
                'momoTotalFoodPrice',
                'momoShowtimeDetail',

                'momoIsLocked',
                'momoLockTime',

                'momoOtpAttempts',
                'momoResendCooldown',

                'momoOwnerToken'
            ];


            momoKeys.forEach(
                key =>
                    localStorage.removeItem(key)
            );


            setIsProcessing(true);


            try {

                // ------------------------------------------------
                // SEATS
                // ------------------------------------------------

                const seatsWithPrice =
                    selectedSeats.map(
                        seat => ({

                            seat_id:
                                seat.seat_id,

                            seat_row:
                                seat.seat_row ||
                                '',

                            seat_number:
                                seat.seat_number ||
                                '',

                            price:
                                Number(
                                    seat.price || 0
                                )
                        })
                    );


                // ------------------------------------------------
                // VALIDATE SEATS
                // ------------------------------------------------

                const invalidSeat =
                    seatsWithPrice.some(
                        seat =>
                            !seat.seat_id
                    );


                if (invalidSeat) {

                    showNotice(

                        'error',

                        'GHẾ KHÔNG HỢP LỆ',

                        'Dữ liệu ghế không hợp lệ. Vui lòng chọn lại ghế.'
                    );


                    return;
                }


                // ------------------------------------------------
                // FOODS
                // ------------------------------------------------

                const foodsWithQuantity =
                    selectedFoods.map(
                        food => ({

                            product_id:
                                food.product_id,

                            product_name:
                                food.product_name ||
                                '',

                            quantity:
                                Number(
                                    food.quantity || 1
                                ),

                            price:
                                Number(
                                    food.price || 0
                                )
                        })
                    );


                // ------------------------------------------------
                // REQUEST DATA
                //
                // QUAN TRỌNG:
                // ownerToken được gửi lên backend.
                // ------------------------------------------------

                const postData = {

                    userId,

                    showtimeId,

                    ownerToken,

                    totalAmount:
                        Number(
                            grandTotal
                        ),

                    discountAmount:
                        Number(
                            discountAmount
                        ),

                    couponId:
                        appliedCouponId ||
                        null,

                    selectedSeats:
                        seatsWithPrice,

                    selectedFoods:
                        foodsWithQuantity,

                    customerEmail:
                        email,

                    customerName:
                        fullName,

                    customerPhone:
                        phone,

                    movieTitle:
                        movie?.title ||
                        '',

                    cinemaName:
                        selectedCinema?.cinema_name ||
                        '',

                    startTime:
                        selectedShowtime?.start_time ||
                        ''
                };


                console.log(
                    '🟡 [PAYMENT] Processing payment:',
                    {
                        showtimeId,
                        ownerToken,
                        seats:
                            seatsWithPrice.map(
                                seat =>
                                    seat.seat_id
                            ),
                        totalAmount:
                            Number(
                                grandTotal
                            )
                    }
                );


                // ------------------------------------------------
                // PROCESS PAYMENT
                // ------------------------------------------------

                const response =
                    await api.post(
                        '/api/payment/process',
                        postData
                    );


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                if (
                    response.data?.success
                ) {

                    const tempId =
                        response.data.tempBookingId;


                    if (!tempId) {

                        throw new Error(
                            'Server không trả về tempBookingId.'
                        );
                    }


                    setTempBookingId(
                        tempId
                    );


                    localStorage.setItem(
                        'tempBookingId',
                        tempId
                    );


                    // ------------------------------------------------
                    // FINAL STATE
                    // ------------------------------------------------

                    const finalState = {

                        tempBookingId:
                            tempId,

                        ownerToken,

                        showtimeId,

                        totalAmount:
                            Number(
                                grandTotal
                            ),

                        customerName:
                            fullName,

                        customerEmail:
                            email,

                        customerPhone:
                            phone,

                        movie,

                        selectedCinema,

                        selectedDate,

                        selectedShowtime,

                        selectedSeats,

                        selectedFoods,

                        foods,

                        totalTicketPrice,

                        totalFoodPrice,

                        discountAmount:
                            Number(
                                discountAmount
                            ),

                        couponId:
                            appliedCouponId ||
                            null,

                        showtimeDetail
                    };


                    // ------------------------------------------------
                    // SAVE LAST SUCCESS TICKET
                    // ------------------------------------------------

                    localStorage.setItem(
                        'lastSuccessTicket',
                        JSON.stringify(
                            finalState
                        )
                    );


                    // ------------------------------------------------
                    // GIỮ OWNER TOKEN
                    //
                    // Không xóa booking_owner_token.
                    //
                    // Bank/MoMo vẫn đang dùng booking flow.
                    // ------------------------------------------------

                    localStorage.setItem(
                        'booking_owner_token',
                        ownerToken
                    );


                    // ------------------------------------------------
                    // CLEAR HOLD UI
                    //
                    // Không release Redis lock ở đây.
                    //
                    // Backend temp booking vẫn giữ ownership.
                    // ------------------------------------------------

                    localStorage.removeItem(
                        'holdExpiresAt'
                    );


                    localStorage.removeItem(
                        'selectedSeats'
                    );


                    localStorage.removeItem(
                        'currentShowtimeId'
                    );


                    setIsTimerActive(
                        false
                    );


                    // ------------------------------------------------
                    // BANK
                    // ------------------------------------------------

                    if (
                        paymentMethod ===
                        'bank'
                    ) {

                        localStorage.setItem(
                            'paymentInitiated',
                            'true'
                        );


                        navigate(
                            '/bank-app',
                            {
                                state:
                                    finalState
                            }
                        );


                        return;
                    }


                    // ------------------------------------------------
                    // MOMO
                    // ------------------------------------------------

                    localStorage.setItem(
                        'momoTempBookingId',
                        tempId
                    );


                    localStorage.setItem(
                        'momoOwnerToken',
                        ownerToken
                    );


                    localStorage.setItem(
                        'momoCustomerEmail',
                        email
                    );


                    localStorage.setItem(
                        'momoCustomerName',
                        fullName
                    );


                    localStorage.setItem(
                        'momoCustomerPhone',
                        phone
                    );


                    localStorage.setItem(
                        'momoTotalAmount',
                        String(
                            grandTotal
                        )
                    );


                    localStorage.setItem(
                        'momoPaymentInitiated',
                        'true'
                    );


                    // ------------------------------------------------
                    // MOMO BOOKING DATA
                    // ------------------------------------------------

                    localStorage.setItem(
                        'momoMovie',
                        JSON.stringify(
                            movie
                        )
                    );


                    localStorage.setItem(
                        'momoSelectedCinema',
                        JSON.stringify(
                            selectedCinema
                        )
                    );


                    localStorage.setItem(
                        'momoSelectedDate',
                        selectedDate || ''
                    );


                    localStorage.setItem(
                        'momoSelectedShowtime',
                        JSON.stringify(
                            selectedShowtime
                        )
                    );


                    localStorage.setItem(
                        'momoSelectedSeats',
                        JSON.stringify(
                            selectedSeats
                        )
                    );


                    localStorage.setItem(
                        'momoSelectedFoods',
                        JSON.stringify(
                            selectedFoods
                        )
                    );


                    localStorage.setItem(
                        'momoFoods',
                        JSON.stringify(
                            foods
                        )
                    );


                    localStorage.setItem(
                        'momoTotalTicketPrice',
                        String(
                            totalTicketPrice
                        )
                    );


                    localStorage.setItem(
                        'momoTotalFoodPrice',
                        String(
                            totalFoodPrice
                        )
                    );


                    localStorage.setItem(
                        'momoShowtimeDetail',
                        JSON.stringify(
                            showtimeDetail
                        )
                    );


                    // ------------------------------------------------
                    // MOMO KHÔNG DÙNG paymentInitiated
                    // ------------------------------------------------

                    localStorage.removeItem(
                        'paymentInitiated'
                    );


                    navigate(
                        '/momo-app',
                        {
                            state:
                                finalState
                        }
                    );


                    return;
                }


                // ------------------------------------------------
                // SERVER RESPONSE FAILED
                // ------------------------------------------------

                localStorage.removeItem(
                    'paymentInitiated'
                );


                const serverMessage =
                    response.data?.message ||
                    'Không thể xử lý thanh toán.';


                showNotice(

                    'error',

                    'KHÔNG THỂ TIẾP TỤC',

                    serverMessage
                );


            } catch (err) {

                console.error(
                    '❌ [PAYMENT] Lỗi thanh toán:',
                    err
                );


                // ------------------------------------------------
                // UNAUTHORIZED
                // ------------------------------------------------

                if (
                    err.response?.status ===
                    401
                ) {

                    localStorage.removeItem(
                        'paymentInitiated'
                    );


                    showNotice(

                        'error',

                        'PHIÊN ĐĂNG NHẬP HẾT HẠN',

                        err.response?.data?.message ||
                            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',

                        () =>
                            navigate(
                                '/login',
                                {
                                    state: {
                                        from:
                                            location.pathname
                                    }
                                }
                            )
                    );


                    return;
                }


                // ------------------------------------------------
                // REDIS LOCK ERROR
                // ------------------------------------------------

                const errorCode =
                    err.response?.data?.code ||
                    '';


                const errorMessage =
                    err.response?.data?.message ||
                    err.message ||
                    'Không thể xử lý thanh toán.';


                if (
                    errorCode ===
                        'SEAT_LOCKED' ||

                    errorCode ===
                        'SEAT_NOT_LOCKED' ||

                    errorCode ===
                        'LOCK_NOT_FOUND' ||

                    errorCode ===
                        'LOCK_OWNER_MISMATCH' ||

                    errorCode ===
                        'SEAT_HOLD_EXPIRED'
                ) {

                    localStorage.removeItem(
                        'paymentInitiated'
                    );


                    showNotice(

                        'error',

                        'GHẾ KHÔNG CÒN ĐƯỢC GIỮ',

                        'Ghế của bạn không còn được giữ. Vui lòng quay lại chọn ghế.',

                        () => {

                            clearBookingData();

                            navigate('/');
                        }
                    );


                    return;
                }


                // ------------------------------------------------
                // DEFAULT ERROR
                // ------------------------------------------------

                localStorage.removeItem(
                    'paymentInitiated'
                );


                showNotice(

                    'error',

                    'LỖI THANH TOÁN',

                    errorMessage
                );

            } finally {

                setIsProcessing(
                    false
                );
            }
        };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="payment-page">

            {/* ====================================================
                MODAL
            ==================================================== */}

            <Modal
                show={
                    modal.show
                }

                type={
                    modal.type
                }

                title={
                    modal.title
                }

                message={
                    modal.message
                }

                onConfirm={
                    modal.onConfirm
                }

                onCancel={() =>
                    setModal(
                        prev => ({
                            ...prev,
                            show: false
                        })
                    )
                }
            />


            {/* ====================================================
                PIN MODAL
            ==================================================== */}

            <PaymentPinModal

                isOpen={
                    showPinModal
                }

                onClose={() =>
                    setShowPinModal(
                        false
                    )
                }

                onConfirm={
                    handleVerifyPinAndProceed
                }

                pin={
                    pin
                }

                setPin={
                    setPin
                }

                error={
                    pinError
                }

                isLoading={
                    isVerifyingPin
                }

                email={
                    userInfo.email
                }
            />


            {/* ====================================================
                MAIN CONTAINER
            ==================================================== */}

            <div className="payment-container">

                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <div className="payment-progress-wrapper">

                    <BookingProgress
                        currentStep={4}
                    />

                </div>


                {/* ==================================================
                    BOOKING CONTENT
                ================================================== */}

                <div className="payment-layout">


                    {/* =================================================
                        MAIN - BÊN TRÁI
                    ================================================= */}

                    <main className="main-booking-area">


                        {/* ==============================================
                            LOADING USER
                        ============================================== */}

                        {isLoadingUser && (

                            <div className="payment-card loading-card">

                                <div className="payment-section-heading">

                                    <span className="payment-section-number">
                                        04
                                    </span>


                                    <div>

                                        <h3>
                                            KIỂM TRA PHIÊN ĐĂNG NHẬP
                                        </h3>

                                        <p>
                                            Vui lòng chờ trong giây lát...
                                        </p>

                                    </div>

                                </div>


                                <div className="loading-spinner">
                                    Đang kiểm tra đăng nhập...
                                </div>

                            </div>
                        )}


                        {/* ==============================================
                            PAYMENT CONTENT
                        ============================================== */}

                        {!isLoadingUser &&
                            userInfo.user_id && (

                                <>


                                    {/* ====================================
                                        COUPON
                                    ==================================== */}

                                    <div className="payment-card">

                                        <div className="payment-section-heading">

                                            <span className="payment-section-number">
                                                01
                                            </span>


                                            <div>

                                                <h3>
                                                    MÃ GIẢM GIÁ
                                                </h3>

                                                <p>
                                                    Nhập mã ưu đãi nếu bạn có
                                                </p>

                                            </div>

                                        </div>


                                        <div className="coupon-group">

                                            <input
                                                type="text"
                                                placeholder="Nhập mã giảm giá..."
                                                value={
                                                    couponCode
                                                }
                                                onChange={e =>
                                                    setCouponCode(
                                                        e.target.value
                                                    )
                                                }
                                                disabled={
                                                    isApplyingCoupon ||
                                                    isProcessing
                                                }
                                            />


                                            <LoadingButton

                                                type="button"

                                                loading={
                                                    isApplyingCoupon
                                                }

                                                loadingText="Đang áp dụng..."

                                                onClick={
                                                    handleApplyCoupon
                                                }

                                                disabled={
                                                    isApplyingCoupon ||
                                                    isProcessing
                                                }

                                                className="coupon-btn"

                                                spinnerColor="#ffffff"
                                            >
                                                ÁP DỤNG
                                            </LoadingButton>

                                        </div>

                                    </div>


                                    {/* ====================================
                                        CUSTOMER INFO
                                    ==================================== */}

                                    <div className="payment-card">

                                        <div className="payment-section-heading">

                                            <span className="payment-section-number">
                                                02
                                            </span>


                                            <div>

                                                <h3>
                                                    THÔNG TIN NHẬN VÉ
                                                </h3>

                                                <p>
                                                    Thông tin dùng để gửi vé điện tử
                                                </p>

                                            </div>

                                        </div>


                                        <div className="form-grid">


                                            <div className="payment-field">

                                                <label>
                                                    HỌ VÀ TÊN
                                                </label>


                                                <input
                                                    type="text"
                                                    placeholder="Nhập họ và tên"
                                                    value={
                                                        userInfo.full_name
                                                    }
                                                    onChange={e =>
                                                        setUserInfo(
                                                            prev => ({
                                                                ...prev,
                                                                full_name:
                                                                    e.target.value
                                                            })
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                />

                                            </div>


                                            <div className="payment-field">

                                                <label>
                                                    SỐ ĐIỆN THOẠI
                                                </label>


                                                <input
                                                    type="text"
                                                    placeholder="Nhập số điện thoại"
                                                    value={
                                                        userInfo.phone
                                                    }
                                                    onChange={e =>
                                                        setUserInfo(
                                                            prev => ({
                                                                ...prev,
                                                                phone:
                                                                    e.target.value
                                                            })
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                />

                                            </div>

                                        </div>


                                        <div className="payment-field">

                                            <label>
                                                EMAIL NHẬN VÉ
                                            </label>


                                            <input
                                                type="email"
                                                placeholder="Nhập email nhận vé"
                                                value={
                                                    userInfo.email
                                                }
                                                onChange={e =>
                                                    setUserInfo(
                                                        prev => ({
                                                            ...prev,
                                                            email:
                                                                e.target.value
                                                        })
                                                    )
                                                }
                                                disabled={
                                                    isProcessing
                                                }
                                            />

                                        </div>

                                    </div>


                                    {/* ====================================
                                        PAYMENT METHOD
                                    ==================================== */}

                                    <div className="payment-card">

                                        <div className="payment-section-heading">

                                            <span className="payment-section-number">
                                                03
                                            </span>


                                            <div>

                                                <h3>
                                                    HÌNH THỨC THANH TOÁN
                                                </h3>

                                                <p>
                                                    Chọn phương thức thanh toán
                                                </p>

                                            </div>

                                        </div>


                                        <div className="payment-methods">


                                            {/* ==================================
                                                BANK
                                            ================================== */}

                                            <label
                                                className={`payment-method ${
                                                    paymentMethod ===
                                                    'bank'
                                                        ? 'active'
                                                        : ''
                                                }`}
                                            >

                                                <input
                                                    type="radio"
                                                    checked={
                                                        paymentMethod ===
                                                        'bank'
                                                    }
                                                    onChange={() =>
                                                        setPaymentMethod(
                                                            'bank'
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                />


                                                <div className="payment-method-info">

                                                    <strong>
                                                        VietQR
                                                    </strong>

                                                    <span>
                                                        Thanh toán qua ngân hàng
                                                    </span>

                                                </div>


                                                <span className="payment-method-check">

                                                    {paymentMethod ===
                                                        'bank' &&
                                                        '✓'}

                                                </span>

                                            </label>


                                            {/* ==================================
                                                MOMO
                                            ================================== */}

                                            <label
                                                className={`payment-method ${
                                                    paymentMethod ===
                                                    'momo'
                                                        ? 'active'
                                                        : ''
                                                }`}
                                            >

                                                <input
                                                    type="radio"
                                                    checked={
                                                        paymentMethod ===
                                                        'momo'
                                                    }
                                                    onChange={() =>
                                                        setPaymentMethod(
                                                            'momo'
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                />


                                                <div className="payment-method-info">

                                                    <strong>
                                                        MoMo
                                                    </strong>

                                                    <span>
                                                        Thanh toán qua ví điện tử
                                                    </span>

                                                </div>


                                                <span className="payment-method-check">

                                                    {paymentMethod ===
                                                        'momo' &&
                                                        '✓'}

                                                </span>

                                            </label>

                                        </div>


                                        {/* ==============================
                                            PAYMENT TOTAL
                                        ============================== */}

                                        <div className="payment-total">

                                            <span>
                                                TỔNG THANH TOÁN
                                            </span>


                                            <strong>

                                                {grandTotal.toLocaleString(
                                                    'vi-VN'
                                                )}{' '}
                                                ₫

                                            </strong>

                                        </div>


                                        {/* ==============================
                                            ACTIONS
                                        ============================== */}

                                        <div className="payment-actions">


                                            <LoadingButton

                                                type="button"

                                                loading={
                                                    isProcessing
                                                }

                                                loadingText="ĐANG XỬ LÝ..."

                                                onClick={
                                                    onConfirmPaymentClick
                                                }

                                                disabled={
                                                    isProcessing ||
                                                    isLoadingUser
                                                }

                                                className="btn-next"

                                                spinnerColor="#ffffff"
                                            >
                                                XÁC NHẬN THANH TOÁN
                                            </LoadingButton>


                                            <button
                                                type="button"
                                                className="btn-back"
                                                onClick={() =>
                                                    navigate(-1)
                                                }
                                                disabled={
                                                    isProcessing
                                                }
                                            >
                                                ← QUAY LẠI
                                            </button>

                                        </div>

                                    </div>

                                </>
                            )}

                    </main>


                    {/* =================================================
                        SIDEBAR - BÊN PHẢI
                    ================================================= */}

                    <aside className="payment-sidebar">

                        <BookingSidebar

                            movie={
                                movie
                            }

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
                                Array.isArray(
                                    selectedSeats
                                )
                                    ? selectedSeats
                                    : []
                            }

                            foods={
                                Array.isArray(
                                    foods
                                )
                                    ? foods
                                    : []
                            }

                            selectedFoods={
                                Array.isArray(
                                    selectedFoods
                                )
                                    ? selectedFoods
                                    : []
                            }

                            totalTicketPrice={
                                totalTicketPrice
                            }

                            totalFoodPrice={
                                totalFoodPrice
                            }

                            grandTotal={
                                grandTotal
                            }

                            isTimerActive={
                                isTimerActive
                            }

                            onExpire={
                                handleTimeExpire
                            }

                            showFoodSection={
                                true
                            }

                        />

                    </aside>

                </div>

            </div>

        </div>
    );
};


export default Payment;