
// =========================================================
// FOOD.JS
// PREMIUM SILVER BOOKING FLOW
// =========================================================

import React, {
    useState,
    useEffect,
    useMemo
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import api from '../../api/api';

// =========================================================
// COMPONENTS
// =========================================================

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import BookingProgress from '../components/BookingProgress';
import LoadingButton from '../components/LoadingButton';

// =========================================================
// STYLES
// =========================================================

import '../styles/Food.css';


// =========================================================
// COMPONENT
// =========================================================

const Food = () => {

    const location = useLocation();
    const navigate = useNavigate();


    // =====================================================
    // MODAL HẾT GIỜ
    // =====================================================

    const [showExpiredModal, setShowExpiredModal] =
        useState(false);


    // =====================================================
    // LẤY BOOKING DATA
    // =====================================================

    const getStateData = () => {

        const stateData = location.state || {};


        if (
            !stateData.selectedSeats ||
            stateData.selectedSeats.length === 0
        ) {

            try {

                const savedBooking =
                    localStorage.getItem('booking_temp');


                if (savedBooking) {

                    const parsed =
                        JSON.parse(savedBooking);

                    return parsed;
                }

            } catch (err) {

                console.error(
                    'Lỗi đọc booking_temp từ localStorage:',
                    err
                );
            }
        }


        return stateData;
    };


    const initialData = getStateData();


    // =====================================================
    // BOOKING DATA
    // =====================================================

    const {
        movie = initialData.movie || {},

        selectedCinema =
            initialData.selectedCinema || {},

        selectedDate =
            initialData.selectedDate || '',

        selectedShowtime =
            initialData.selectedShowtime || {},

        selectedSeats =
            initialData.selectedSeats || [],

        showtimeDetail =
            initialData.showtimeDetail || {}

    } = location.state || initialData;


    // =====================================================
    // GET SAVED FOODS
    // =====================================================

    const getSavedFoods = () => {

        try {

            const savedFoods =
                localStorage.getItem('selectedFoods');


            if (savedFoods) {

                return JSON.parse(savedFoods);
            }

        } catch (err) {

            console.error(
                'Lỗi đọc selectedFoods từ localStorage:',
                err
            );
        }


        return {};
    };


    // =====================================================
    // STATE
    // =====================================================

    const [foods, setFoods] = useState([]);

    const [selectedFoods, setSelectedFoods] =
        useState(getSavedFoods);

    const [isTimerActive, setIsTimerActive] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [loadingFoods, setLoadingFoods] =
        useState(false);


    // =====================================================
    // SAVE FOOD SELECTION
    // =====================================================

    useEffect(() => {

        try {

            localStorage.setItem(
                'selectedFoods',
                JSON.stringify(selectedFoods)
            );

        } catch (err) {

            console.error(
                'Lỗi lưu selectedFoods vào localStorage:',
                err
            );
        }

    }, [selectedFoods]);


    // =====================================================
    // INITIAL CHECK + FETCH FOODS
    // =====================================================

    useEffect(() => {

        window.scrollTo(0, 0);


        // -------------------------------------------------
        // CHECK SEATS
        // -------------------------------------------------

        if (
            !selectedSeats ||
            selectedSeats.length === 0
        ) {

            try {

                const savedBooking =
                    localStorage.getItem('booking_temp');


                if (savedBooking) {

                    const parsed =
                        JSON.parse(savedBooking);


                    if (
                        parsed.selectedSeats &&
                        parsed.selectedSeats.length > 0
                    ) {

                        // Có dữ liệu

                    } else {

                        navigate('/');
                        return;
                    }

                } else {

                    navigate('/');
                    return;
                }

            } catch (err) {

                navigate('/');
                return;
            }
        }


        // -------------------------------------------------
        // CHECK TIMER
        // -------------------------------------------------

        if (
            localStorage.getItem('holdExpiresAt')
        ) {

            setIsTimerActive(true);

        } else {

            navigate('/');
            return;
        }


        // -------------------------------------------------
        // FETCH FOODS
        // -------------------------------------------------

        const fetchFoods = async () => {

            setLoadingFoods(true);

            try {

                const res =
                    await api.get('/api/foods');


                if (
                    res.data &&
                    Array.isArray(res.data.data)
                ) {

                    setFoods(res.data.data);

                } else {

                    console.error(
                        'Dữ liệu không đúng định dạng:',
                        res.data
                    );

                    setFoods([]);
                }

            } catch (err) {

                console.error(
                    'Lỗi tải thức ăn:',
                    err
                );

                setFoods([]);

            } finally {

                setLoadingFoods(false);
            }
        };


        fetchFoods();

    }, [selectedSeats, navigate]);


    // =====================================================
    // HẾT GIỜ GIỮ GHẾ
    // =====================================================

    const handleTimeExpire = () => {

        const keysToRemove = [

            'selectedSeats',
            'holdExpiresAt',
            'currentShowtimeId',

            'booking_seats',
            'booking_showtime',
            'booking_data',

            'selected_foods',
            'food_selection',

            'booking_cinema',
            'booking_date',
            'booking_movie',
            'booking_showtime',

            'selectedFoods',

            'booking_temp'
        ];


        keysToRemove.forEach(
            key => localStorage.removeItem(key)
        );


        setShowExpiredModal(true);
    };


    // =====================================================
    // MODAL CONFIRM
    // =====================================================

    const handleModalConfirm = () => {

        setShowExpiredModal(false);

        navigate('/');
    };


    // =====================================================
    // UPDATE QUANTITY
    // =====================================================

    const updateQty = (id, delta) => {

        setSelectedFoods(prev => ({

            ...prev,

            [id]: Math.max(
                0,
                (prev[id] || 0) + delta
            )

        }));
    };


    // =====================================================
    // TOTAL TICKET
    // =====================================================

    const totalTicketPrice = useMemo(() => {

        return selectedSeats.reduce(
            (sum, seat) =>
                sum + Number(seat.price),
            0
        );

    }, [selectedSeats]);


    // =====================================================
    // TOTAL FOOD
    // =====================================================

    const totalFoodPrice = useMemo(() => {

        return foods.reduce(
            (sum, item) => {

                return (
                    sum +
                    Number(item.price) *
                    (selectedFoods[item.product_id] || 0)
                );

            },
            0
        );

    }, [foods, selectedFoods]);


    // =====================================================
    // GRAND TOTAL
    // =====================================================

    const grandTotal =
        totalTicketPrice +
        totalFoodPrice;


    // =====================================================
    // CONTINUE PAYMENT
    // =====================================================

    const handleContinue = () => {

        setLoading(true);


        const finalFoods = foods

            .filter(
                food =>
                    (selectedFoods[food.product_id] || 0) > 0
            )

            .map(food => ({

                product_id:
                    food.product_id,

                product_name:
                    food.product_name,

                quantity:
                    selectedFoods[food.product_id],

                price:
                    food.price
            }));


        const finalBookingData = {

            ...location.state,

            selectedFoods:
                finalFoods,

            totalTicketPrice,

            totalFoodPrice,

            grandTotal
        };


        // -------------------------------------------------
        // SAVE BOOKING
        // -------------------------------------------------

        localStorage.setItem(
            'booking_temp',
            JSON.stringify(finalBookingData)
        );


        localStorage.setItem(
            'selectedFoods',
            JSON.stringify(selectedFoods)
        );


        // -------------------------------------------------
        // PAYMENT
        // -------------------------------------------------

        navigate(
            '/payment',
            {
                state: finalBookingData
            }
        );
    };


    // =====================================================
    // RENDER FOOD LIST
    // =====================================================

    const renderFoods = () => {

        // -------------------------------------------------
        // LOADING
        // -------------------------------------------------

        if (loadingFoods) {

            return (

                <div className="food-loading">

                    <div className="food-loading-inner">

                        <LoadingButton
                            loading={true}
                            loadingText="Đang tải đồ ăn..."
                            className="food-loading-btn"
                            spinnerColor="#ffffff"
                        />

                    </div>

                </div>
            );
        }


        // -------------------------------------------------
        // EMPTY
        // -------------------------------------------------

        if (foods.length === 0) {

            return (

                <div className="food-empty">

                    <div className="food-empty-icon">
                        🍿
                    </div>

                    <h3>
                        CHƯA CÓ COMBO
                    </h3>

                    <p>
                        Hiện chưa có combo bắp nước nào.
                    </p>

                </div>
            );
        }


        // -------------------------------------------------
        // FOOD CARDS
        // -------------------------------------------------

        return foods.map(item => {

            const quantity =
                selectedFoods[item.product_id] || 0;


            return (

                <article
                    key={item.product_id}
                    className={`food-card ${
                        quantity > 0
                            ? 'is-selected'
                            : ''
                    }`}
                >

                    {/* ======================================
                        IMAGE
                    ====================================== */}

                    <div className="food-image-wrapper">

                        <div className="food-image">

                            {item.food_image ? (

                                <img
                                    src={`https://api.quangdungcinema.id.vn/uploads/foods/${item.food_image}`}
                                    alt={item.product_name}
                                    loading="lazy"
                                />

                            ) : (

                                <div className="food-no-image">
                                    🍿
                                </div>

                            )}

                        </div>


                        {/* SELECTED BADGE */}

                        {quantity > 0 && (

                            <div className="food-selected-badge">
                                ĐÃ CHỌN
                            </div>
                        )}

                    </div>


                    {/* ======================================
                        CONTENT
                    ====================================== */}

                    <div className="food-content">

                        <div className="food-info">

                            <h3>
                                {item.product_name}
                            </h3>


                            <div className="food-price">

                                {Number(
                                    item.price
                                ).toLocaleString()}₫

                            </div>

                        </div>


                        {/* ==================================
                            QUANTITY CONTROL
                        ================================== */}

                        <div className="food-action-row">

                            <span className="quantity-label">
                                SỐ LƯỢNG
                            </span>


                            <div className="food-actions">

                                <button
                                    type="button"
                                    className="qty-btn qty-minus"
                                    onClick={() =>
                                        updateQty(
                                            item.product_id,
                                            -1
                                        )
                                    }
                                    aria-label={`Giảm ${item.product_name}`}
                                >
                                    −
                                </button>


                                <span className="food-qty">
                                    {quantity}
                                </span>


                                <button
                                    type="button"
                                    className="qty-btn qty-plus"
                                    onClick={() =>
                                        updateQty(
                                            item.product_id,
                                            1
                                        )
                                    }
                                    aria-label={`Tăng ${item.product_name}`}
                                >
                                    +
                                </button>

                            </div>

                        </div>


                        {/* ==================================
                            ITEM TOTAL
                        ================================== */}

                        {quantity > 0 && (

                            <div className="food-item-total">

                                <span>
                                    Thành tiền
                                </span>

                                <strong>
                                    {(
                                        Number(item.price) *
                                        quantity
                                    ).toLocaleString()}₫
                                </strong>

                            </div>
                        )}

                    </div>

                </article>
            );
        });
    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="booking-wrapper">

            {/* =================================================
                EXPIRED MODAL
            ================================================= */}

            <Modal
                show={showExpiredModal}
                type="error"
                title="HẾT THỜI GIAN GIỮ GHẾ"
                message="Thời gian giữ ghế đã kết thúc. Vui lòng thực hiện đặt vé lại."
                onConfirm={handleModalConfirm}
                onCancel={handleModalConfirm}
                confirmText="Về trang chủ"
                cancelText="Về trang chủ"
            />


            {/* =================================================
                PAGE CONTAINER
            ================================================= */}

            <div className="food-container">


                {/* =================================================
                    PAGE TITLE
                ================================================= */}

                {/* =================================================
                    BOOKING PROGRESS
                    FOOD = BƯỚC 03 / THỨC ĂN
                ================================================= */}
                <div className="food-progress-wrapper">
                    <BookingProgress currentStep={3} />
                </div>

                <div className="food-booking-layout">


                    {/* =================================================
                        SIDEBAR
                    ================================================= */}

                    <aside className="food-sidebar">

                        <BookingSidebar

                            movie={movie}

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
                                Array.isArray(foods)
                                    ? foods
                                    : []
                            }

                            selectedFoods={

                                foods
                                    .filter(
                                        item =>
                                            selectedFoods[
                                                item.product_id
                                            ] > 0
                                    )

                                    .map(item => ({

                                        ...item,

                                        quantity:
                                            selectedFoods[
                                                item.product_id
                                            ]

                                    }))

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

                            showFoodSection={true}

                            showContinueButton={true}

                            showBackButton={true}

                            continueText="TIẾP TỤC THANH TOÁN"

                            onContinue={
                                handleContinue
                            }

                            onBack={() =>
                                navigate(-1)
                            }

                            isContinueDisabled={
                                false
                            }
                        />

                    </aside>


                    {/* =================================================
                        MAIN FOOD AREA
                    ================================================= */}

                    <main className="food-main">


                        {/* =================================================
                            FOOD INTRO CARD
                        ================================================= */}

                        <section className="food-intro-card">

                            <div className="food-intro-icon">
                                🍿
                            </div>

                            <div>

                                <h2>
                                    CHỌN COMBO YÊU THÍCH
                                </h2>

                                <p>
                                    Bạn có thể thêm bắp, nước và
                                    các combo vào đơn hàng.
                                </p>

                            </div>

                        </section>


                        {/* =================================================
                            FOOD LIST CARD
                        ================================================= */}

                        <section className="food-list-card">

                            <div className="food-list-header">

                                <div>

                                    <span className="food-section-label">
                                        FOOD & DRINK
                                    </span>

                                    <h2>
                                        COMBO ĐANG CÓ
                                    </h2>

                                </div>


                                <div className="food-count">

                                    <strong>
                                        {foods.length}
                                    </strong>

                                    <span>
                                        sản phẩm
                                    </span>

                                </div>

                            </div>


                            <div className="food-grid">

                                {renderFoods()}

                            </div>

                        </section>


                        {/* =================================================
                            MOBILE SUMMARY
                        ================================================= */}

                        <div className="food-mobile-summary">

                            <span>
                                Tổng cộng
                            </span>

                            <strong>
                                {Number(
                                    grandTotal
                                ).toLocaleString()}₫
                            </strong>

                        </div>


                        {/* =================================================
                            MOBILE CONTINUE
                        ================================================= */}

                        <div className="food-mobile-actions">

                            <button
                                type="button"
                                className="food-mobile-back"
                                onClick={() =>
                                    navigate(-1)
                                }
                            >
                                QUAY LẠI
                            </button>


                            <button
                                type="button"
                                className="food-mobile-next"
                                onClick={handleContinue}
                                disabled={loading}
                            >

                                {loading
                                    ? 'ĐANG XỬ LÝ...'
                                    : 'TIẾP TỤC'
                                }

                            </button>

                        </div>

                    </main>

                </div>

            </div>

        </div>
    );
};


export default Food;

