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
        alert("Thời gian giữ ghế của Dũng đã hết! Vui lòng thực hiện lại từ đầu.");
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
        const finalFoods = foods
            .filter(f => selectedFoods[f.product_id] > 0)
            .map(f => ({ 
                product_id: f.product_id,
                product_name: f.product_name,
                price: f.price,
                quantity: selectedFoods[f.product_id] 
            }));

        navigate('/payment', { 
            state: { 
                ...location.state, 
                selectedFoods: finalFoods, 
                totalFoodPrice,
                grandTotal: totalTicketPrice + totalFoodPrice 
            } 
        });
    };

    return (
        <div className="booking-page-full-wrapper">
            {/* 1. STEPPER BAR ĐỒNG BỘ */}
            <div className="stepper-bar-full">
                <div className="stepper-content">
                    <div className="step-item done">01 CHỌN GHẾ</div>
                    <div className="step-item active">02 BẮP NƯỚC</div>
                    <div className="step-item">03 THANH TOÁN</div>
                </div>
            </div>

            <main className="booking-main-layout">
                <div className="booking-grid-container">
                    
                    {/* 2. KHU VỰC CHỌN FOOD (BÊN TRÁI) */}
                    <section className="seat-selection-card">
                        <h2 className="food-title-main" style={{marginBottom: '30px', color: 'var(--secondary-blue)'}}>
                            COMBO BẮP NƯỚC ƯU ĐÃI
                        </h2>
                        
                        <div className="food-grid-container" style={{width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                            {foods.map(item => (
                                <div key={item.product_id} className="food-card-custom" style={{display: 'flex', border: '1px solid #eee', borderRadius: '12px', padding: '15px', gap: '15px'}}>
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/foods/${item.food_image}`} 
                                        alt={item.product_name} 
                                        style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px'}}
                                    />
                                    <div className="food-info" style={{flex: 1}}>
                                        <h4 style={{margin: '0 0 10px 0', fontSize: '16px'}}>{item.product_name}</h4>
                                        <p style={{color: 'var(--primary-orange)', fontWeight: 'bold', margin: '0 0 15px 0'}}>
                                            {Number(item.price).toLocaleString()} đ
                                        </p>
                                        <div className="food-ctrl" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                            <button onClick={() => updateQty(item.product_id, -1)} className="btn-qty">-</button>
                                            <span style={{fontWeight: 'bold'}}>{selectedFoods[item.product_id] || 0}</span>
                                            <button onClick={() => updateQty(item.product_id, 1)} className="btn-qty">+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 3. SIDEBAR (BÊN PHẢI) - GIỮ NGUYÊN STYLE CỦA BOOKING */}
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
                                <p className="detail-row"><strong>{cinemaName}</strong> - {showtimeDetail?.room_name || 'Phòng chờ'}</p>
                                <p className="detail-row">Suất: <strong>{new Date(slot?.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong> - {selectedDate || 'Hôm nay'}</p>
                                
                                <div className="selected-items-list" style={{marginTop: '15px', borderTop: '1px dashed #eee', paddingTop: '15px'}}>
                                    <div style={{marginBottom: '10px'}}>
                                        <span>Ghế: </span>
                                        <strong className="highlight-orange">
                                            {selectedSeats.flatMap(s => s.seat_type === 'Couple' 
                                                ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number)+1}`] 
                                                : [`${s.seat_row}${s.seat_number}`]).join(', ')}
                                        </strong>
                                    </div>
                                    
                                    {/* Hiển thị đồ ăn đã chọn trong sidebar */}
                                    {foods.filter(f => selectedFoods[f.product_id] > 0).map(f => (
                                        <div key={f.product_id} style={{fontSize: '14px', marginBottom: '5px'}}>
                                            {f.product_name} x{selectedFoods[f.product_id]} : 
                                            <span className="highlight-orange"> {(f.price * selectedFoods[f.product_id]).toLocaleString()} đ</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="payment-footer-section">
                                <div className="total-amount-row">
                                    <span className="total-label">Tổng cộng</span>
                                    <span className="total-value">{(totalTicketPrice + totalFoodPrice).toLocaleString()} ₫</span>
                                </div>

                                <div className="action-buttons-group">
                                    <button className="btn-confirm-booking" onClick={handleContinue}>
                                        Tiếp tục
                                    </button>
                                    <button className="btn-go-back" onClick={() => navigate(-1)}>Quay lại chọn ghế</button>
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