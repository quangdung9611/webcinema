import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react'; 
import axios from 'axios'; // THÊM MỚI: Để gọi lệnh chốt đơn
import '../styles/ConfirmSuccess.css';

const ConfirmSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [printTime, setPrintTime] = useState('');

    // --- CƠ CHẾ GIỮ DATA THÔNG MINH (Giữ nguyên của ông) ---
    const [ticketData] = useState(() => {
        const navState = location.state;
        const incomingData = navState?.data || navState;
        
        if (incomingData && incomingData.orderId) {
            sessionStorage.setItem('lastSuccessTicket', JSON.stringify(incomingData));
            return incomingData;
        }

        const savedData = sessionStorage.getItem('lastSuccessTicket');
        return savedData ? JSON.parse(savedData) : null;
    });

    // --- LOGIC CHỐT ĐƠN TỰ ĐỘNG (Để fix lỗi Pending và Khóa ghế) ---
    useEffect(() => {
        const confirmBookingOnServer = async () => {
            // Lấy ID đơn hàng (ưu tiên orderId từ ticketData)
            const bID = ticketData?.orderId || ticketData?.bookingId;

            if (bID) {
                try {
                    console.log(`>>> [DŨNG CINEMA] Đang kích hoạt chốt đơn #${bID}...`);
                    
                    // Gọi API complete mà ông đã thêm vào Route
                    const response = await axios.post('https://webcinema-zb8z.onrender.com/api/payment/complete', {
                        bookingId: bID
                    });

                    if (response.data.success) {
                        console.log("✅ [DŨNG CINEMA] Chốt đơn thành công! Ghế đã được khóa màu đỏ.");
                    }
                } catch (err) {
                    console.error("❌ [DŨNG CINEMA] Lỗi khi gọi API chốt đơn:", err.message);
                }
            }
        };

        if (ticketData && ticketData.orderId) {
            confirmBookingOnServer();
        }
    }, [ticketData]);

    // --- HIỂN THỊ THỜI GIAN IN VÉ ---
    useEffect(() => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
        setPrintTime(formattedDate);
        
        if (ticketData) {
            console.log("Dữ liệu hiển thị:", ticketData);
        }
    }, [ticketData]);

    // Nếu không có dữ liệu thì đá về home
    if (!ticketData || !ticketData.orderId) {
        return (
            <div className="error-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h2 style={{ color: '#333' }}>Không tìm thấy thông tin vé</h2>
                <button className="btn-home" onClick={() => navigate('/')}
                    style={{ marginTop: '20px', padding: '12px 25px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '5px' }}>
                    Quay lại trang chủ
                </button>
            </div>
        );
    }

    const { 
        movieTitle, moviePoster, cinemaName, roomName,
        startTime, selectedDate, ticketPIN, customerName,
        customerEmail, seatDisplay, orderId, selectedFoods 
    } = ticketData;

    const posterUrl = moviePoster 
        ? (moviePoster.startsWith('http') ? moviePoster : `https://webcinema-zb8z.onrender.com/uploads/posters/${moviePoster}`)
        : null;

    return (
        <div className="success-page-wrapper">
            <div className="success-card">
                <div className="success-header">
                    <div className="check-circle"><i className="fas fa-check"></i></div>
                    <h2>THANH TOÁN THÀNH CÔNG!</h2>
                    <p>Chào <strong>{customerName}</strong>, ông đã đặt vé thành công.</p>
                    <p className="order-code-text">Mã đơn: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>#{orderId}</span></p>
                </div>

                <div className="ticket-visual">
                    <div className="ticket-left">
                        <div className="movie-poster-mini">
                            {posterUrl ? (
                                <img src={posterUrl} alt={movieTitle} onError={(e) => e.target.style.display='none'} />
                            ) : (
                                <div className="no-poster">Cinema Star</div>
                            )}
                        </div>
                        <div className="ticket-info">
                            <h4 className="ticket-movie-title">{movieTitle || 'Phim chưa xác định'}</h4>
                            <div className="ticket-detail-grid">
                                <div className="detail-item">
                                    <span className="label">RẠP</span>
                                    <span className="value">{cinemaName || ticketData.cinema_name || 'Cinema Star'}</span> 
                                </div>
                                <div className="detail-item">
                                    <span className="label">PHÒNG</span>
                                    <span className="value">{roomName || ticketData.room_name || 'Standard'}</span>
                                </div>
                                <div className="detail-item"><span className="label">NGÀY</span><span className="value">{selectedDate}</span></div>
                                <div className="detail-item"><span className="label">SUẤT</span><span className="value">{startTime}</span></div>
                                
                                <div className="detail-item full-width">
                                    <span className="label">GHẾ</span>
                                    <span className="value seat-highlight">
                                        {seatDisplay || 'Đang cập nhật'}
                                    </span>
                                </div>
                                
                                {selectedFoods && selectedFoods.length > 0 && (
                                    <div className="detail-item full-width">
                                        <span className="label">BẮP NƯỚC</span>
                                        <div className="value">
                                            {selectedFoods.map((f, idx) => (
                                                <div key={idx}>• {f.product_name || f.item_name} (x{f.quantity})</div>
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
                        <h1 className="pin-number">{ticketPIN}</h1>
                        <div className="qr-box-final">
                            <QRCodeCanvas value={`TICKET-${orderId}`} size={120} includeMargin={true} />
                        </div>
                    </div>
                </div>

                <div className="success-footer">
                    <div className="email-notify">
                        <span>Gửi tới: <strong>{customerEmail}</strong></span>
                    </div>
                    <div className="action-buttons">
                        <button className="btn-home" onClick={() => navigate('/')}>TRANG CHỦ</button>
                        <button className="btn-print" onClick={() => window.print()}>IN VÉ</button>
                    </div>
                    <p style={{ fontSize: '10px', color: '#ccc', marginTop: '10px' }}>Thời gian in: {printTime}</p>
                </div>
            </div>
        </div>
    );
};

export default ConfirmSuccess;