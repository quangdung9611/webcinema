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
    onBack = null,

    // ✅ PROPS MỚI CHO RESCHEDULE
    isReschedule = false,
    oldTotalAmount = 0,
}) => {

    const foodList = Array.isArray(selectedFoods) ? selectedFoods : [];
    const hasFood = foodList.length > 0;
    const finalTotal = grandTotal || totalTicketPrice;

    // ✅ Tính chênh lệch (chỉ khi reschedule)
    const deltaAmount = isReschedule ? (totalTicketPrice - oldTotalAmount) : 0;

    const rawPosterUrl = movie?.movie_poster || null;
    const movieTitle = showtimeDetail?.title || movie?.title || 'Đang cập nhật';

    // ✅ Phòng chiếu
    const roomName =
        showtimeDetail?.room_name ||
        selectedShowtime?.room_name ||
        '';

    // ✅ CHỈ LẤY PHẦN GIỜ (HH:mm) — BỎ NGÀY
    const rawStartTime =
        selectedShowtime?.time ||
        selectedShowtime?.start_time ||
        showtimeDetail?.start_time ||
        '';

    // Tách chỉ lấy HH:mm từ string
    const startTime = (() => {
        if (!rawStartTime) return '';

        const str = String(rawStartTime).trim();

        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
            return str.substring(0, 5);
        }

        const parts = str.split(' ');
        if (parts.length >= 2) {
            return parts[1].substring(0, 5);
        }

        return str;
    })();

    // ✅ Format suất chiếu: "18:15 - Phòng 2D 01"
    const showtimeDisplay = startTime
        ? roomName
            ? `${startTime} - ${roomName}`
            : startTime
        : '---';

    // ✅ Format ngày cho đẹp
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

    // ✅ Tối ưu ảnh poster
    const posterUrl = optimizeCloudinary(
        rawPosterUrl,
        IMAGE_SIZES.MOVIE_POSTER_DETAIL
    );

    return (
        <aside className="ticket-sidebar">
            {/* Timer */}
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

                    {/* RẠP */}
                    <div className="detail-item">
                        <span>Rạp:</span>
                        <strong>{selectedCinema?.cinema_name || '---'}</strong>
                    </div>

                    {/* NGÀY */}
                    <div className="detail-item">
                        <span>Ngày:</span>
                        <strong>{formatDate(selectedDate)}</strong>
                    </div>

                    {/* SUẤT */}
                    <div className="detail-item">
                        <span>Suất:</span>
                        <strong>{showtimeDisplay}</strong>
                    </div>

                    {/* GHẾ */}
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
                        {isReschedule ? (
                            <>
                                {/* ✅ RESCHEDULE — HIỂN THỊ SO SÁNH */}
                                
                                {/* Giá vé gốc (gạch ngang) */}
                                <div className="summary-row summary-old">
                                    <span className="summary-label">Giá vé gốc</span>
                                    <strong className="summary-value-strike">
                                        {Number(oldTotalAmount).toLocaleString()}₫
                                    </strong>
                                </div>

                                {/* Giá vé mới */}
                                <div className="summary-row summary-new">
                                    <span className="summary-label">Giá vé mới</span>
                                    <strong className="summary-value-new">
                                        {Number(totalTicketPrice).toLocaleString()}₫
                                    </strong>
                                </div>

                                {/* Đường phân cách */}
                                <div className="summary-divider" />

                                {/* Chênh lệch */}
                                <div className={`summary-row summary-delta ${deltaAmount > 0 ? 'delta-pay' : deltaAmount < 0 ? 'delta-refund' : 'delta-same'}`}>
                                    <span className="summary-label">
                                        {deltaAmount > 0
                                            ? 'Bù thêm'
                                            : deltaAmount < 0
                                                ? 'Hoàn lại'
                                                : 'Không đổi'}
                                    </span>
                                    <strong className="summary-value-delta">
                                        {deltaAmount === 0
                                            ? '0₫'
                                            : `${deltaAmount > 0 ? '+' : '-'}${Math.abs(deltaAmount).toLocaleString()}₫`
                                        }
                                    </strong>
                                </div>
                            </>
                        ) : (
                            /* ✅ FLOW THƯỜNG */
                            <div className="summary-total">
                                <span className="summary-label">Tổng cộng</span>
                                <strong className="summary-value">
                                    {Number(finalTotal).toLocaleString()}₫
                                </strong>
                            </div>
                        )}
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