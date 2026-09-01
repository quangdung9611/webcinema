// ===================== BookingSidebar.js =====================
import React from 'react';
import CountdownTimer from '../pages/CountdownTimer';
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

    const posterUrl = movie?.movie_poster || null;
    const movieTitle = showtimeDetail?.title || movie?.title || 'Đang cập nhật';
    const roomName = showtimeDetail?.room_name || selectedShowtime?.room_name || '---';

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
                        />
                    ) : (
                        <div className="poster-placeholder" />
                    )}
                </div>

                {/* Thông tin bên phải */}
                <div className="ticket-details">
                    <h2 className="movie-name">{movieTitle}</h2>

                    <div className="detail-item">
                        <span>Rạp:</span>
                        <strong>{selectedCinema?.cinema_name || '---'}</strong>
                    </div>
                    <div className="detail-item">
                        <span>Ngày:</span>
                        <strong>{selectedDate || '---'}</strong>
                    </div>
                    <div className="detail-item">
                        <span>Suất:</span>
                        <strong>
                            {selectedShowtime?.start_time || '---'}
                            {roomName !== '---' && ` - ${roomName}`}
                        </strong>
                    </div>
                    <div className="detail-item">
                        <span>Ghế:</span>
                        <strong className="seats-list">
                            {selectedSeats.length > 0
                                ? selectedSeats.map(seat => `${seat.seat_row}${seat.seat_number}`).join(', ')
                                : '---'}
                        </strong>
                    </div>

                    {showFoodSection && hasFood && (
                        <div className="food-selected-box">
                            <h4 className="food-selected-title">THỨC ĂN ĐÃ CHỌN</h4>
                            {foodList.map(item => (
                                <div key={item.product_id} className="food-selected-item">
                                    <span>{item.product_name} x {item.quantity}</span>
                                    <strong>{(Number(item.price) * Number(item.quantity)).toLocaleString()}₫</strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ====== TỔNG CỘNG ====== */}
                    <div className="total-summary-box">
                        <div className="summary-total">
                            <span className="summary-label">Tổng cộng</span>
                            <strong className="summary-value">{Number(finalTotal).toLocaleString()}₫</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== NÚT QUAY LẠI / TIẾP TỤC (NẰM NGOÀI, TRÀN FULL) ====== */}
            {(showContinueButton || showBackButton) && (
                <div className="full-width-actions">
                    {showBackButton && (
                        <button className="btn-back-food-sidebar" onClick={onBack}>
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
            {/* ======================================================== */}
        </aside>
    );
};

export default BookingSidebar;