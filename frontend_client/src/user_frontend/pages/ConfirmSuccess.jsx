import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react'; 
import axios from 'axios';
import '../styles/ConfirmSuccess.css';
import '../styles/Booking.css';

const ConfirmSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [printTime, setPrintTime] = useState('');
    const hasConfirmed = useRef(false);

    const [ticketData, setTicketData] = useState(() => {
        const navState = location.state;
        const incomingData = navState?.data || navState;
        
        if (incomingData && (incomingData.orderId || incomingData.bookingId)) {
            sessionStorage.setItem('lastSuccessTicket', JSON.stringify(incomingData));
            return incomingData;
        }

        const savedData = sessionStorage.getItem('lastSuccessTicket');
        return savedData ? JSON.parse(savedData) : null;
    });

    useEffect(() => {
        const confirmBookingOnServer = async () => {
            const bID = ticketData?.orderId || ticketData?.bookingId;

            if (bID && !hasConfirmed.current) {
                hasConfirmed.current = true;
                try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const response = await axios.get(`https://api.quangdungcinema.id.vn/api/bookings/detail/${bID}`, {
                        withCredentials: true 
                    });

                    if (response.data.success) {
                        const b = response.data.booking;
                        const d = response.data.details;

                        // --- CHỈNH LOGIC LẤY TÊN GHẾ (Bỏ chữ "Ghế " nếu có) ---
                        const seats = d
                            ?.filter(i => i.seat_id || (i.item_name && i.item_name.includes('Ghế')))
                            .map(i => i.item_name.replace('Ghế ', '').trim()) // Xóa chữ "Ghế" dư thừa
                            .join(', ');

                        setTicketData(prev => ({
                            ...prev,
                            movieTitle: b.movie_name || prev.movieTitle,
                            cinemaName: b.cinema_name || prev.cinemaName,
                            roomName: b.room_name || prev.roomName,
                            startTime: b.show_time?.split(' - ')[0] || prev.startTime,
                            selectedDate: b.show_time?.split(' - ')[1] || prev.selectedDate,
                            seatDisplay: seats || prev.seatDisplay,
                            ticketPIN: b.pin || b.memo?.slice(-6) || prev.ticketPIN,
                            customerName: b.full_name || prev.customerName,
                            customerEmail: b.email || prev.customerEmail,
                            selectedFoods: d?.filter(i => !i.seat_id && !i.item_name.includes('Ghế'))
                        }));

                        const userRes = await axios.get('https://api.quangdungcinema.id.vn/api/auth/me', {
                            withCredentials: true 
                        });

                        if (userRes.data.success) {
                            localStorage.setItem('user', JSON.stringify(userRes.data.user));
                            window.dispatchEvent(new Event("storage"));
                        }
                    }
                } catch (err) {
                    console.error("❌ Lỗi:", err.message);
                }
            }
        };

        confirmBookingOnServer();
    }, [ticketData?.orderId, ticketData?.bookingId]);

    useEffect(() => {
        const now = new Date();
        setPrintTime(now.toLocaleString('vi-VN'));
        window.scrollTo(0, 0);
    }, []);

    if (!ticketData) return null;

    const { 
        movieTitle, moviePoster, cinemaName, roomName,
        startTime, selectedDate, ticketPIN, customerName,
        customerEmail, seatDisplay, orderId, bookingId, selectedFoods 
    } = ticketData;

    const finalOrderId = orderId || bookingId;
    const posterUrl = moviePoster 
        ? (moviePoster.startsWith('http') ? moviePoster : `https://api.quangdungcinema.id.vn/uploads/posters/${moviePoster}`)
        : null;

    // Logic lấy số phòng (Ví dụ "Phòng 1" -> lấy "1")
    const displayRoom = roomName?.replace('Phòng ', '').trim() || '1';

    return (
        <div className="success-page-wrapper">
            <div className="stepper-bar-full">
                <div className="stepper-content">
                    <div className="step-item done">01 CHỌN GHẾ</div>
                    <div className="step-item done">02 CHỌN THỨC ĂN</div>
                    <div className="step-item done">03 THANH TOÁN</div>
                    <div className="step-item done active">04 XÁC NHẬN</div>
                </div>
            </div>

            <div className="success-card">
                <div className="success-header">
                    <div className="check-circle">
                        <i className="fas fa-check" style={{ color: '#fff', fontSize: '30px' }}></i>
                    </div>
                    <h2 style={{ color: '#27ae60', marginTop: '15px', letterSpacing: '1px' }}>THANH TOÁN THÀNH CÔNG!</h2>
                    <p>Cảm ơn <strong>{customerName}</strong>, giao dịch của ông đã hoàn tất.</p>
                    <p className="order-code-text">Mã đơn hàng: <span style={{ color: '#f37021', fontWeight: 'bold' }}>#{finalOrderId}</span></p>
                </div>

                <div className="ticket-visual">
                    <div className="ticket-left">
                        <div className="movie-poster-mini">
                            {posterUrl ? <img src={posterUrl} alt={movieTitle} /> : <div className="no-poster">CINEMA STAR</div>}
                        </div>
                        <div className="ticket-info">
                            <h4 className="ticket-movie-title" style={{ color: '#e74c3c', fontSize: '20px', marginBottom: '15px' }}>{movieTitle}</h4>
                            <div className="ticket-detail-grid">
                                <div className="detail-item">
                                    <span className="label">RẠP</span>
                                    <span className="value">{cinemaName}</span> 
                                </div>
                                <div className="detail-item">
                                    <span className="label">PHÒNG</span>
                                    <span className="value">{displayRoom}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">NGÀY</span>
                                    <span className="value">{selectedDate}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">SUẤT</span>
                                    <span className="value">{startTime}</span>
                                </div>
                                <div className="detail-item full-width">
                                    <span className="label">GHẾ</span>
                                    <span className="value seat-highlight" style={{ color: '#f37021', fontWeight: 'bold', fontSize: '18px' }}>
                                        {seatDisplay || '...'}
                                    </span>
                                </div>
                                {selectedFoods && selectedFoods.length > 0 && (
                                    <div className="detail-item full-width" style={{ marginTop: '5px', borderTop: '1px dashed #eee', paddingTop: '5px' }}>
                                        <span className="label">COMBO</span>
                                        <div className="value food-list-mini">
                                            {selectedFoods.map((f, idx) => (
                                                <div key={idx} style={{ fontSize: '12px', color: '#555' }}>• {f.product_name || f.item_name} (x{f.quantity})</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="ticket-divider">
                        <div className="arc-top"></div>
                        <div className="dashed-line"></div>
                        <div className="arc-bottom"></div>
                    </div>

                    <div className="ticket-right">
                        <p className="pin-label" style={{ fontSize: '12px', color: '#888' }}>MÃ PIN NHẬN VÉ</p>
                        <h1 className="pin-number" style={{ color: '#034EA1', fontSize: '32px', margin: '5px 0' }}>{ticketPIN}</h1>
                        <div className="qr-box-final" style={{ background: '#fff', padding: '5px', borderRadius: '5px' }}>
                            <QRCodeCanvas value={`TICKET-${finalOrderId}-${ticketPIN}`} size={100} level={"H"} />
                        </div>
                        <p style={{ fontSize: '10px', color: '#999', marginTop: '10px' }}>Quét mã để in vé</p>
                    </div>
                </div>

                <div className="success-footer">
                    <div className="email-notify" style={{ background: '#f0f9f4', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #d4edda' }}>
                        <i className="far fa-envelope" style={{ marginRight: '8px', color: '#27ae60' }}></i>
                        <span style={{ fontSize: '13px' }}>Vé đã gửi đến: <strong>{customerEmail}</strong></span>
                    </div>
                    <div className="action-buttons" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button className="btn-home" onClick={() => navigate('/')} style={{ padding: '10px 25px', borderRadius: '25px', border: '1px solid #034EA1', background: '#fff', color: '#034EA1', fontWeight: 'bold', cursor: 'pointer' }}>
                            VỀ TRANG CHỦ
                        </button>
                        <button className="btn-print" onClick={() => window.print()} style={{ padding: '10px 25px', borderRadius: '25px', border: 'none', background: '#f37021', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(243, 112, 33, 0.3)' }}>
                            <i className="fas fa-print" style={{ marginRight: '8px' }}></i> IN VÉ
                        </button>
                    </div>
                    <p style={{ fontSize: '11px', color: '#bbb', marginTop: '20px' }}>{printTime}</p>
                </div>
            </div>
        </div>
    );
};

export default ConfirmSuccess;