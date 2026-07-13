import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Components
import CountdownTimer from './CountdownTimer';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton'; // ✅ Import LoadingButton
// Styles
import '../styles/Food.css';
import '../styles/Booking.css';

const Food = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        movie,
        selectedCinema,
        selectedDate,
        selectedShowtime,
        selectedSeats,
        showtimeDetail
    } = location.state || {};

    const [foods, setFoods] = useState([]);
    const [selectedFoods, setSelectedFoods] = useState({});
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [loading, setLoading] = useState(false); // ✅ Thêm state loading
    const [loadingFoods, setLoadingFoods] = useState(false); // ✅ Loading foods

    useEffect(() => {
        window.scrollTo(0, 0);

        if (!selectedSeats || selectedSeats.length === 0) {
            navigate('/');
            return;
        }

        if (sessionStorage.getItem('holdExpiresAt')) {
            setIsTimerActive(true);
        } else {
            navigate('/');
        }

        const fetchFoods = async () => {
            setLoadingFoods(true); // ✅ Bật loading foods
            try {
                const res = await axios.get(
                    'https://api.quangdungcinema.id.vn/api/foods'
                );
                
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
                setLoadingFoods(false); // ✅ Tắt loading foods
            }
        };

        fetchFoods();
    }, [selectedSeats, navigate]);

    // =============================
    // HẾT GIỜ GIỮ GHẾ
    // =============================
    const handleTimeExpire = () => {
        sessionStorage.clear();

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
        setLoading(true); // ✅ Bật loading

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

        sessionStorage.setItem(
            'booking_temp',
            JSON.stringify(finalBookingData)
        );

        // ✅ Điều hướng sau khi setLoading
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

                    {/* ✅ Nút hành động dưới cùng (cho mobile) */}
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