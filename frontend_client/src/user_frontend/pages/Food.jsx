// =========================================================
// FOOD.JS
// PREMIUM SILVER BOOKING FLOW
// =========================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Popcorn, Plus, Minus, ChevronLeft, ChevronRight, Coffee, UtensilsCrossed } from 'lucide-react';
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import BookingProgress from '../components/BookingProgress';
import LoadingButton from '../components/LoadingButton';
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

    const [showExpiredModal, setShowExpiredModal] = useState(false);

    // =====================================================
    // LẤY BOOKING DATA
    // =====================================================

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
            console.error('❌ [FOOD] Lỗi đọc booking_temp từ localStorage:', err);
        }
        return stateData;
    };

    const initialData = getStateData();

    // =====================================================
    // BOOKING DATA
    // =====================================================

    const movie = initialData.movie || {};
    const selectedCinema = initialData.selectedCinema || {};
    const selectedDate = initialData.selectedDate || '';
    const selectedShowtime = initialData.selectedShowtime || {};
    const selectedSeats = Array.isArray(initialData.selectedSeats) ? initialData.selectedSeats : [];
    const showtimeDetail = initialData.showtimeDetail || {};
    const ownerToken = initialData.ownerToken || localStorage.getItem('booking_owner_token') || '';
    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id || initialData.showtimeId || initialData.showtime_id || null;

    // =====================================================
    // GET SAVED FOODS
    // =====================================================

    const getSavedFoods = () => {
        try {
            const savedFoods = localStorage.getItem('selectedFoods');
            if (savedFoods) {
                const parsed = JSON.parse(savedFoods);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (err) {
            console.error('❌ [FOOD] Lỗi đọc selectedFoods từ localStorage:', err);
        }
        return {};
    };

    // =====================================================
    // STATE
    // =====================================================

    const [foods, setFoods] = useState([]);
    const [selectedFoods, setSelectedFoods] = useState(getSavedFoods);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingFoods, setLoadingFoods] = useState(false);

    // =====================================================
    // SAVE OWNER TOKEN
    // =====================================================

    useEffect(() => {
        if (!ownerToken) return;
        try {
            localStorage.setItem('booking_owner_token', ownerToken);
        } catch (err) {
            console.error('❌ [FOOD] Không thể lưu booking_owner_token:', err);
        }
    }, [ownerToken]);

    // =====================================================
    // SAVE FOOD SELECTION
    // =====================================================

    useEffect(() => {
        try {
            localStorage.setItem('selectedFoods', JSON.stringify(selectedFoods));
        } catch (err) {
            console.error('❌ [FOOD] Lỗi lưu selectedFoods:', err);
        }
    }, [selectedFoods]);

    // =====================================================
    // INITIAL CHECK + FETCH FOODS
    // =====================================================

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!selectedSeats || selectedSeats.length === 0) {
            console.warn('⚠️ [FOOD] Không có selectedSeats');
            navigate('/');
            return;
        }
        if (!ownerToken) {
            console.warn('⚠️ [FOOD] Không có ownerToken');
            navigate('/');
            return;
        }
        if (!showtimeId) {
            console.warn('⚠️ [FOOD] Không xác định được showtimeId');
            navigate('/');
            return;
        }
        const holdExpiresAt = localStorage.getItem('holdExpiresAt');
        if (!holdExpiresAt) {
            console.warn('⚠️ [FOOD] Không có holdExpiresAt');
            navigate('/');
            return;
        }
        const expiresAt = Number(holdExpiresAt);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
            console.warn('⏰ [FOOD] holdExpiresAt đã hết hạn');
            handleTimeExpireInternal();
            return;
        }
        setIsTimerActive(true);
        const fetchFoods = async () => {
            setLoadingFoods(true);
            try {
                const res = await api.get('/api/foods');
                if (res.data && Array.isArray(res.data.data)) {
                    setFoods(res.data.data);
                } else {
                    console.error('❌ [FOOD] Dữ liệu foods không đúng định dạng:', res.data);
                    setFoods([]);
                }
            } catch (err) {
                console.error('❌ [FOOD] Lỗi tải thức ăn:', err);
                setFoods([]);
            } finally {
                setLoadingFoods(false);
            }
        };
        fetchFoods();
    }, [navigate, selectedSeats.length, ownerToken, showtimeId]);

    // =====================================================
    // CLEAR BOOKING DATA
    // =====================================================

    const clearBookingData = () => {
        const keysToRemove = [
            'selectedSeats', 'holdExpiresAt', 'currentShowtimeId', 'booking_owner_token',
            'booking_seats', 'booking_showtime', 'booking_data',
            'booking_cinema', 'booking_date', 'booking_movie', 'booking_showtime',
            'selected_foods', 'food_selection', 'selectedFoods', 'booking_temp'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    };

    // =====================================================
    // HẾT GIỜ GIỮ GHẾ - INTERNAL
    // =====================================================

    const handleTimeExpireInternal = () => {
        clearBookingData();
        setIsTimerActive(false);
        setShowExpiredModal(true);
    };

    // =====================================================
    // HẾT GIỜ GIỮ GHẾ
    // =====================================================

    const handleTimeExpire = () => {
        handleTimeExpireInternal();
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
        setSelectedFoods(prev => {
            const currentQuantity = Number(prev[id] || 0);
            const nextQuantity = Math.max(0, currentQuantity + delta);
            return { ...prev, [id]: nextQuantity };
        });
    };

    // =====================================================
    // TOTAL TICKET
    // =====================================================

    const totalTicketPrice = useMemo(() => {
        return selectedSeats.reduce((sum, seat) => sum + Number(seat?.price || 0), 0);
    }, [selectedSeats]);

    // =====================================================
    // TOTAL FOOD
    // =====================================================

    const totalFoodPrice = useMemo(() => {
        return foods.reduce((sum, item) => {
            const quantity = Number(selectedFoods[item.product_id] || 0);
            return sum + Number(item.price || 0) * quantity;
        }, 0);
    }, [foods, selectedFoods]);

    // =====================================================
    // GRAND TOTAL
    // =====================================================

    const grandTotal = totalTicketPrice + totalFoodPrice;

    // =====================================================
    // CONTINUE PAYMENT
    // =====================================================

    const handleContinue = () => {
        if (loading) return;
        if (!ownerToken) {
            console.error('❌ [FOOD] Không có ownerToken khi chuyển Payment');
            return;
        }
        if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            console.error('❌ [FOOD] Không có ghế để thanh toán');
            navigate('/');
            return;
        }
        const holdExpiresAt = Number(localStorage.getItem('holdExpiresAt'));
        if (!Number.isFinite(holdExpiresAt) || holdExpiresAt <= Date.now()) {
            handleTimeExpire();
            return;
        }
        setLoading(true);
        const finalFoods = foods
            .filter(food => Number(selectedFoods[food.product_id] || 0) > 0)
            .map(food => ({
                product_id: food.product_id,
                product_name: food.product_name,
                quantity: Number(selectedFoods[food.product_id]),
                price: food.price
            }));
        const finalBookingData = {
            ...initialData,
            ...location.state,
            movie,
            selectedCinema,
            selectedDate,
            selectedShowtime,
            selectedSeats,
            showtimeDetail,
            ownerToken,
            showtimeId,
            selectedFoods: finalFoods,
            totalTicketPrice,
            totalFoodPrice,
            grandTotal
        };
        try {
            localStorage.setItem('booking_temp', JSON.stringify(finalBookingData));
            localStorage.setItem('selectedFoods', JSON.stringify(selectedFoods));
            localStorage.setItem('booking_owner_token', ownerToken);
            if (showtimeId) {
                localStorage.setItem('currentShowtimeId', String(showtimeId));
            }
        } catch (err) {
            console.error('❌ [FOOD] Lỗi lưu booking trước Payment:', err);
            setLoading(false);
            return;
        }
        navigate('/payment', { state: finalBookingData });
    };

    // =====================================================
    // RENDER FOOD LIST
    // =====================================================

    const renderFoods = () => {
        if (loadingFoods) {
            return (
                <div className="food-loading">
                    <div className="food-loading-inner">
                        <LoadingButton loading={true} loadingText="Đang tải đồ ăn..." className="food-loading-btn" spinnerColor="#ffffff" />
                    </div>
                </div>
            );
        }
        if (foods.length === 0) {
            return (
                <div className="food-empty">
                    <div className="food-empty-icon"><Popcorn size={48} strokeWidth={1.5} /></div>
                    <h3>CHƯA CÓ COMBO</h3>
                    <p>Hiện chưa có combo bắp nước nào.</p>
                </div>
            );
        }
        return foods.map(item => {
            const quantity = Number(selectedFoods[item.product_id] || 0);
            return (
                <article key={item.product_id} className={`food-card ${quantity > 0 ? 'is-selected' : ''}`}>
                    <div className="food-image-wrapper">
                        <div className="food-image">
                            {item.food_image ? (
                                <img src={`https://api.quangdungcinema.id.vn/uploads/foods/${item.food_image}`} alt={item.product_name} loading="lazy" />
                            ) : (
                                <div className="food-no-image"><UtensilsCrossed size={40} strokeWidth={1.5} /></div>
                            )}
                        </div>
                        {quantity > 0 && <div className="food-selected-badge">ĐÃ CHỌN</div>}
                    </div>
                    <div className="food-content">
                        <div className="food-info">
                            <h3>{item.product_name}</h3>
                            <div className="food-price">{Number(item.price).toLocaleString()}₫</div>
                        </div>
                        <div className="food-action-row">
                            <span className="food-quantity-label">SỐ LƯỢNG</span>
                            <div className="food-actions">
                                <button type="button" className="food-qty-btn food-qty-minus" onClick={() => updateQty(item.product_id, -1)} aria-label={`Giảm ${item.product_name}`}>
                                    <Minus size={16} strokeWidth={2.5} />
                                </button>
                                <span className="food-qty">{quantity}</span>
                                <button type="button" className="food-qty-btn food-qty-plus" onClick={() => updateQty(item.product_id, 1)} aria-label={`Tăng ${item.product_name}`}>
                                    <Plus size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                        {quantity > 0 && (
                            <div className="food-item-total">
                                <span>Thành tiền</span>
                                <strong>{(Number(item.price) * quantity).toLocaleString()}₫</strong>
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
        <div className="food-wrapper">
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
            <div className="food-container">
                <div className="food-progress-wrapper">
                    <BookingProgress currentStep={3} />
                </div>
                <div className="food-layout">
                    <aside className="food-sidebar-wrapper">
                        <BookingSidebar
                            movie={movie}
                            showtimeDetail={showtimeDetail}
                            selectedCinema={selectedCinema}
                            selectedDate={selectedDate}
                            selectedShowtime={selectedShowtime}
                            selectedSeats={Array.isArray(selectedSeats) ? selectedSeats : []}
                            foods={Array.isArray(foods) ? foods : []}
                            selectedFoods={foods
                                .filter(item => Number(selectedFoods[item.product_id] || 0) > 0)
                                .map(item => ({ ...item, quantity: Number(selectedFoods[item.product_id]) }))
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
                            isContinueDisabled={loading}
                        />
                    </aside>
                    <main className="food-main-area">
                        <section className="food-intro-card">
                            <div className="food-intro-icon"><Popcorn size={32} strokeWidth={1.5} /></div>
                            <div className="food-intro-content">
                                <h2>CHỌN COMBO YÊU THÍCH</h2>
                                <p>Bạn có thể thêm bắp, nước và các combo vào đơn hàng.</p>
                            </div>
                            <div className="food-count-badge">
                                <strong>{foods.length}</strong>
                                <span>SẢN PHẨM</span>
                            </div>
                        </section>
                        <section className="food-list-card">
                            <div className="food-list-header">
                                <div>
                                    <span className="food-section-label"><Coffee size={12} strokeWidth={2} /> FOOD &amp; DRINK</span>
                                    <h2>COMBO ĐANG CÓ</h2>
                                </div>
                            </div>
                            <div className="food-grid">{renderFoods()}</div>
                        </section>
                        <div className="food-mobile-summary">
                            <span>Tổng cộng</span>
                            <strong>{Number(grandTotal).toLocaleString()}₫</strong>
                        </div>
                        <div className="food-mobile-actions">
                            <button type="button" className="food-mobile-back" onClick={() => navigate(-1)} disabled={loading}>
                                <ChevronLeft size={14} strokeWidth={2.5} /> QUAY LẠI
                            </button>
                            <button type="button" className="food-mobile-next" onClick={handleContinue} disabled={loading}>
                                {loading ? 'ĐANG XỬ LÝ...' : 'TIẾP TỤC'}
                                <ChevronRight size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Food;