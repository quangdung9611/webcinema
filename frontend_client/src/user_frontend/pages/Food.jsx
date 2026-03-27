import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CountdownTimer from './CountdownTimer'; 
import '../styles/Food.css';
import '../styles/Booking.css'; // Dùng chung layout với Booking

const Food = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const { movie, cinemaName, slot, selectedDate, selectedSeats, totalTicketPrice, showtimeDetail } = location.state || {};
    
    const [foods, setFoods] = useState([]);
    const [selectedFoods, setSelectedFoods] = useState({});
    const [isTimerActive, setIsTimerActive] = useState(false);

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

        axios.get('https://webcinema-zb8z.onrender.com/api/foods')
            .then(res => setFoods(res.data))
            .catch(err => console.error("Lỗi lấy bắp nước:", err));
    }, [selectedSeats, navigate]);

    const handleTimeExpire = () => {
        sessionStorage.clear();
        alert("Thời gian giữ ghế đã hết! Vui lòng thực hiện lại từ đầu.");
        navigate('/');
    };

    const updateQty = (id, delta) => {
        setSelectedFoods(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta)
        }));
    };

    const totalFoodPrice = foods.reduce((sum, f) => 
        sum + (f.price * (selectedFoods[f.product_id] || 0)), 0
    );

        const handleContinue = () => {
        // Lọc lấy danh sách thực tế khách đã chọn
        const finalFoods = foods
            .filter(f => (selectedFoods[f.product_id] || 0) > 0)
            .map(f => ({ 
                product_id: f.product_id,
                product_name: f.product_name,
                price: f.price,
                quantity: selectedFoods[f.product_id] 
            }));

        // Nếu không chọn gì (finalFoods rỗng), totalFoodPrice sẽ là 0
        const currentFoodPrice = totalFoodPrice || 0;

        const finalBookingData = { 
            ...location.state, 
            selectedFoods: finalFoods, 
            totalFoodPrice: currentFoodPrice,
            grandTotal: totalTicketPrice + currentFoodPrice 
        };

        // Cập nhật lại sessionStorage để lỡ khách F5 ở trang thanh toán vẫn còn data
        sessionStorage.setItem('booking_temp', JSON.stringify(finalBookingData));

        navigate('/payment', { state: finalBookingData });
    };

    return (
        <div className="booking-page-full-wrapper">
            {/* 1. STEPPER BAR ĐỒNG BỘ */}
             <div className="stepper-bar-full">
                <div className="stepper-content">
                    <div className="step-item done">01 CHỌN GHẾ</div>
                    <div className="step-item active">02 CHỌN THỨC ĂN</div>
                    <div className="step-item">03 THANH TOÁN</div>
                    <div className="step-item">04 XÁC NHẬN</div>
                </div>
            </div>

            <main className="booking-main-layout">
                <div className="booking-grid-container">
                    
                    {/* 2. KHU VỰC CHỌN FOOD (BÊN TRÁI) */}
                    <section className="left-section-seatmap">
                        <div className="seat-selection-card">
                            <h2 className="food-title-main" style={{marginBottom: '30px', color: '#034EA1', fontWeight: 'bold', fontSize: '24px'}}>
                                COMBO BẮP NƯỚC ƯU ĐÃI
                            </h2>
                            
                            <div className="food-grid-container" style={{width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px'}}>
                                {foods.map(item => (
                                    <div key={item.product_id} className="food-card-custom" style={{display: 'flex', border: '1px solid #ddd', borderRadius: '12px', padding: '15px', gap: '15px', background: '#fff'}}>
                                        <img 
                                            src={`https://webcinema-zb8z.onrender.com/uploads/foods/${item.food_image}`} 
                                            alt={item.product_name} 
                                            style={{width: '110px', height: '110px', objectFit: 'cover', borderRadius: '8px'}}
                                        />
                                        <div className="food-info" style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                                            <div>
                                                <h4 style={{margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600', color: '#333'}}>{item.product_name}</h4>
                                                <p style={{color: '#f37021', fontWeight: 'bold', margin: '0 0 10px 0', fontSize: '16px'}}>
                                                    {Number(item.price).toLocaleString()} đ
                                                </p>
                                            </div>
                                            <div className="food-ctrl" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                                <button onClick={() => updateQty(item.product_id, -1)} className="btn-qty" style={{width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer'}}>-</button>
                                                <span style={{fontWeight: 'bold', minWidth: '20px', textAlign: 'center'}}>{selectedFoods[item.product_id] || 0}</span>
                                                <button onClick={() => updateQty(item.product_id, 1)} className="btn-qty" style={{width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer'}}>+</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 3. SIDEBAR (BÊN PHẢI) */}
                    <aside className="right-section-sidebar">
                        <div className="sidebar-sticky-content">
                            {isTimerActive && (
                                <div className="timer-display-box">
                                    <CountdownTimer onExpire={handleTimeExpire} />
                                </div>
                            )}

                            <div className="movie-info-summary">
                                <img src={`https://webcinema-zb8z.onrender.com/uploads/posters/${showtimeDetail?.poster_url || movie?.poster_url}`} alt="" className="summary-poster" />
                                <div className="summary-meta-data">
                                    <h4 className="movie-title-text">{showtimeDetail?.title || movie?.title}</h4>
                                    <p className="movie-sub-desc">
                                        {showtimeDetail?.room_type || '2D'} Phụ Đề - 
                                        <span className="age-badge-t18">
                                            T{showtimeDetail?.age_rating || movie?.age_rating || '18'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="ticket-details-breakdown">
                                <p className="detail-row"><strong>{cinemaName}</strong> - {showtimeDetail?.room_name || 'Đang tải...'}</p>
                                <p className="detail-row">Suất: <strong>{new Date(slot?.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong> - {selectedDate || 'Hôm nay'}</p>
                                
                                <div className="selected-items-list" style={{marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '15px'}}>
                                    <div style={{marginBottom: '10px'}}>
                                        <span>Ghế: </span>
                                        <strong className="highlight-orange">
                                            {selectedSeats.flatMap(s => s.seat_type === 'Couple' 
                                                ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number)+1}`] 
                                                : [`${s.seat_row}${s.seat_number}`]).join(', ')}
                                        </strong>
                                    </div>
                                    
                                    {/* Danh sách thức ăn đã chọn */}
                                    <div className="food-mini-list">
                                        {foods.filter(f => selectedFoods[f.product_id] > 0).map(f => (
                                            <div key={f.product_id} style={{fontSize: '14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between'}}>
                                                <span>{f.product_name} (x{selectedFoods[f.product_id]})</span>
                                                <span className="highlight-orange" style={{fontWeight: '600'}}> {(f.price * selectedFoods[f.product_id]).toLocaleString()} đ</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="payment-footer-section">
                                <div className="total-amount-row">
                                    <span className="total-label">Tổng cộng</span>
                                    <span className="total-value" style={{color: '#f37021', fontSize: '20px', fontWeight: 'bold'}}>
                                        {(totalTicketPrice + totalFoodPrice).toLocaleString()} ₫
                                    </span>
                                </div>

                                <div className="action-buttons-group">
                                    <button className="btn-confirm-booking" onClick={handleContinue} style={{width: '100%', padding: '12px', background: '#f37021', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px'}}>
                                        TIẾP TỤC
                                    </button>
                                    <button className="btn-go-back" onClick={() => navigate(-1)} style={{width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline'}}>
                                        Quay lại chọn ghế
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>

                </div>
            </main>
        </div>
    );
};

export default Food;