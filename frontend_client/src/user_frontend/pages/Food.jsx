// =========================================================
// FOOD.JS
// PREMIUM SILVER BOOKING FLOW
// HỖ TRỢ CẢ ĐẶT VÉ THƯỜNG VÀ ĐỔI VÉ (RESCHEDULE)
// CLOUDINARY READY
// ✅ CATEGORY FILTER THEO ENUM CSDL
// =========================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import {
    Popcorn,
    Plus,
    Minus,
    ChevronLeft,
    ChevronRight,
    Coffee,
    UtensilsCrossed,
    RefreshCw,
    Sparkles,
    Cookie,
    Wine,
    IceCream,
    Sandwich,
    Check,
} from 'lucide-react';
import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import BookingProgress from '../components/BookingProgress';
import LoadingButton from '../components/LoadingButton';
import '../styles/Food.css';

// =========================================================
// ⭐ HELPER: LẤY URL ẢNH TỪ CLOUDINARY
// =========================================================

const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    return `https://api.quangdungcinema.id.vn/uploads/foods/${image}`;
};

// =========================================================
// ✅ CATEGORY FILTER — KHỚP ENUM CSDL
// enum('Popcorn','Drink','Combo','Snack','Break','Other')
// =========================================================

const CATEGORIES = [
    {
        id: 'all',
        label: 'TẤT CẢ',
        icon: Sparkles,
        value: null,
    },
    {
        id: 'combo',
        label: 'COMBO',
        icon: Popcorn,
        value: 'Combo',
    },
    {
        id: 'popcorn',
        label: 'BẮP',
        icon: Cookie,
        value: 'Popcorn',
    },
    {
        id: 'drink',
        label: 'NƯỚC',
        icon: Wine,
        value: 'Drink',
    },
    {
        id: 'break',
        label: 'BÁNH MÌ',
        icon: Sandwich,
        value: 'Break',
    },
    {
        id: 'snack',
        label: 'ĂN VẶT',
        icon: IceCream,
        value: 'Snack',
    },
    {
        id: 'other',
        label: 'KHÁC',
        icon: UtensilsCrossed,
        value: 'Other',
    },
];

// ✅ Map enum → label hiển thị trên badge
const CATEGORY_LABELS = {
    Popcorn: 'BẮP',
    Drink: 'NƯỚC',
    Combo: 'COMBO',
    Snack: 'ĂN VẶT',
    Break: 'BÁNH MÌ',
    Other: 'KHÁC',
};

// ✅ Map enum → màu badge
const CATEGORY_COLORS = {
    Popcorn: '#F4D77A',   // vàng bắp
    Drink: '#7FA0BC',     // xanh nước
    Combo: '#E8C56A',     // vàng combo
    Snack: '#E89BC0',     // hồng snack
    Break: '#F5A623',     // cam bánh mì
    Other: '#A9B2BC',     // xám khác
};

// =========================================================
// COMPONENT
// =========================================================

