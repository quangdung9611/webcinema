import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react'; 
import axios from 'axios';
import '../styles/ConfirmSuccess.css';
import '../styles/Booking.css'; // Để dùng chung style Stepper

const ConfirmSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [printTime, setPrintTime] = useState('');
    const hasConfirmed = useRef(false); // Dùng ref để tránh gọi API 2 lần do StrictMode

    // --- CƠ CHẾ GIỮ DATA THÔNG MINH ---
    const [ticketData] = useState(() => {
        const navState = location.state;
        const incomingData = navState?.data || navState;
        
        if (incomingData && (incomingData.orderId || incomingData.bookingId)) {
            sessionStorage.setItem('lastSuccessTicket', JSON.stringify(incomingData));
            return incomingData;
        }

        const savedData = sessionStorage.getItem('lastSuccessTicket');
        return savedData ? JSON.parse(savedData) : null;
    });

   // --- LOGIC CHỐT ĐƠN TỰ ĐỘNG & CẬP NHẬT ĐIỂM ---
    useEffect(() => {
    const confirmBookingOnServer = async () => {
        const bID = ticketData?.orderId || ticketData?.bookingId;

        if (bID && !hasConfirmed.current) {
            hasConfirmed.current = true;
            try {
                // Đợi 1.5 giây để Server xử lý xong Callback từ MoMo trước
                // Việc này giúp tránh xung đột (Race Condition)
                await new Promise(resolve => setTimeout(resolve, 1500));

                console.log(`>>> [CINEMA STAR] Đang kiểm tra trạng thái đơn hàng #${bID}...`);
                
                // Thay vì gọi "complete" (yêu cầu chốt), ông nên gọi API lấy "detail" 
                // để xem đơn hàng đã được Callback chốt chưa.
                const response = await axios.get(`https://webcinema-zb8z.onrender.com/api/bookings/detail/${bID}`, {
                    withCredentials: true 
                });

                if (response.data.success) {
                    console.log("✅ [CINEMA STAR] Đơn hàng đã được xác nhận!");

                    // Sau đó mới cập nhật Profile để lấy điểm thưởng mới
                    const userRes = await axios.get('https://webcinema-zb8z.onrender.com/api/auth/me', {
                        withCredentials: true 
                    });

                    if (userRes.data.success) {
                        localStorage.setItem('user', JSON.stringify(userRes.data.user));
                        window.dispatchEvent(new Event("storage"));
                        console.log("✨ [CINEMA STAR] Điểm thưởng mới đã sẵn sàng!");
                    }
                }
            } catch (err) {
                console.error("❌ [CINEMA STAR] Lỗi:", err.response?.data?.message || err.message);
            }
        }
    };

    confirmBookingOnServer();
}, [ticketData]);

    // --- HIỂN THỊ THỜI GIAN ---
    useEffect(() => {
        const now = new Date();
        setPrintTime(now.toLocaleString('vi-VN'));
        window.scrollTo(0, 0);
    }, []);

    // Nếu không có dữ liệu thì quay về home
    if (!ticketData) {
        return (
            <div className="error-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h2>Không tìm thấy thông tin giao dịch</h2>
                <button onClick={() => navigate('/')} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
                    Quay lại trang chủ
                </button>
            </div>
        );
    }

    const { 
        movieTitle, moviePoster, cinemaName, roomName,
        startTime, selectedDate, ticketPIN, customerName,
        customerEmail, seatDisplay, orderId, bookingId, selectedFoods 
    } = ticketData;

    const finalOrderId = orderId || bookingId;
    const posterUrl = moviePoster 
        ? (moviePoster.startsWith('http') ? moviePoster : `https://webcinema-zb8z.onrender.com/uploads/posters/${moviePoster}`)
        : null;

    return (
        <div className="success-page-wrapper">
            {/* Stepper Bar: Hiển thị hoàn tất cả 4 bước */}
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
                    <h2 style={{ color: '#27ae60', marginTop: '15px' }}>THANH TOÁN THÀNH CÔNG!</h2>
                    <p>Cảm ơn <strong>{customerName}</strong>, giao dịch của ông đã hoàn tất.</p>
                    <p className="order-code-text">Mã đơn hàng: <span style={{ color: '#f37021', fontWeight: 'bold' }}>#{finalOrderId}</span></p>
                </div>

                <div className="ticket-visual">
                    <div className="ticket-left">
                        <div className="movie-poster-mini">
                            {posterUrl ? (
                                <img src={posterUrl} alt={movieTitle} />
                            ) : (
                                <div className="no-poster">CINEMA STAR</div>
                            )}
                        </div>
                        <div className="ticket-info">
                            <h4 className="ticket-movie-title">{movieTitle || 'Thông tin phim'}</h4>
                            <div className="ticket-detail-grid">
                                <div className="detail-item">
                                    <span className="label">RẠP</span>
                                    <span className="value">{cinemaName || 'Cinema Star'}</span> 
                                </div>
                                <div className="detail-item">
                                    <span className="label">PHÒNG</span>
                                    <span className="value">{roomName || 'Phòng chiếu'}</span>
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
                                    <span className="value seat-highlight" style={{ color: '#f37021', fontWeight: 'bold' }}>
                                        {seatDisplay || 'Đang cập nhật'}
                                    </span>
                                </div>
                                
                                {selectedFoods && selectedFoods.length > 0 && (
                                    <div className="detail-item full-width">
                                        <span className="label">COMBO ĐÃ CHỌN</span>
                                        <div className="value food-list-mini">
                                            {selectedFoods.map((f, idx) => (
                                                <div key={idx} style={{ fontSize: '13px' }}>• {f.product_name || f.item_name} (x{f.quantity})</div>
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
                        <p className="pin-label">MÃ PIN NHẬN VÉ</p>
                        <h1 className="pin-number" style={{ color: '#034EA1' }}>{ticketPIN || '******'}</h1>
                        <div className="qr-box-final">
                            <QRCodeCanvas 
                                value={`TICKET-${finalOrderId}-${ticketPIN}`} 
                                size={110} 
                                includeMargin={true}
                                level={"H"}
                            />
                        </div>
                        <p style={{ fontSize: '10px', color: '#888', marginTop: '10px' }}>Quét mã tại quầy để in vé</p>
                    </div>
                </div>

                <div className="success-footer">
                    <div className="email-notify" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                        <i className="far fa-envelope" style={{ marginRight: '8px' }}></i>
                        <span>Thông tin vé đã được gửi đến: <strong>{customerEmail}</strong></span>
                    </div>
                    
                    <div className="action-buttons" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button 
                            className="btn-home" 
                            onClick={() => navigate('/')}
                            style={{ padding: '12px 30px', borderRadius: '25px', border: '1px solid #034EA1', background: '#fff', color: '#034EA1', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            VỀ TRANG CHỦ
                        </button>
                        <button 
                            className="btn-print" 
                            onClick={() => window.print()}
                            style={{ padding: '12px 30px', borderRadius: '25px', border: 'none', background: '#f37021', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            <i className="fas fa-print" style={{ marginRight: '8px' }}></i> IN VÉ NGAY
                        </button>
                    </div>
                    <p style={{ fontSize: '11px', color: '#bbb', marginTop: '20px' }}>Giao dịch lúc: {printTime}</p>
                </div>
            </div>
        </div>
    );
};

export default ConfirmSuccess;