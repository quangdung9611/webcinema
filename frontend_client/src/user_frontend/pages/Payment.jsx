import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Payment.css';
import '../styles/Booking.css'; 
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
                await axios.post('https://api.quangdungcinema.id.vn/api/seats/release', { 
                    seatIds: selectedSeats.map(s => s.seat_id),
                    showtimeId: showtimeId
                });
            }
        } catch (err) {
            console.error("Lỗi nhả ghế tự động:", err);
        }
        sessionStorage.clear();
        showNotice('error', 'HẾT THỜI GIAN', 'Hết thời gian giữ ghế rồi! Vui lòng thực hiện lại từ đầu.', () => {
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
            const res = await axios.post(`https://api.quangdungcinema.id.vn/api/coupons/check`, {
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

            const response = await axios.post('https://api.quangdungcinema.id.vn/api/payment/process', postData);

            if (response.data.success) {
                const finalState = { 
                    orderId: response.data.bookingId,
                    bookingId: response.data.bookingId,
                    totalAmount: grandTotal,
                    customerName: userInfo.full_name,
                    customerEmail: userInfo.email,
                    movieTitle: movie?.title,
                    moviePoster: movie?.poster_url, 
                    cinemaName: cinemaName,
                    roomName: showtimeDetail?.room_name || 'Phòng 01',
                    startTime: slot?.start_time,
                    selectedDate: selectedDate,
                    seatDisplay: selectedSeats.flatMap(s => s.seat_type === 'Couple' ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number)+1}`] : [`${s.seat_row}${s.seat_number}`]).join(', '),
                    selectedFoods,
                };

                sessionStorage.setItem('lastSuccessTicket', JSON.stringify(finalState));
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('selectedSeats');
                sessionStorage.removeItem('currentShowtimeId');
                setIsTimerActive(false); 

                if (paymentMethod === 'bank') {
                    await axios.post('https://api.quangdungcinema.id.vn/api/bank/send-otp', { email: userInfo.email, bookingId: response.data.bookingId });
                    navigate('/bank-app', { state: finalState });
                } else {
                    navigate('/momo-app', { state: finalState });
                }
            }
        } catch (err) {
            console.error("Lỗi xử lý thanh toán:", err);
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

            <div className="stepper-bar-full">
                <div className="stepper-content">
                    <div className="step-item done">01 CHỌN GHẾ</div>
                    <div className="step-item done">02 CHỌN THỨC ĂN</div>
                    <div className="step-item active">03 THANH TOÁN</div>
                    <div className="step-item">04 XÁC NHẬN</div>
                </div>
            </div>

            <main className="booking-main-layout">
                <div className="booking-grid-container">
                    
                    <div className="left-section-seatmap">
                        <div className="payment-main-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            <section className="seat-selection-card" style={{ padding: '30px' }}>
                                <h3 className="section-title" style={{ color: '#034EA1', marginBottom: '20px', fontWeight: 'bold' }}>MÃ GIẢM GIÁ</h3>
                                <div className="coupon-group" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <input 
                                        className="payment-input-text" 
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textTransform: 'uppercase' }}
                                        type="text" 
                                        placeholder="NHẬP MÃ GIẢM GIÁ TẠI ĐÂY..." 
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                    />
                                    <button className="btn-qty" style={{ width: 'auto', padding: '0 25px', borderRadius: '8px', background: '#f37021', color: 'white', border: 'none', fontWeight: 'bold' }} onClick={handleApplyCoupon}>ÁP DỤNG</button>
                                </div>
                            </section>

                            <section className="seat-selection-card" style={{ padding: '30px', alignItems: 'flex-start' }}>
                                <h3 className="section-title" style={{ color: '#034EA1', marginBottom: '20px', fontWeight: 'bold' }}>THÔNG TIN NHẬN VÉ</h3>
                                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%' }}>
                                    <div className="input-field">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#555' }}>Họ và tên</label>
                                        <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={userInfo.full_name} onChange={(e) => setUserInfo({...userInfo, full_name: e.target.value})} />
                                    </div>
                                    <div className="input-field">
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#555' }}>Số điện thoại</label>
                                        <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={userInfo.phone} onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})} />
                                    </div>
                                </div>
                                <div className="input-field" style={{ width: '100%', marginTop: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#555' }}>Email nhận vé</label>
                                    <input style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} value={userInfo.email} onChange={(e) => setUserInfo({...userInfo, email: e.target.value})} />
                                </div>
                            </section>

                            <section className="seat-selection-card" style={{ padding: '30px', alignItems: 'flex-start' }}>
                                <h3 className="section-title" style={{ color: '#034EA1', marginBottom: '20px', fontWeight: 'bold' }}>HÌNH THỨC THANH TOÁN</h3>
                                <div className="payment-methods-list" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <label className={`method-item ${paymentMethod === 'bank' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: paymentMethod === 'bank' ? '2px solid #f37021' : '1px solid #eee', borderRadius: '12px', cursor: 'pointer', gap: '15px', background: paymentMethod === 'bank' ? '#fff9f5' : '#fff' }}>
                                        <input type="radio" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} style={{ accentColor: '#f37021' }} />
                                        <div>
                                            <strong style={{ display: 'block', color: '#333' }}>Thanh toán VietQR</strong>
                                            <small style={{ color: '#888' }}>Quét mã QR từ ứng dụng ngân hàng</small>
                                        </div>
                                    </label>
                                    <label className={`method-item ${paymentMethod === 'momo' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: paymentMethod === 'momo' ? '2px solid #f37021' : '1px solid #eee', borderRadius: '12px', cursor: 'pointer', gap: '15px', background: paymentMethod === 'momo' ? '#fff9f5' : '#fff' }}>
                                        <input type="radio" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} style={{ accentColor: '#f37021' }} />
                                        <div>
                                            <strong style={{ display: 'block', color: '#333' }}>Ví điện tử MoMo</strong>
                                            <small style={{ color: '#888' }}>Thanh toán nhanh qua ứng dụng MoMo</small>
                                        </div>
                                    </label>
                                </div>
                            </section>
                        </div>
                    </div>

                    <aside className="right-section-sidebar">
                        <div className="sidebar-sticky-content">
                            {isTimerActive && (
                                <div className="timer-display-box">
                                    <CountdownTimer onExpire={handleTimeExpire} />
                                </div>
                            )}

                            <div className="movie-info-summary">
                                <img src={`https://api.quangdungcinema.id.vn/uploads/posters/${showtimeDetail?.poster_url || movie?.poster_url}`} alt="" className="summary-poster" />
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
                                <p className="detail-row">Suất: <strong>{new Date(slot?.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong> - {selectedDate}</p>
                                
                                <div className="billing-summary-list" style={{ marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Ghế: </span>
                                        <strong className="highlight-orange" style={{ color: '#f37021' }}>
                                            {selectedSeats.flatMap(s => s.seat_type === 'Couple' 
                                                ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number)+1}`] 
                                                : [`${s.seat_row}${s.seat_number}`]).join(', ')}
                                        </strong>
                                    </div>
                                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Tạm tính:</span>
                                        <span style={{ fontWeight: '600' }}>{subTotal.toLocaleString()} đ</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', color: '#e74c3c', fontWeight: '600' }}>
                                            <span>Giảm giá:</span>
                                            <span>-{discountAmount.toLocaleString()} đ</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="payment-footer-section">
                                <div className="total-amount-row">
                                    <span className="total-label">Tổng thanh toán</span>
                                    <span className="total-value" style={{ color: '#f37021', fontSize: '20px', fontWeight: 'bold' }}>{grandTotal.toLocaleString()} ₫</span>
                                </div>

                                <div className="action-buttons-group">
                                    <button 
                                        className="btn-confirm-booking" 
                                        onClick={handleProceed} 
                                        disabled={isProcessing}
                                        style={{ width: '100%', padding: '12px', background: '#f37021', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', marginBottom: '10px' }}
                                    >
                                        {isProcessing ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN THANH TOÁN'}
                                    </button>
                                    <button 
                                        className="btn-go-back" 
                                        onClick={() => navigate(-1)} 
                                        disabled={isProcessing}
                                        style={{ width: '100%', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Quay lại
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

export default Payment;