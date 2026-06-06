import React from 'react';
import CountdownTimer from '../pages/CountdownTimer';

// Styles
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

    // =============================
    // ARRAY FOOD
    // =============================
    const foodList = Array.isArray(selectedFoods)
        ? selectedFoods
        : [];

    // =============================
    // CHECK FOOD
    // =============================
    const hasFood =
        foodList.length > 0;

    // =============================
    // TOTAL
    // =============================
    const finalTotal =
        grandTotal || totalTicketPrice;

    return (

        <aside className="ticket-sidebar">

            {/* ================= TIMER ================= */}
            {isTimerActive && (
                <CountdownTimer
                    onExpire={onExpire}
                />
            )}

            {/* ================= POSTER ================= */}
            <div className="poster-container">

                <img
                    src={`https://api.quangdungcinema.id.vn/uploads/posters/${
                        showtimeDetail?.poster_url ||
                        movie?.poster_url
                    }`}
                    alt="Movie Poster"
                />
            </div>

            {/* ================= DETAILS ================= */}
            <div className="ticket-details">

                {/* MOVIE */}
                <h2 className="movie-name">
                    {showtimeDetail?.title ||
                        movie?.title}
                </h2>

                {/* CINEMA */}
                <div className="detail-item">

                    <span>Rạp:</span>

                    <strong>
                        {selectedCinema?.cinema_name ||
                            '---'}
                    </strong>
                </div>

                {/* DATE */}
                <div className="detail-item">

                    <span>Ngày:</span>

                    <strong>
                        {selectedDate || '---'}
                    </strong>
                </div>

                {/* SHOWTIME */}
                <div className="detail-item">

                    <span>Suất:</span>

                    <strong>
                        {selectedShowtime?.start_time ||
                            '---'}
                    </strong>
                </div>

                {/* SEATS */}
                <div className="detail-item">

                    <span>Ghế:</span>

                    <strong className="seats-list">

                        {selectedSeats.length > 0
                            ? selectedSeats
                                  .map(
                                      seat =>
                                          `${seat.seat_row}${seat.seat_number}`
                                  )
                                  .join(', ')
                            : '---'}
                    </strong>
                </div>

                {/* ================= FOOD ================= */}
                {showFoodSection && hasFood && (

                    <div className="food-selected-box">

                        <h4 className="food-selected-title">
                            THỨC ĂN ĐÃ CHỌN
                        </h4>

                        {foodList.map(item => (

                            <div
                                key={item.product_id}
                                className="food-selected-item"
                            >

                                <span>
                                    {item.product_name} x
                                    {item.quantity}
                                </span>

                                <strong>
                                    {(
                                        Number(item.price) *
                                        Number(item.quantity)
                                    ).toLocaleString()}
                                    ₫
                                </strong>
                            </div>
                        ))}
                    </div>
                )}

                {/* ================= TOTAL ================= */}
                <div className="total-price-box">

                    {/* TICKET */}
                    <div className="price-row">

                        <span>Tiền vé</span>

                        <strong>
                            {Number(
                                totalTicketPrice
                            ).toLocaleString()}
                            ₫
                        </strong>
                    </div>

                    {/* FOOD */}
                    {showFoodSection && hasFood && (

                        <div className="price-row">

                            <span>Thức ăn</span>

                            <strong>
                                {Number(
                                    totalFoodPrice
                                ).toLocaleString()}
                                ₫
                            </strong>
                        </div>
                    )}

                    {/* GRAND */}
                    <div className="grand-total">

                        <p>TỔNG TIỀN</p>

                        <h3>
                            {Number(
                                finalTotal
                            ).toLocaleString()}
                            ₫
                        </h3>
                    </div>
                </div>

                {/* ================= ACTIONS ================= */}
                {(showContinueButton ||
                    showBackButton) && (

                    <div className="food-sidebar-actions">

                        {/* CONTINUE */}
                        {showContinueButton && (

                            <button
                                className="btn-next-sidebar"
                                onClick={onContinue}
                            >
                                {continueText}
                            </button>
                        )}

                        {/* BACK */}
                        {showBackButton && (

                            <button
                                className="btn-back-food-sidebar"
                                onClick={onBack}
                            >
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