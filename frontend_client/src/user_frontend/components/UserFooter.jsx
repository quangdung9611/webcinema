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
    FileText,
    CalendarDays,
    Star,
    Clapperboard,
    ArrowUp,
    Sparkles
} from 'lucide-react';

import '../styles/Footer.css';

const UserFooter = () => {
    const navigate = useNavigate();

    // ============================================================
    // SCROLL TO TOP
    // ============================================================

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // ============================================================
    // VỀ TRANG CHỦ
    // ============================================================

    const handleLogoClick = () => {
        navigate('/');
        scrollToTop();
    };

    return (
        <footer className="mystic-footer">

            {/* =====================================================
                CINEMATIC DECORATION
            ===================================================== */}

            <div
                className="mystic-footer-glow mystic-footer-glow-left"
                aria-hidden="true"
            />

            <div
                className="mystic-footer-glow mystic-footer-glow-right"
                aria-hidden="true"
            />

            {/* =====================================================
                MAIN FOOTER
            ===================================================== */}

            <div className="mystic-footer-container">

                {/* =================================================
                    BRAND / GIỚI THIỆU
                ================================================= */}

                <div className="mystic-footer-brand">
                    <button
                        type="button"
                        className="mystic-footer-brand-logo"
                        onClick={handleLogoClick}
                        aria-label="Về trang chủ QD Cinema"
                    >
                       <img
                            src="https://res.cloudinary.com/mlznpd9x/image/upload/v1790041080/logocinema1_wuqztk.png"
                            alt="QD Cinema"
                        />
                    </button>
                    <div className="mystic-footer-brand-line" />

                    <p className="mystic-footer-description">
                        QD Cinema mang đến trải nghiệm điện ảnh hiện đại
                        với không gian cao cấp, âm thanh sống động và những
                        khoảnh khắc đáng nhớ trên màn ảnh rộng.
                    </p>

                    {/* SOCIAL */}

                    <div className="mystic-footer-social-block">

                        <h4 className="mystic-footer-social-title">
                            KẾT NỐI VỚI CHÚNG TÔI
                        </h4>

                        <div className="mystic-footer-socials">

                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                            >
                                <Facebook size={19} strokeWidth={1.8} />
                            </a>

                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                            >
                                <Instagram size={19} strokeWidth={1.8} />
                            </a>

                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Youtube"
                            >
                                <Youtube size={19} strokeWidth={1.8} />
                            </a>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    DỊCH VỤ
                ================================================= */}

                <div className="mystic-footer-column">

                    <div className="mystic-footer-heading">

                        <div className="mystic-footer-heading-title">
                            <span className="mystic-footer-heading-kicker">
                                KHÁM PHÁ
                            </span>

                            <h3>DỊCH VỤ</h3>
                        </div>

                        <span className="mystic-footer-heading-line" />

                    </div>

                    <ul className="mystic-footer-list">

                        <li>
                            <Link
                                to="/movies/status/phim-dang-chieu"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <Ticket
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Phim Đang Chiếu</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/movies/status/phim-sap-chieu"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <CalendarDays
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Phim Sắp Chiếu</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/promotion"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <BadgePercent
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Khuyến Mãi</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/blog-cinema"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <Clapperboard
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Góc Điện Ảnh</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/membership"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <Gift
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Ưu Đãi Thành Viên</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                    </ul>

                </div>

                {/* =================================================
                    LIÊN HỆ
                ================================================= */}

                <div className="mystic-footer-column">

                    <div className="mystic-footer-heading">

                        <div className="mystic-footer-heading-title">
                            <span className="mystic-footer-heading-kicker">
                                THÔNG TIN
                            </span>

                            <h3>LIÊN HỆ</h3>
                        </div>

                        <span className="mystic-footer-heading-line" />

                    </div>

                    <div className="mystic-footer-contact-list">

                        {/* ADDRESS */}

                        <div className="mystic-footer-contact-item">

                            <div className="mystic-footer-contact-icon">
                                <MapPin
                                    size={20}
                                    strokeWidth={1.7}
                                />
                            </div>

                            <div className="mystic-footer-contact-content">
                                <span className="mystic-footer-contact-label">
                                    Địa chỉ
                                </span>

                                <p>
                                    123 Đường Số 7, Bình Tân,
                                    <br />
                                    TP. Hồ Chí Minh
                                </p>
                            </div>

                        </div>

                        {/* PHONE */}

                        <div className="mystic-footer-contact-item">

                            <div className="mystic-footer-contact-icon">
                                <Phone
                                    size={20}
                                    strokeWidth={1.7}
                                />
                            </div>

                            <div className="mystic-footer-contact-content">
                                <span className="mystic-footer-contact-label">
                                    Hotline
                                </span>

                                <p>
                                    1900 1234
                                </p>
                            </div>

                        </div>

                        {/* EMAIL */}

                        <div className="mystic-footer-contact-item">

                            <div className="mystic-footer-contact-icon">
                                <Mail
                                    size={20}
                                    strokeWidth={1.7}
                                />
                            </div>

                            <div className="mystic-footer-contact-content">
                                <span className="mystic-footer-contact-label">
                                    Email
                                </span>

                                <p>
                                    support@quangdungcinema.id.vn
                                </p>
                            </div>

                        </div>

                        {/* OPENING HOURS */}

                        <div className="mystic-footer-contact-item">

                            <div className="mystic-footer-contact-icon">
                                <Clock3
                                    size={20}
                                    strokeWidth={1.7}
                                />
                            </div>

                            <div className="mystic-footer-contact-content">
                                <span className="mystic-footer-contact-label">
                                    Giờ hoạt động
                                </span>

                                <p>
                                    08:00 - 23:00
                                    <br />
                                    Tất cả các ngày
                                </p>
                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    HỖ TRỢ
                ================================================= */}

                <div className="mystic-footer-column">

                    <div className="mystic-footer-heading">

                        <div className="mystic-footer-heading-title">
                            <span className="mystic-footer-heading-kicker">
                                TRỢ GIÚP
                            </span>

                            <h3>HỖ TRỢ</h3>
                        </div>

                        <span className="mystic-footer-heading-line" />

                    </div>

                    <ul className="mystic-footer-list">

                        <li>
                            <Link
                                to="/faq"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <CircleHelp
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Câu Hỏi Thường Gặp</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/privacy-policy"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <ShieldCheck
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Chính Sách Bảo Mật</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/terms"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <FileText
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Điều Khoản Sử Dụng</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/booking-guide"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <Ticket
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Hướng Dẫn Đặt Vé</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                        <li>
                            <Link
                                to="/contacts"
                                onClick={scrollToTop}
                            >
                                <div className="mystic-footer-link-content">
                                    <Headphones
                                        size={19}
                                        strokeWidth={1.7}
                                    />

                                    <span>Liên Hệ Hỗ Trợ</span>
                                </div>

                                <ChevronRight
                                    size={17}
                                    strokeWidth={1.8}
                                />
                            </Link>
                        </li>

                    </ul>

                </div>

            </div>

            {/* =====================================================
                FEATURE BAR
            ===================================================== */}

            <div className="mystic-footer-feature-wrapper">

                <div className="mystic-footer-feature-bar">

                    {/* FEATURE 1 */}

                    <div className="mystic-footer-feature">

                        <div className="mystic-footer-feature-icon">
                            <ShieldCheck
                                size={24}
                                strokeWidth={1.6}
                            />
                        </div>

                        <div className="mystic-footer-feature-content">
                            <strong>
                                Thanh toán an toàn
                            </strong>

                            <span>
                                Bảo mật thông tin khách hàng
                            </span>
                        </div>

                    </div>

                    <span className="mystic-footer-feature-divider" />

                    {/* FEATURE 2 */}

                    <div className="mystic-footer-feature">

                        <div className="mystic-footer-feature-icon">
                            <Ticket
                                size={24}
                                strokeWidth={1.6}
                            />
                        </div>

                        <div className="mystic-footer-feature-content">
                            <strong>
                                Đặt vé nhanh chóng
                            </strong>

                            <span>
                                Chỉ vài thao tác đơn giản
                            </span>
                        </div>

                    </div>

                    <span className="mystic-footer-feature-divider" />

                    {/* FEATURE 3 */}

                    <div className="mystic-footer-feature">

                        <div className="mystic-footer-feature-icon">
                            <Headphones
                                size={24}
                                strokeWidth={1.6}
                            />
                        </div>

                        <div className="mystic-footer-feature-content">
                            <strong>
                                Hỗ trợ 24/7
                            </strong>

                            <span>
                                Luôn sẵn sàng hỗ trợ bạn
                            </span>
                        </div>

                    </div>

                </div>

            </div>

            {/* =====================================================
                BOTTOM BAR
            ===================================================== */}

            <div className="mystic-footer-bottom-wrapper">

                <div className="mystic-footer-bottom">

                    {/* COPYRIGHT */}

                    <div className="mystic-footer-copyright">
                        <span>
                            © 2026 QD Cinema.
                        </span>

                        <span>
                            Tất cả quyền được bảo lưu.
                        </span>
                    </div>

                    {/* LEGAL LINKS */}

                    <div className="mystic-footer-legal">

                        <Link
                            to="/terms"
                            onClick={scrollToTop}
                        >
                            Điều khoản sử dụng
                        </Link>

                        <span>|</span>

                        <Link
                            to="/privacy-policy"
                            onClick={scrollToTop}
                        >
                            Chính sách bảo mật
                        </Link>

                        <span>|</span>

                        <Link
                            to="/contacts"
                            onClick={scrollToTop}
                        >
                            Hỗ trợ khách hàng
                        </Link>

                    </div>

                    {/* BRAND SIGNATURE */}

                    <button
                        type="button"
                        className="mystic-footer-signature"
                        onClick={handleLogoClick}
                        aria-label="Về trang chủ QD Cinema"
                    >
                        <span className="mystic-footer-signature-icon">
                            <Sparkles
                                size={16}
                                strokeWidth={1.5}
                            />
                        </span>

                        <span className="mystic-footer-signature-name">
                            QD
                        </span>

                        <span className="mystic-footer-signature-text">
                            MORE THAN A MOVIE
                        </span>
                    </button>

                    {/* SCROLL TOP */}

                    <button
                        type="button"
                        className="mystic-footer-scrolltop"
                        onClick={scrollToTop}
                        aria-label="Lên đầu trang"
                    >
                        <ArrowUp
                            size={20}
                            strokeWidth={2}
                        />
                    </button>

                </div>

            </div>

        </footer>
    );
};

export default UserFooter;