const Food = () => {

    const location = useLocation();
    const navigate = useNavigate();

    // =====================================================
    // ✅ RESCHEDULE MODE
    // =====================================================

    const isRescheduleMode = location.state?.mode === 'reschedule';
    const rescheduleBookingId = location.state?.rescheduleBookingId || null;
    const oldBookingInfo = location.state?.oldBooking || null;
    const oldTotalAmount = Number(location.state?.oldBooking?.old_total || 0);

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

    // ✅ Category filter
    const [activeCategory, setActiveCategory] = useState('all');

    // =====================================================
    // ✅ RESCHEDULE: TỰ ĐỘNG CHUYỂN SANG PAYMENT
    // =====================================================

    useEffect(() => {
        if (!isRescheduleMode) return;

        const newTotal = selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0);
        const delta = newTotal - oldTotalAmount;

        console.log('[FOOD] Reschedule mode — chuyển thẳng Payment');

        navigate('/payment', {
            replace: true,
            state: {
                ...initialData,
                mode: 'reschedule',
                rescheduleBookingId,
                oldBooking: oldBookingInfo,
                oldTotalAmount,
                selectedFoods: [],
                foods: [],
                totalTicketPrice: newTotal,
                totalFoodPrice: 0,
                grandTotal: newTotal,
                deltaAmount: delta,
            }
        });
    }, [isRescheduleMode, navigate, selectedSeats, initialData, oldTotalAmount, rescheduleBookingId, oldBookingInfo]);

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
        if (isRescheduleMode) return;
        try {
            localStorage.setItem('selectedFoods', JSON.stringify(selectedFoods));
        } catch (err) {
            console.error('❌ [FOOD] Lỗi lưu selectedFoods:', err);
        }
    }, [selectedFoods, isRescheduleMode]);

    // =====================================================
    // INITIAL CHECK + FETCH FOODS
    // =====================================================

    useEffect(() => {
        if (isRescheduleMode) return;

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
                    console.log('🍿 [FOOD] Loaded foods:', res.data.data.length);
                    setFoods(res.data.data);
                } else {
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
    }, [navigate, selectedSeats.length, ownerToken, showtimeId, isRescheduleMode]);

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
    // HẾT GIỜ GIỮ GHẾ
    // =====================================================

    const handleTimeExpireInternal = () => {
        clearBookingData();
        setIsTimerActive(false);
        setShowExpiredModal(true);
    };

    const handleTimeExpire = () => {
        handleTimeExpireInternal();
    };

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
    // TOTAL
    // =====================================================

    const totalTicketPrice = useMemo(() => {
        return selectedSeats.reduce((sum, seat) => sum + Number(seat?.price || 0), 0);
    }, [selectedSeats]);

    const totalFoodPrice = useMemo(() => {
        return foods.reduce((sum, item) => {
            const quantity = Number(selectedFoods[item.product_id] || 0);
            return sum + Number(item.price || 0) * quantity;
        }, 0);
    }, [foods, selectedFoods]);

    const grandTotal = totalTicketPrice + totalFoodPrice;

    // ✅ Đếm tổng số món đã chọn
    const totalItems = useMemo(() => {
        return Object.values(selectedFoods).reduce((sum, qty) => sum + Number(qty || 0), 0);
    }, [selectedFoods]);

    // =====================================================
    // ✅ FILTER FOODS BY CATEGORY (theo enum CSDL)
    // =====================================================

    const filteredFoods = useMemo(() => {
        if (activeCategory === 'all') return foods;

        const category = CATEGORIES.find(c => c.id === activeCategory);
        if (!category || !category.value) return foods;

        return foods.filter(item => item.category === category.value);
    }, [foods, activeCategory]);

    // ✅ Đếm số sản phẩm mỗi category (để hiển thị badge số)
    const categoryCounts = useMemo(() => {
        const counts = { all: foods.length };
        CATEGORIES.forEach(cat => {
            if (cat.value) {
                counts[cat.id] = foods.filter(f => f.category === cat.value).length;
            }
        });
        return counts;
    }, [foods]);

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

        if (foods.length === 0) {
            return (
                <div className="food-empty">
                    <div className="food-empty-icon">
                        <Popcorn size={48} strokeWidth={1.5} />
                    </div>
                    <h3>CHƯA CÓ COMBO</h3>
                    <p>Hiện chưa có combo bắp nước nào.</p>
                </div>
            );
        }

        if (filteredFoods.length === 0) {
            return (
                <div className="food-empty">
                    <div className="food-empty-icon">
                        <UtensilsCrossed size={48} strokeWidth={1.5} />
                    </div>
                    <h3>KHÔNG CÓ SẢN PHẨM</h3>
                    <p>
                        Danh mục{' '}
                        <strong>
                            {CATEGORIES.find(c => c.id === activeCategory)?.label}
                        </strong>{' '}
                        chưa có sản phẩm nào.
                    </p>
                </div>
            );
        }

        return filteredFoods.map(item => {
            const quantity = Number(selectedFoods[item.product_id] || 0);
            const imageUrl = getImageUrl(item.food_image);
            const categoryLabel = CATEGORY_LABELS[item.category] || item.category || '';
            const categoryColor = CATEGORY_COLORS[item.category] || '#A9B2BC';

            return (
                <article
                    key={item.product_id}
                    className={`food-card ${quantity > 0 ? 'is-selected' : ''}`}
                >
                    <div className="food-image-wrapper">
                        <div className="food-image">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={item.product_name}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        const parent = e.target.parentElement;
                                        if (parent && !parent.querySelector('.food-no-image')) {
                                            const placeholder = document.createElement('div');
                                            placeholder.className = 'food-no-image';
                                            placeholder.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';
                                            parent.appendChild(placeholder);
                                        }
                                    }}
                                />
                            ) : (
                                <div className="food-no-image">
                                    <UtensilsCrossed size={40} strokeWidth={1.5} />
                                </div>
                            )}
                        </div>

                        {/* ✅ Category badge */}
                        {categoryLabel && (
                            <div
                                className="food-category-badge"
                                style={{ '--badge-color': categoryColor }}
                            >
                                {categoryLabel}
                            </div>
                        )}

                        {quantity > 0 && (
                            <div className="food-selected-badge">
                                <Check size={10} strokeWidth={3} />
                                <span>ĐÃ CHỌN</span>
                            </div>
                        )}
                    </div>

                    <div className="food-content">
                        <div className="food-info">
                            <h3>{item.product_name}</h3>
                            <div className="food-price">
                                {Number(item.price).toLocaleString()}₫
                            </div>
                        </div>

                        <div className="food-action-row">
                            <span className="food-quantity-label">SỐ LƯỢNG</span>
                            <div className="food-actions">
                                <button
                                    type="button"
                                    className="food-qty-btn food-qty-minus"
                                    onClick={() => updateQty(item.product_id, -1)}
                                    disabled={quantity === 0}
                                    aria-label="Giảm số lượng"
                                >
                                    <Minus size={16} strokeWidth={2.5} />
                                </button>
                                <span className="food-qty">{quantity}</span>
                                <button
                                    type="button"
                                    className="food-qty-btn food-qty-plus"
                                    onClick={() => updateQty(item.product_id, 1)}
                                    aria-label="Tăng số lượng"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        {quantity > 0 && (
                            <div className="food-item-total">
                                <span>Thành tiền</span>
                                <strong>
                                    {(Number(item.price) * quantity).toLocaleString()}₫
                                </strong>
                            </div>
                        )}
                    </div>
                </article>
            );
        });
    };

    // =====================================================
    // ✅ RESCHEDULE: KHÔNG RENDER UI
    // =====================================================

    if (isRescheduleMode) {
        return (
            <div className="food-wrapper">
                <div className="food-reschedule-loading">
                    <RefreshCw size={48} className="spin-icon" />
                    <p>Đang chuyển đến trang thanh toán...</p>
                </div>
            </div>
        );
    }

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
                {/* ✅ HEADER */}
                <header className="food-page-header">
                    <div className="food-page-header__row">
                        <div>
                            <div className="food-page-header__eyebrow">
                                QUANG DŨNG CINEMA
                            </div>
                            <h1>
                                CHỌN{' '}
                                <span className="food-page-header__accent">
                                    COMBO
                                </span>
                            </h1>
                            <p>
                                Thêm bắp nước để trải nghiệm phim trọn vẹn hơn.
                            </p>
                        </div>

                        <div className="food-page-header__badge">
                            <Sparkles size={14} />
                            <span>BƯỚC 03 / 04</span>
                        </div>
                    </div>
                </header>

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
                            selectedFoods={
                                foods
                                    .filter(item => Number(selectedFoods[item.product_id] || 0) > 0)
                                    .map(item => ({
                                        ...item,
                                        quantity: Number(selectedFoods[item.product_id])
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
                            continueText=" TIẾP TỤC "
                            onContinue={handleContinue}
                            onBack={() => navigate(-1)}
                            isContinueDisabled={loading}
                        />
                    </aside>

                    <main className="food-main-area">
                        <section className="food-intro-card">
                            <div className="food-intro-icon">
                                <Popcorn size={32} strokeWidth={1.5} />
                            </div>
                            <div className="food-intro-content">
                                <h2>CHỌN COMBO YÊU THÍCH</h2>
                                <p>Bạn có thể thêm bắp, nước và các combo vào đơn hàng.</p>
                            </div>
                            <div className="food-count-badge">
                                <strong>{totalItems}</strong>
                                <span>ĐÃ CHỌN</span>
                            </div>
                        </section>

                        {/* ✅ CATEGORY FILTER TABS */}
                        <nav className="food-category-tabs">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.id;
                                const count = categoryCounts[cat.id] || 0;

                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        className={`food-category-tab ${isActive ? 'active' : ''}`}
                                        onClick={() => setActiveCategory(cat.id)}
                                    >
                                        <Icon size={14} strokeWidth={2.2} />
                                        <span>{cat.label}</span>
                                        {count > 0 && (
                                            <span className="food-category-tab__count">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        <section className="food-list-card">
                            <div className="food-list-header">
                                <div>
                                    <span className="food-section-label">
                                        <Coffee size={12} strokeWidth={2} />
                                        FOOD &amp; DRINK
                                    </span>
                                    <h2>
                                        {activeCategory === 'all'
                                            ? 'COMBO ĐANG CÓ'
                                            : CATEGORIES.find(c => c.id === activeCategory)?.label
                                        }
                                    </h2>
                                </div>
                                <span className="food-result-count">
                                    {filteredFoods.length} sản phẩm
                                </span>
                            </div>

                            <div className="food-grid">{renderFoods()}</div>
                        </section>

                        <div className="food-mobile-summary">
                            <span>Tổng cộng</span>
                            <strong>{Number(grandTotal).toLocaleString()}₫</strong>
                        </div>

                        <div className="food-mobile-actions">
                            <button
                                type="button"
                                className="food-mobile-back"
                                onClick={() => navigate(-1)}
                                disabled={loading}
                            >
                                <ChevronLeft size={14} strokeWidth={2.5} /> QUAY LẠI
                            </button>
                            <button
                                type="button"
                                className="food-mobile-next"
                                onClick={handleContinue}
                                disabled={loading}
                            >
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