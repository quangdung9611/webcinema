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

    showFoodSection = false,
    showContinueButton = false,
    showBackButton = false,
    onBack = null
}) => {

    const foodList = Array.isArray(selectedFoods) ? selectedFoods : [];
    const hasFood = foodList.length > 0;
    const finalTotal = grandTotal || totalTicketPrice;

    // ✅ Chỉ lấy movie_poster, không fallback
    const posterUrl = movie?.movie_poster || null;

    const movieTitle = showtimeDetail?.title || movie?.title || 'Đang cập nhật';

    return (
        <aside className="ticket-sidebar">

            {isTimerActive && <CountdownTimer onExpire={onExpire} />}

            <div className="poster-container">
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={movieTitle}
                        style={{
                            width: '100%',
                            aspectRatio: '2 / 3',
                            objectFit: 'cover',
                            display: 'block',
                        }}
                    />
                ) : (
                    // Không có ảnh -> hiển thị khối trống (hoặc placeholder)
                    <div className="poster-placeholder" />
                )}
            </div>

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
                    <strong>{selectedShowtime?.start_time || '---'}</strong>
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

                <div className="total-price-box">
                    <div className="price-row">
                        <span>Tiền vé</span>
                        <strong>{Number(totalTicketPrice).toLocaleString()}₫</strong>
                    </div>
                    {showFoodSection && hasFood && (
                        <div className="price-row">
                            <span>Thức ăn</span>
                            <strong>{Number(totalFoodPrice).toLocaleString()}₫</strong>
                        </div>
                    )}
                    <div className="grand-total">
                        <p>TỔNG TIỀN</p>
                        <h3>{Number(finalTotal).toLocaleString()}₫</h3>
                    </div>
                </div>

                {(showContinueButton || showBackButton) && (
                    <div className="food-sidebar-actions">
                        {showContinueButton && (
                            <button className="btn-next-sidebar" onClick={onContinue}>
                                {continueText}
                            </button>
                        )}
                        {showBackButton && (
                            <button className="btn-back-food-sidebar" onClick={onBack}>
                                Quay lại
                            </button>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default BookingSidebar;