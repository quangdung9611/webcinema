// ===================== BookingSidebar.js =====================
import React from 'react';
import CountdownTimer from '../pages/CountdownTimer';

import { optimizeCloudinary, IMAGE_SIZES } from '../../utils/imageHelper';
import '../styles/BookingSidebar.css';

const BookingSidebar = ({
    movie,
    showtimeDetail,
    selectedCinema,
    selectedDate,
    selectedShowtime,

    selectedSeats = [],
    selectedFoods = [],

    totalTicketPrice = 0,
    totalFoodPrice = 0,
    grandTotal = 0,

    isTimerActive = false,
    onExpire = () => {},

    onContinue = null,
    continueText = 'TIẾP TỤC',
    isContinueDisabled = false,

    showFoodSection = false,
    showContinueButton = false,
    showBackButton = false,
    onBack = null
}) => {

    const foodList = Array.isArray(selectedFoods) ? selectedFoods : [];
    const hasFood = foodList.length > 0;
    const finalTotal = grandTotal || totalTicketPrice;

    const rawPosterUrl = movie?.movie_poster || null;
    const movieTitle = showtimeDetail?.title || movie?.title || 'Đang cập nhật';

    // ✅ Phòng chiếu
    const roomName =
        showtimeDetail?.room_name ||
        selectedShowtime?.room_name ||
        '';

    // ✅ CHỈ LẤY PHẦN GIỜ (HH:mm) — BỎ NGÀY
    const rawStartTime =
        selectedShowtime?.time ||          // API thường có sẵn "18:15"
        selectedShowtime?.start_time ||    // Fallback: "2026-09-21 18:15"
        showtimeDetail?.start_time ||
        '';

    // Tách chỉ lấy HH:mm từ string
    const startTime = (() => {
        if (!rawStartTime) return '';

        const str = String(rawStartTime).trim();

        // Nếu đã là "18:15" hoặc "18:15:00" → lấy 5 ký tự đầu
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
            return str.substring(0, 5);
        }

        // Nếu là "2026-09-21 18:15" hoặc "2026-09-21 18:15:00" → split lấy phần giờ
        const parts = str.split(' ');
        if (parts.length >= 2) {
            return parts[1].substring(0, 5);
        }

        // Fallback cuối
        return str;
    })();

    // ✅ Format suất chiếu: "18:15 - Phòng 2D 01"
    const showtimeDisplay = startTime
        ? roomName
            ? `${startTime} - ${roomName}`
            : startTime
        : '---';

    // ✅ Format ngày cho đẹp (nếu là "2026-09-21" → "21/09/2026")
    const formatDate = (dateStr) => {
        if (!dateStr) return '---';

        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;

            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();

            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    };

    // ✅ Tối ưu ảnh poster cho sidebar (600px)
    const posterUrl = optimizeCloudinary(
        rawPosterUrl,
        IMAGE_SIZES.MOVIE_POSTER_DETAIL
    );

    return (
        <aside className="ticket-sidebar">
            {/* Timer luôn nằm trên cùng */}
            {isTimerActive && <CountdownTimer onExpire={onExpire} />}

            {/* ====== LAYOUT NGANG (Poster + Info) ====== */}
            <div className="sidebar-horizontal-layout">

                <div className="poster-container">
                    {posterUrl ? (
                        <img
                            src={posterUrl}
                            alt={movieTitle}
                            className="booking-poster"
                            loading="lazy"
                            decoding="async"
                            width="200"
                            height="300"
                        />
                    ) : (
                        <div className="poster-placeholder" />
                    )}
                </div>

                {/* Thông tin bên phải */}
                <div className="ticket-details">
                    <h2 className="movie-name">{movieTitle}</h2>

                    {/* ✅ RẠP */}
                    <div className="detail-item">
                        <span>Rạp:</span>
                        <strong>{selectedCinema?.cinema_name || '---'}</strong>
                    </div>

                    {/* ✅ NGÀY — GIỮ NGUYÊN */}
                    <div className="detail-item">
                        <span>Ngày:</span>
                        <strong>{formatDate(selectedDate)}</strong>
                    </div>

                    {/* ✅ SUẤT — CHỈ GIỜ + PHÒNG, KHÔNG CÓ NGÀY */}
                    <div className="detail-item">
                        <span>Suất:</span>
                        <strong>{showtimeDisplay}</strong>
                    </div>

                    {/* ✅ GHẾ */}
                    <div className="detail-item">
                        <span>Ghế:</span>
                        <strong className="seats-list">
                            {selectedSeats.length > 0
                                ? selectedSeats
                                      .map(seat => `${seat.seat_row}${seat.seat_number}`)
                                      .join(', ')
                                : '---'}
                        </strong>
                    </div>

                    {/* THỨC ĂN */}
                    {showFoodSection && hasFood && (
                        <div className="food-selected-box">
                            <h4 className="food-selected-title">THỨC ĂN ĐÃ CHỌN</h4>
                            {foodList.map(item => (
                                <div key={item.product_id} className="food-selected-item">
                                    <span>{item.product_name} x {item.quantity}</span>
                                    <strong>
                                        {(Number(item.price) * Number(item.quantity)).toLocaleString()}₫
                                    </strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ====== TỔNG CỘNG ====== */}
                    <div className="total-summary-box">
                        <div className="summary-total">
                            <span className="summary-label">Tổng cộng</span>
                            <strong className="summary-value">
                                {Number(finalTotal).toLocaleString()}₫
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== NÚT QUAY LẠI / TIẾP TỤC ====== */}
            {(showContinueButton || showBackButton) && (
                <div className="full-width-actions">
                    {showBackButton && (
                        <button
                            className="btn-back-food-sidebar"
                            onClick={onBack}
                        >
                            Quay lại
                        </button>
                    )}
                    {showContinueButton && (
                        <button
                            className="btn-next-sidebar"
                            onClick={onContinue}
                            disabled={isContinueDisabled}
                        >
                            {continueText}
                        </button>
                    )}
                </div>
            )}
        </aside>
    );
};

export default BookingSidebar;