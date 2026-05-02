import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import '../styles/Footer.css';

const UserFooter = () => {
    return (
        <footer className="user-footer">
            <div className="footer-container">

                {/* ===== CỘT 1 ===== */}
                <div className="footer-section about">
                     <div className="logo" onClick={() => { navigate('/'); closeMobileMenu(); }}>
                        <img 
                            src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png" 
                            alt="Cinema Star Logo" 
                            style={{ height: '45px', objectFit: 'contain' }} 
                        />
                    </div>

                    <p>
                        Tận hưởng những giây phút giải trí tuyệt vời với hệ thống rạp chiếu phim 
                        hiện đại hàng đầu. Hình ảnh sắc nét, âm thanh sống động.
                    </p>

                    <div className="social-links">
                        <a href="#"><Facebook size={20} /></a>
                        <a href="#"><Instagram size={20} /></a>
                        <a href="#"><Youtube size={20} /></a>
                    </div>
                </div>

                {/* ===== CỘT 2 ===== */}
                <div className="footer-section links">
                    <h3>Dịch Vụ</h3>
                    <ul>
                        <li><Link to="/movies">Phim Đang Chiếu</Link></li>
                        <li><Link to="/coming-soon">Phim Sắp Chiếu</Link></li>
                        <li><Link to="/promotion">Khuyến Mãi</Link></li>
                        <li><Link to="/booking-policy">Quy Định Đặt Vé</Link></li>
                    </ul>
                </div>

                {/* ===== CỘT 3 ===== */}
                <div className="footer-section contact">
                    <h3>Liên Hệ</h3>

                    <p>
                        <MapPin size={16} />
                        <span>123 Đường Số 7, Bình Tân, TP.HCM</span>
                    </p>

                    <p>
                        <Phone size={16} />
                        <span>Hotline: 1900 1234</span>
                    </p>

                    <p>
                        <Mail size={16} />
                        <span>support@cinemashop.vn</span>
                    </p>
                </div>

                {/* ===== CỘT 4 ===== */}
                <div className="footer-section support">
                    <h3>Hỗ Trợ</h3>
                    <ul>
                        <li><Link to="/faq">Câu Hỏi Thường Gặp</Link></li>
                        <li><Link to="/privacy-policy">Chính Sách Bảo Mật</Link></li>
                        <li><Link to="/terms">Điều Khoản Sử Dụng</Link></li>
                        <li><Link to="/contact">Liên Hệ Hỗ Trợ</Link></li>
                    </ul>
                </div>

            </div>

            {/* ===== BOTTOM ===== */}
            <div className="footer-bottom">
                <p>
                    © 2026 Cinema Shop - Thiết kế bởi Quang Dũng. All Rights Reserved.
                </p>
            </div>
        </footer>
    );
};

export default UserFooter;