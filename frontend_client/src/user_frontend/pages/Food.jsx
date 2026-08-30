import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';

// Components
import CountdownTimer from './CountdownTimer';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';
// Styles
import '../styles/Food.css';
import '../styles/Booking.css';

const Food = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Lấy dữ liệu từ location.state hoặc từ localStorage
    const getStateData = () => {
        const stateData = location.state || {};
        
        // Nếu không có state, thử đọc từ localStorage
        if (!stateData.selectedSeats || stateData.selectedSeats.length === 0) {
            try {
                const savedBooking = localStorage.getItem('booking_temp');
                if (savedBooking) {
                    const parsed = JSON.parse(savedBooking);
                    return parsed;
                }
            } catch (err) {
                console.error('Lỗi đọc booking_temp từ localStorage:', err);
            }
        }
        
        return stateData;
    };

    const initialData = getStateData();

    const {
        movie = initialData.movie || {},
        selectedCinema = initialData.selectedCinema || {},
        selectedDate = initialData.selectedDate || '',
        selectedShowtime = initialData.selectedShowtime || {},
        selectedSeats = initialData.selectedSeats || [],
        showtimeDetail = initialData.showtimeDetail || {}
    } = location.state || initialData;

    // Đọc selectedFoods đã lưu từ localStorage
    const getSavedFoods = () => {
        try {
            const savedFoods = localStorage.getItem('selectedFoods');
            if (savedFoods) {
                return JSON.parse(savedFoods);
            }
        } catch (err) {
            console.error('Lỗi đọc selectedFoods từ localStorage:', err);
        }
        return {};
    };

    const [foods, setFoods] = useState([]);
    const [selectedFoods, setSelectedFoods] = useState(getSavedFoods);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingFoods, setLoadingFoods] = useState(false);

    // Lưu selectedFoods vào localStorage mỗi khi thay đổi
    useEffect(() => {
        try {
            localStorage.setItem('selectedFoods', JSON.stringify(selectedFoods));
        } catch (err) {
            console.error('Lỗi lưu selectedFoods vào localStorage:', err);
        }
    }, [selectedFoods]);

    useEffect(() => {
        window.scrollTo(0, 0);

        if (!selectedSeats || selectedSeats.length === 0) {
            // Thử đọc lại từ localStorage
            try {
                const savedBooking = localStorage.getItem('booking_temp');
                if (savedBooking) {
                    const parsed = JSON.parse(savedBooking);
                    if (parsed.selectedSeats && parsed.selectedSeats.length > 0) {
                        // Có dữ liệu, tiếp tục
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

        if (localStorage.getItem('holdExpiresAt')) {
            setIsTimerActive(true);
        } else {
            navigate('/');
        }

        const fetchFoods = async () => {
            setLoadingFoods(true);
            try {
                const res = await api.get('/api/foods');
                
                if (res.data && Array.isArray(res.data.data)) {
                    setFoods(res.data.data);
                } else {
                    console.error('Dữ liệu không đúng định dạng:', res.data);
                    setFoods([]);
                }
            } catch (err) {
                console.error('Lỗi tải thức ăn:', err);
                setFoods([]);
            } finally {
                setLoadingFoods(false);
            }
        };

        fetchFoods();
    }, [selectedSeats, navigate]);

    // =============================
    // HẾT GIỜ GIỮ GHẾ
    // =============================
    const handleTimeExpire = () => {
        // Xóa tất cả dữ liệu liên quan đến booking từ localStorage
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

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        alert(
            'Hết thời gian giữ ghế. Vui lòng thực hiện đặt vé lại.'
        );

        navigate('/');
    };

    // =============================
    // TĂNG GIẢM SỐ LƯỢNG
    // =============================
    const updateQty = (id, delta) => {
        setSelectedFoods(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta)
        }));
    };

    // =============================
    // TÍNH TIỀN VÉ
    // =============================
    const totalTicketPrice = useMemo(() => {
        return selectedSeats.reduce(
            (sum, seat) => sum + Number(seat.price),
            0
        );
    }, [selectedSeats]);

    // =============================
    // TÍNH TIỀN FOOD
    // =============================
    const totalFoodPrice = useMemo(() => {
        return foods.reduce((sum, item) => {
            return (
                sum +
                Number(item.price) *
                    (selectedFoods[item.product_id] || 0)
            );
        }, 0);
    }, [foods, selectedFoods]);

    // =============================
    // TỔNG TIỀN
    // =============================
    const grandTotal = totalTicketPrice + totalFoodPrice;

    // =============================
    // CONTINUE PAYMENT
    // =============================
    const handleContinue = () => {
        setLoading(true);

        const finalFoods = foods
            .filter(f => (selectedFoods[f.product_id] || 0) > 0)
            .map(f => ({
                product_id: f.product_id,
                product_name: f.product_name,
                quantity: selectedFoods[f.product_id],
                price: f.price
            }));

        const finalBookingData = {
            ...location.state,
            selectedFoods: finalFoods,
            totalTicketPrice,
            totalFoodPrice,
            grandTotal
        };

        // Lưu vào localStorage
        localStorage.setItem('booking_temp', JSON.stringify(finalBookingData));
        localStorage.setItem('selectedFoods', JSON.stringify(selectedFoods));

        navigate('/payment', {
            state: finalBookingData
        });
    };

    // =============================
    // RENDER FOODS
    // =============================
    const renderFoods = () => {
        if (loadingFoods) {
            return (
                <div className="food-loading">
                    <LoadingButton
                        loading={true}
                        loadingText="Đang tải đồ ăn..."
                        className="food-loading-btn"
                        spinnerColor="#ffffff"
                    />
                </div>
            );
        }

        if (foods.length === 0) {
            return (
                <div className="food-empty">
                    <p>Hiện chưa có combo bắp nước nào</p>
                </div>
            );
        }

        return foods.map(item => (
            <div
                key={item.product_id}
                className="food-card"
            >
                <div className="food-image">
                    <img
                        src={`https://api.quangdungcinema.id.vn/uploads/foods/${item.food_image}`}
                        alt={item.product_name}
                    />
                </div>

                <div className="food-content">
                    <div>
                        <h3>{item.product_name}</h3>
                        <p className="food-price">
                            {Number(item.price).toLocaleString()}₫
                        </p>
                    </div>

                    <div className="food-actions">
                        <button
                            className="qty-btn"
                            onClick={() => updateQty(item.product_id, -1)}
                        >
                            −
                        </button>
                        <span className="food-qty">
                            {selectedFoods[item.product_id] || 0}
                        </span>
                        <button
                            className="qty-btn"
                            onClick={() => updateQty(item.product_id, 1)}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        ));
    };

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
                    selectedSeats={
                        Array.isArray(selectedSeats)
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
                                    selectedFoods[item.product_id] > 0
                            )
                            .map(item => ({
                                ...item,
                                quantity:
                                    selectedFoods[
                                        item.product_id
                                    ]
                            }))
                    }
                    totalTicketPrice={totalTicketPrice}
                    totalFoodPrice={totalFoodPrice}
                    grandTotal={grandTotal}
                    isTimerActive={isTimerActive}
                    onExpire={handleTimeExpire}
                    showFoodSection={true}
                    showContinueButton={true}
                    showBackButton={true}
                    continueText="TIẾP TỤC THANH TOÁN"
                    onContinue={handleContinue}
                    onBack={() => navigate(-1)}
                />

                {/* ================= MAIN ================= */}
                <section className="main-booking-area">
                    <div className="food-page-header">
                        <h2>COMBO BẮP NƯỚC</h2>
                        <p>
                            Chọn combo yêu thích để có
                            trải nghiệm xem phim tuyệt vời hơn
                        </p>
                    </div>

                    <div className="food-grid">
                        {renderFoods()}
                    </div>

                    {/* Nút hành động dưới cùng (cho mobile) */}
                    <div className="food-footer-actions">
                        <LoadingButton
                            type="button"
                            loading={loading}
                            loadingText="Đang xử lý..."
                            onClick={handleContinue}
                            disabled={loading}
                            className="btn-next"
                            spinnerColor="#ffffff"
                        >
                            TIẾP TỤC THANH TOÁN
                        </LoadingButton>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Food;