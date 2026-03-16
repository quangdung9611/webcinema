import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Payment.css';
import '../styles/Booking.css'; // Dùng chung layout hệ thống
import Modal from '../../admin_frontend/components/Modal';
import CountdownTimer from './CountdownTimer'; 
import { useAuth } from '../../context/AuthContext';

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth(); 
    
    const { 
        movie, cinemaName, slot, selectedDate, 
        selectedSeats, selectedFoods, 
        totalTicketPrice, totalFoodPrice, showtimeDetail
    } = location.state || {};

    const [couponCode, setCouponCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedCouponId, setAppliedCouponId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('bank');
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); 
    
    const [userInfo, setUserInfo] = useState({
        user_id: user?.user_id || '', 
        full_name: user?.full_name || '', 
        email: user?.email || '', 
        phone: user?.phone || ''
    });

    const [modal, setModal] = useState({
        show: false, type: '', title: '', message: '', onConfirm: null
    });

    const showtimeId = slot?.showtime_id || slot?.id;

    const showNotice = (type, title, message, onConfirm = null) => {
        setModal({
            show: true, type, title, message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    const handleTimeExpire = async () => {
        try {
            if (selectedSeats?.length > 0) {
                await axios.post('http://localhost:5000/api/seats/release', { 
                    seatIds: selectedSeats.map(s => s.seat_id),
                    showtimeId: showtimeId
                });
            }
        } catch (err) {
            console.error("Lỗi nhả ghế tự động:", err);
        }
        sessionStorage.clear();
        showNotice('error', 'HẾT THỜI GIAN', 'Hết thời gian giữ ghế rồi! Vui lòng đặt lại nhé.', () => {
            navigate('/'); 
            window.location.reload();
        });
    };

    const subTotal = (totalTicketPrice || 0) + (totalFoodPrice || 0);
    const grandTotal = subTotal - discountAmount;

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!movie || !selectedSeats) {
            navigate('/');
            return;
        }
        if (sessionStorage.getItem('holdExpiresAt')) {
            setIsTimerActive(true);
        }
    }, [movie, selectedSeats, navigate]);

    const handleApplyCoupon = async () => {
        const inputCode = couponCode.toUpperCase().trim();
        if (!inputCode) {
            showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập mã giảm giá.');
            return;
        }
        try {
            const res = await axios.post(`http://localhost:5000/api/coupons/check`, {
                code: inputCode,
                userId: userInfo.user_id
            });
            if (res.data.success) {
                const { discount_value, coupon_id } = res.data.data;
                setDiscountAmount(discount_value);
                setAppliedCouponId(coupon_id);
                showNotice('success', 'THÀNH CÔNG', `Đã áp dụng mã giảm giá thành công!`);
            }
        } catch (err) {
            showNotice('error', 'THÔNG BÁO', err.response?.data?.message || "Mã không hợp lệ.");
        }
    };

    const handleProceed = async () => {
        if (!userInfo.full_name || !userInfo.email || !userInfo.phone) {
            showNotice('error', 'THÔNG TIN TRỐNG', 'Vui lòng điền đầy đủ thông tin để nhận vé nhé!');
            return;
        }

        setIsProcessing(true);
        try {
            
            const postData = {
                userId: userInfo.user_id,
                showtimeId: showtimeId,
                totalAmount: grandTotal,
                discountAmount: discountAmount,
                couponId: appliedCouponId,
                selectedSeats: selectedSeats,
                selectedFoods: selectedFoods,
                customerEmail: userInfo.email,
                customerName: userInfo.full_name,
                movieTitle: movie?.title,
                cinemaName: cinemaName,
                startTime: slot?.start_time,
                status: 'pending' 
            };

            const response = await axios.post('http://localhost:5000/api/payment/process', postData);

            if (response.data.success) {
                // === DŨNG THÊM DÒNG NÀY VÀO ĐÚNG VỊ TRÍ NÀY ===
            // Xóa session ngay lập tức trước khi navigate
            sessionStorage.removeItem('holdExpiresAt');
            sessionStorage.removeItem('selectedSeats');
            sessionStorage.removeItem('currentShowtimeId');
            setIsTimerActive(false); // Tắt state hiển thị timer
            // ===========================================
                const finalState = { 
                    bookingId: response.data.bookingId,
                    totalAmount: grandTotal,
                    customerName: userInfo.full_name,
                    customerEmail: userInfo.email,
                    movieTitle: movie?.title,
                    moviePoster: movie?.poster_url, 
                    cinemaName: cinemaName,
                    // Lấy room_name từ showtimeDetail đã có sẵn trong state của Payment
                    roomName: showtimeDetail?.room_name || 'Phòng 01',
                    startTime: slot?.start_time,
                    selectedDate: selectedDate,
                    seatDisplay: selectedSeats.flatMap(s => s.seat_type === 'Couple' ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number)+1}`] : [`${s.seat_row}${s.seat_number}`]).join(', '),
                    selectedFoods,
                };

                if (paymentMethod === 'bank') {
                    await axios.post('http://localhost:5000/api/bank/send-otp', { email: userInfo.email, bookingId: response.data.bookingId });
                    navigate('/bank-app', { state: finalState });
                } else {
                    navigate('/momo-app', { state: finalState });
                }
            }
        } catch (err) {
            showNotice('error', 'LỖI', 'Không thể xử lý thanh toán lúc này.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="booking-page-full-wrapper">
            <Modal 
                show={modal.show} 
                type={modal.type} 
                title={modal.title} 
                message={modal.message} 
                onConfirm={modal.onConfirm} 
                onCancel={() => setModal({...modal, show: false})}
            />

            {/* 1. STEPPER BAR ĐỒNG BỘ */}
            <div className="stepper-bar-full">
                <div className="stepper-content">
                    <div className="step-item done">01 CHỌN GHẾ</div>
                    <div className="step-item done">02 BẮP NƯỚC</div>
                    <div className="step-item active">03 THANH TOÁN</div>
                </div>
            </div>

            <main className="booking-main-layout">
                <div className="booking-grid-container">
                    
                    {/* 2. KHU VỰC THÔNG TIN & THANH TOÁN (BÊN TRÁI) */}
                    <div className="payment-main-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Nhập Coupon */}
                        <section className="seat-selection-card" style={{ padding: '30px' }}>
                            <h3 className="section-title" style={{ color: 'var(--secondary-blue)', marginBottom: '20px' }}>MÃ GIẢM GIÁ</h3>
                            <div className="coupon-group" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                <input 
                                    className="payment-input-text" 
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    type="text" 
                                    placeholder="NHẬP MÃ GIẢM GIÁ TẠI ĐÂY..." 
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                />
                                <button className="btn-qty" style={{ width: 'auto', padding: '0 25px', borderRadius: '8px' }} onClick={handleApplyCoupon}>ÁP DỤNG</button>
                            </div>
                        </section>

                        {/* Thông tin khách hàng */}
                        <section className="seat-selection-card" style={{ padding: '30px', alignItems: 'flex-start' }}>
                            <h3 className="section-title" style={{ color: 'var(--secondary-blue)', marginBottom: '20px' }}>THÔNG TIN NHẬN VÉ</h3>
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%' }}>
                                <div className="input-field">
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Họ và tên</label>
                                    <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={userInfo.full_name} onChange={(e) => setUserInfo({...userInfo, full_name: e.target.value})} />
                                </div>
                                <div className="input-field">
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Số điện thoại</label>
                                    <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={userInfo.phone} onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="input-field" style={{ width: '100%', marginTop: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Email nhận vé</label>
                                <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={userInfo.email} onChange={(e) => setUserInfo({...userInfo, email: e.target.value})} />
                            </div>
                        </section>

                        {/* Hình thức thanh toán */}
                        <section className="seat-selection-card" style={{ padding: '30px', alignItems: 'flex-start' }}>
                            <h3 className="section-title" style={{ color: 'var(--secondary-blue)', marginBottom: '20px' }}>HÌNH THỨC THANH TOÁN</h3>
                            <div className="payment-methods-list" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <label className={`method-item ${paymentMethod === 'bank' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', gap: '15px' }}>
                                    <input type="radio" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} />
                                    <div>
                                        <strong style={{ display: 'block' }}>Thanh toán VietQR</strong>
                                        <small style={{ color: '#888' }}>Quét mã QR từ ứng dụng ngân hàng</small>
                                    </div>
                                </label>
                                <label className={`method-item ${paymentMethod === 'momo' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '12px', cursor: 'pointer', gap: '15px' }}>
                                    <input type="radio" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} />
                                    <div>
                                        <strong style={{ display: 'block' }}>Ví điện tử MoMo</strong>
                                        <small style={{ color: '#888' }}>Thanh toán nhanh qua ứng dụng MoMo</small>
                                    </div>
                                </label>
                            </div>
                        </section>
                    </div>

                    {/* 3. SIDEBAR (BÊN PHẢI) - ĐỒNG BỘ 100% */}
                    <aside className="right-section-sidebar">
                        <div className="sidebar-sticky-content">
                            {isTimerActive && (
                                <div className="timer-display-box">
                                    <CountdownTimer onExpire={handleTimeExpire} />
                                </div>
                            )}

                            <div className="movie-info-summary">
                                <img src={`http://localhost:5000/uploads/posters/${showtimeDetail?.poster_url || movie?.poster_url}`} alt="" className="summary-poster" />
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
                                <p className="detail-row">Suất: <strong>{new Date(slot?.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong> - {selectedDate}</p>
                                
                                <div className="billing-summary-list" style={{ marginTop: '15px', borderTop: '1px dashed #eee', paddingTop: '15px' }}>
                                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Ghế: </span>
                                        <strong className="highlight-orange">
                                            {selectedSeats.flatMap(s => s.seat_type === 'Couple' 
                                                ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number)+1}`] 
                                                : [`${s.seat_row}${s.seat_number}`]).join(', ')}
                                        </strong>
                                    </div>
                                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Tạm tính:</span>
                                        <span>{subTotal.toLocaleString()} đ</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                                            <span>Giảm giá:</span>
                                            <span>-{discountAmount.toLocaleString()} đ</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="payment-footer-section">
                                <div className="total-amount-row">
                                    <span className="total-label">Tổng thanh toán</span>
                                    <span className="total-value">{grandTotal.toLocaleString()} ₫</span>
                                </div>

                                <div className="action-buttons-group">
                                    <button className="btn-confirm-booking" onClick={handleProceed} disabled={isProcessing}>
                                        {isProcessing ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN THANH TOÁN'}
                                    </button>
                                    <button className="btn-go-back" onClick={() => navigate(-1)} disabled={isProcessing}>Quay lại</button>
                                </div>
                            </div>
                        </div>
                    </aside>

                </div>
            </main>
        </div>
    );
};

export default Payment;