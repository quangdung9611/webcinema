import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
    Facebook,
    Instagram,
    Youtube,
    MapPin,
    Phone,
    Mail,
    Clock3,
    ShieldCheck,
    Ticket,
    Headphones,
    ChevronRight,
    CircleHelp,
    BadgePercent,
    Gift,
    FileText
} from 'lucide-react';

import '../styles/Footer.css';

const UserFooter = () => {

    const navigate = useNavigate();

    return (
      <footer className="mystic-footer">

    {/* ========= MAIN ========= */}
    <div className="mystic-footer-container">

        {/* =====================================================
            GIỚI THIỆU
        ===================================================== */}
        <div className="mystic-footer-brand">

            <div className="mystic-footer-heading">
                <h3>GIỚI THIỆU</h3>
                <span></span>
            </div>

            <p className="mystic-footer-description">
                CineStar mang đến trải nghiệm điện ảnh đẳng cấp với hệ
                thống rạp hiện đại, âm thanh sống động và dịch vụ tận tâm
                hàng đầu.
            </p>

            <div className="mystic-footer-divider"></div>

            <h4 className="mystic-footer-social-title">
                KẾT NỐI VỚI CHÚNG TÔI
            </h4>

            <div className="mystic-footer-socials">

                <a href="#">
                    <Facebook size={22} />
                </a>

                <a href="#">
                    <Instagram size={22} />
                </a>

                <a href="#">
                    <Youtube size={22} />
                </a>

            </div>

        </div>

        {/* =====================================================
            DỊCH VỤ
        ===================================================== */}
        <div className="mystic-footer-column">

            <div className="mystic-footer-heading">
                <h3>DỊCH VỤ</h3>
                <span></span>
            </div>

            <ul>

                <li>
                    <Link to="/movies">
                        <div>
                            <Ticket size={19} />
                            <span>Phim Đang Chiếu</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/coming-soon">
                        <div>
                            <Ticket size={19} />
                            <span>Phim Sắp Chiếu</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/promotion">
                        <div>
                            <BadgePercent size={19} />
                            <span>Khuyến Mãi</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/booking-policy">
                        <div>
                            <FileText size={19} />
                            <span>Quy Định Đặt Vé</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/membership">
                        <div>
                            <Gift size={19} />
                            <span>Ưu Đãi Thành Viên</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

            </ul>

        </div>

        {/* =====================================================
            LIÊN HỆ
        ===================================================== */}
        <div className="mystic-footer-column">

            <div className="mystic-footer-heading">
                <h3>LIÊN HỆ</h3>
                <span></span>
            </div>

            <div className="mystic-footer-contact-list">

                <div className="mystic-footer-contact-item">
                    <MapPin size={22} />

                    <p>
                        123 Đường Số 7, Bình Tân,
                        TP. Hồ Chí Minh
                    </p>
                </div>

                <div className="mystic-footer-contact-item">
                    <Phone size={22} />

                    <p>
                        Hotline: 1900 1234
                    </p>
                </div>

                <div className="mystic-footer-contact-item">
                    <Mail size={22} />

                    <p>
                        support@cinemashop.vn
                    </p>
                </div>

                <div className="mystic-footer-contact-item">
                    <Clock3 size={22} />

                    <p>
                        Giờ hoạt động:
                        <br />
                        08:00 - 23:00 (Tất cả các ngày)
                    </p>
                </div>

            </div>

        </div>

        {/* =====================================================
            HỖ TRỢ
        ===================================================== */}
        <div className="mystic-footer-column">

            <div className="mystic-footer-heading">
                <h3>HỖ TRỢ</h3>
                <span></span>
            </div>

            <ul>

                <li>
                    <Link to="/faq">
                        <div>
                            <CircleHelp size={19} />
                            <span>Câu Hỏi Thường Gặp</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/privacy-policy">
                        <div>
                            <ShieldCheck size={19} />
                            <span>Chính Sách Bảo Mật</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/terms">
                        <div>
                            <FileText size={19} />
                            <span>Điều Khoản Sử Dụng</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/booking-guide">
                        <div>
                            <Ticket size={19} />
                            <span>Hướng Dẫn Đặt Vé</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

                <li>
                    <Link to="/contact">
                        <div>
                            <Headphones size={19} />
                            <span>Liên Hệ Hỗ Trợ</span>
                        </div>

                        <ChevronRight size={18} />
                    </Link>
                </li>

            </ul>

        </div>

    </div>

    {/* ========= FEATURE BAR ========= */}
    <div className="mystic-footer-feature-bar">

        <div className="mystic-footer-feature">
            <ShieldCheck size={22} />
            <span>Thanh toán an toàn</span>
        </div>

        <div className="mystic-footer-feature">
            <Ticket size={22} />
            <span>Đặt vé nhanh chóng</span>
        </div>

        <div className="mystic-footer-feature">
            <Headphones size={22} />
            <span>Hỗ trợ 24/7</span>
        </div>

    </div>

    {/* ========= COPYRIGHT ========= */}
    <div className="mystic-footer-bottom">

        <div
            className="mystic-footer-logo"
            onClick={() => navigate('/')}
        >
            <img
                src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png"
                alt="Cinema Logo"
            />
        </div>

        <p>
            © 2026 <span>CineStar</span>. Tất cả quyền được bảo lưu.
        </p>

        <button
            className="mystic-footer-scrolltop"
            onClick={() =>
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                })
            }
        >
            ↑
        </button>

    </div>

</footer>
    );
};

export default UserFooter;