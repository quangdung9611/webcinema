import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react'; 
import '../styles/ConfirmSuccess.css';

const ConfirmSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [printTime, setPrintTime] = useState('');

    // --- CƠ CHẾ GIỮ DATA THÔNG MINH ---
    const [ticketData] = useState(() => {
        // Ưu tiên 1: Dữ liệu mới từ điều hướng (state)
        const navState = location.state;
        const incomingData = navState?.data || navState;
        
        if (incomingData && incomingData.orderId) {
            // Lưu vào sessionStorage để dự phòng trường hợp trang đang load mà bị gián đoạn
            sessionStorage.setItem('lastSuccessTicket', JSON.stringify(incomingData));
            return incomingData;
        }

        // Ưu tiên 2: Lấy lại từ sessionStorage nếu lỡ tay F5
        const savedData = sessionStorage.getItem('lastSuccessTicket');
        return savedData ? JSON.parse(savedData) : null;
    });

    useEffect(() => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
        setPrintTime(formattedDate);
        
        if (ticketData) {
            console.log("Dữ liệu hiển thị:", ticketData);

            // SỬA TẠI ĐÂY: Xóa sạch dữ liệu trong Session Storage ngay sau khi nạp vào State
            // Giúp tab Application -> Session Storage sạch sẽ cho lần đặt vé sau
            sessionStorage.removeItem('lastSuccessTicket');
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
                            <h4 className="ticket-movie-title">{movieTitle}</h4>
                            <div className="ticket-detail-grid">
                                <div className="detail-item">
                                    <span className="label">RẠP</span>
                                    <span className="value">{cinemaName || 'Thông tin rạp đang cập nhật'}</span> 
                                </div>
                                <div className="detail-item">
                                    <span className="label">PHÒNG</span>
                                    <span className="value">{roomName || 'Đang cập nhật'}</span>
                                </div>
                                <div className="detail-item"><span className="label">NGÀY</span><span className="value">{selectedDate}</span></div>
                                <div className="detail-item"><span className="label">SUẤT</span><span className="value">{startTime}</span></div>
                                
                                <div className="detail-item full-width">
                                    <span className="label">GHẾ</span>
                                    <span className="value seat-highlight">
                                        {seatDisplay || 'Chưa chọn ghế'}
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