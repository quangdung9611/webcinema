import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/MomoApp.css';

const MomoApp = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Nhận dữ liệu từ trang đặt vé truyền sang
    const ticketData = location.state || {}; 
    const { bookingId, totalAmount, movieTitle } = ticketData;

    const [isConfirming, setIsConfirming] = useState(false);

    // Thông tin hiển thị của Dũng
    const myMomoPhone = "0909489611";
    const myName = "NGUYEN PHAM QUANG DUNG";
    
    // Link VietQR chuẩn
    const qrImageUrl = `https://img.vietqr.io/image/momo-${myMomoPhone}-compact.jpg?amount=${totalAmount || 85000}&addInfo=DungCinema%20${bookingId || '2F5B7196'}&accountName=${encodeURIComponent(myName)}`;

    // LOGIC CHÍNH: Giả lập xác nhận thanh toán
    useEffect(() => {
        // Hẹn giờ đúng 5 giây bắt đầu chạy trình xác nhận
        const autoConfirm = setTimeout(() => {
            setIsConfirming(true); // Hiển thị loader "Đang kiểm tra"
            
            // 1. Gọi API cập nhật DB (Chạy ngầm, không dùng await để tránh đứng trang nếu API lỗi)
            axios.post('https://webcinema-zb8z.onrender.com/api/momo/confirm-fast', {
                bookingId: bookingId
            }).then(() => {
                console.log("Xác nhận thanh toán thành công qua API");
            }).catch(error => {
                console.error("Lỗi xác thực Backend nhưng vẫn cho đi tiếp để demo:", error);
            });
            
            // 2. Sau khi hiện loader 1.5 giây, chắc chắn chuyển trang Success
            setTimeout(() => {
                navigate('/confirm-success', { 
                    state: { ...ticketData },
                    replace: true // Không cho user quay lại trang QR khi đã xong
                });
            }, 1500);

        }, 5000); // 5 giây đúng ý Dũng nhé

        return () => clearTimeout(autoConfirm);
    }, [bookingId, navigate, ticketData]);

    return (
        <div className="momo-checkout-page">
            <nav className="momo-nav-bar">
                <div className="nav-content">
                    <img src="https://webcinema-zb8z.onrender.com/uploads/Bank/momo_logo.jpg" alt="MoMo Logo" />
                    <span>Cổng thanh toán MoMo</span>
                </div>
            </nav>

            <main className="momo-checkout-container">
                <div className="momo-order-details">
                    <h2 className="section-title">Thông tin đơn hàng</h2>
                    
                    <div className="info-group">
                        <label>Nhà cung cấp</label>
                        <div className="vendor-info">
                            <img src="https://webcinema-zb8z.onrender.com/uploads/Bank/galaxy_logo.jpg" alt="Galaxy" />
                            <span>Galaxy Cinema</span>
                        </div>
                    </div>

                    <div className="info-group">
                        <label>Mã đơn hàng</label>
                        <p className="order-value">{bookingId || '2F5B7196'}</p>
                    </div>

                    <div className="info-group">
                        <label>Mô tả</label>
                        <p className="order-value">{movieTitle || 'Vé xem phim'} (#{bookingId})</p>
                    </div>

                    <div className="info-group">
                        <label>Số tiền</label>
                        <p className="order-value amount">
                            {Number(totalAmount || 85000).toLocaleString('vi-VN')} đ
                        </p>
                    </div>

                    <div className="momo-status-box">
                        <p className="status-text">Đang chờ quét mã...</p>
                    </div>
                </div>

                <div className="momo-qr-section">
                    <div className="qr-card">
                        <div className="qr-wrapper">
                            <img 
                                src={qrImageUrl} 
                                alt="Payment QR Code" 
                                style={{ opacity: isConfirming ? 0.3 : 1 }}
                            />
                            {!isConfirming && <div className="scan-line"></div>}
                            
                            {isConfirming && (
                                <div className="confirm-overlay">
                                    <div className="loader"></div>
                                    <p>Đang kiểm tra giao dịch...</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="qr-instruction">
                        <p>Mở ứng dụng <b>MoMo</b> để quét mã thanh toán</p>
                    </div>

                    <div className="help-text">
                        Hệ thống sẽ tự động xác nhận sau 5 giây...
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MomoApp;