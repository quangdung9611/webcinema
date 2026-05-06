import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from "socket.io-client";

// Components
import Modal from '../../admin_frontend/components/Modal';
import CountdownTimer from './CountdownTimer'; 
import { SeatNormal, SeatVIP, SeatCouple } from "../components/SeatIcon";
import Seat from "../components/Seat";

// Styles
import '../styles/Booking.css';

const Booking = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { movie } = location.state || {}; 

    // --- 1. STATES QUẢN LÝ LUỒNG ---
    const [currentStep, setCurrentStep] = useState(1); 
    const [cinemas, setCinemas] = useState([]); 
    const [availableDates, setAvailableDates] = useState([]);
    const [availableShowtimes, setAvailableShowtimes] = useState([]);

    // --- 2. STATES LỰA CHỌN ---
    const [selectedCinema, setSelectedCinema] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedShowtime, setSelectedShowtime] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]); 

    const dateRef = useRef(null);
    const timeRef = useRef(null);

    const scroll = (ref, offset) => {
        if (ref.current) {
            ref.current.scrollLeft += offset;
        }
    };

    // --- 3. STATES DỮ LIỆU GHẾ & UI ---
    const [seats, setSeats] = useState([]); 
    const [showtimeDetail, setShowtimeDetail] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        show: false, type: 'info', title: '', message: '',
        onConfirm: () => {}, onCancel: null
    });

    const socket = useMemo(() => io("https://api.quangdungcinema.id.vn", {
        withCredentials: true,
        transports: ["websocket", "polling"]
    }), []);

    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id;

    // --- 4. LOGIC KHỞI TẠO (RẠP & NGÀY) ---
    useEffect(() => {
        window.scrollTo(0, 0);
        if (!movie) { navigate('/'); return; }

        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const res = await axios.get('https://api.quangdungcinema.id.vn/api/cinemas');
                setCinemas(res.data);
                
                const dates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
                setAvailableDates(dates);
            } catch (err) {
                console.error("Lỗi tải dữ liệu ban đầu:", err);
            } finally { setLoading(false); }
        };
        fetchInitialData();
    }, [movie, navigate]);

    // --- 5. LOGIC LẤY SUẤT CHIẾU (Sử dụng API filter-booking mới) ---
    useEffect(() => {
        // Chỉ gọi API khi có đủ 3 yếu tố: Rạp, Ngày và Phim
        if (selectedCinema && selectedDate && (movie?.movie_id || movie?.id)) {
            const fetchShowtimes = async () => {
                try {
                    const res = await axios.get(`https://api.quangdungcinema.id.vn/api/showtimes/filter-booking`, {
                        params: { 
                            cinema_id: selectedCinema.cinema_id, 
                            date: selectedDate, 
                            movie_id: movie.movie_id || movie.id 
                        }
                    });
                    setAvailableShowtimes(res.data);
                } catch (err) { 
                    console.error("Lỗi tải suất chiếu:", err); 
                    setAvailableShowtimes([]);
                }
            };
            fetchShowtimes();
        }
    }, [selectedCinema, selectedDate, movie]);

    // --- 6. LOGIC LẤY GHẾ & SOCKET (GIỮ NGUYÊN) ---
    const fetchSeats = useCallback(async () => {
        if (!showtimeId) return;
        try {
            setLoading(true);
            const [detailRes, seatsRes] = await Promise.all([
                axios.get(`https://api.quangdungcinema.id.vn/api/showtimes/detail/${showtimeId}`),
                axios.get(`https://api.quangdungcinema.id.vn/api/seats/showtime/${showtimeId}`)
            ]);
            setShowtimeDetail(detailRes.data);
            setSeats(seatsRes.data);

            const savedSeats = sessionStorage.getItem('selectedSeats');
            const savedShowtime = sessionStorage.getItem('currentShowtimeId');
            if (savedSeats && savedShowtime === showtimeId.toString()) {
                const parsed = JSON.parse(savedSeats);
                setSelectedSeats(parsed);
                if (sessionStorage.getItem('holdExpiresAt')) setIsTimerActive(true);
                parsed.forEach(s => socket.emit('client-chon-ghe', { seatId: s.seat_id, showtimeId }));
            }
        } catch (err) { console.error("Lỗi tải sơ đồ ghế:", err); } 
        finally { setLoading(false); }
    }, [showtimeId, socket]);

    useEffect(() => {
        if (showtimeId) {
            fetchSeats();
        }
    }, [showtimeId, fetchSeats]);

    // --- 7. XỬ LÝ REAL-TIME SOCKET (GIỮ NGUYÊN) ---
    useEffect(() => {
        if (!showtimeId) return;
        socket.on('server-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prev => prev.map(s => Number(s.seat_id) === Number(data.seatId) ? { ...s, is_locked_by_user: true } : s));
            }
        });
        socket.on('server-mo-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prev => prev.map(s => Number(s.seat_id) === Number(data.seatId) ? { ...s, is_locked_by_user: false } : s));
            }
        });
        return () => { socket.off('server-khoa-ghe'); socket.off('server-mo-khoa-ghe'); };
    }, [showtimeId, socket]);

    // --- 8. HÀM HÀNH ĐỘNG ---
    const clearBookingSession = useCallback(() => {
        selectedSeats.forEach(s => socket.emit('client-huy-chon-ghe', { seatId: s.seat_id, showtimeId }));
        sessionStorage.removeItem('selectedSeats');
        sessionStorage.removeItem('holdExpiresAt');
        sessionStorage.removeItem('currentShowtimeId');
        setIsTimerActive(false);
        setSelectedSeats([]);
    }, [selectedSeats, socket, showtimeId]);

    const handleSeatClick = (seat) => {
        if (seat.seat_status === 'Booked' || Number(seat.is_active) === 0 || seat.is_locked_by_user) return;
        const isSelected = selectedSeats.find(s => s.seat_id === seat.seat_id);
        let updated = [];

        if (isSelected) {
            updated = selectedSeats.filter(s => s.seat_id !== seat.seat_id);
            socket.emit('client-huy-chon-ghe', { seatId: seat.seat_id, showtimeId });
            if (updated.length === 0) clearBookingSession();
        } else {
            if (selectedSeats.length >= 8) return;
            updated = [...selectedSeats, seat];
            socket.emit('client-chon-ghe', { seatId: seat.seat_id, showtimeId });
            if (selectedSeats.length === 0) {
                sessionStorage.setItem('holdExpiresAt', (Date.now() + 10 * 60 * 1000).toString());
                sessionStorage.setItem('currentShowtimeId', showtimeId.toString());
                setIsTimerActive(true);
            }
        }
        setSelectedSeats(updated);
        sessionStorage.setItem('selectedSeats', JSON.stringify(updated));
    };

    const groupedSeats = useMemo(() => {
        return seats.reduce((acc, seat) => {
            const row = seat.seat_row;
            if (!acc[row]) acc[row] = [];
            acc[row].push(seat);
            acc[row].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
            return acc;
        }, {});
    }, [seats]);

    // --- 9. GIAO DIỆN RETURN ---
    return (
    <div className="booking-wrapper">
        <div className="booking-container">
            <aside className="ticket-sidebar">
                <div className="poster-container">
                    <img 
                        src={`https://api.quangdungcinema.id.vn/uploads/posters/${showtimeDetail?.poster_url || movie?.poster_url}`} 
                        alt="Movie Poster" 
                    />
                </div>
                <div className="ticket-details">
                    <h2 className="movie-name">{showtimeDetail?.title || movie?.title}</h2>
                    <div className="detail-item">
                        <span>Rạp:</span> <strong>{selectedCinema?.cinema_name || '---'}</strong>
                    </div>
                    <div className="detail-item">
                        <span>Ngày:</span> <strong>{selectedDate || '---'}</strong>
                    </div>
                    <div className="detail-item">
                        <span>Suất:</span> 
                        <strong>{selectedShowtime ? new Date(selectedShowtime.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '---'}</strong>
                    </div>
                    <div className="detail-item">
                        <span>Ghế:</span> 
                        <strong className="seats-list">{selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ') || '---'}</strong>
                    </div>
                    <div className="total-price-box">
                        <p>TỔNG TIỀN</p>
                        <h3>{selectedSeats.reduce((sum, s) => sum + Number(s.price), 0).toLocaleString()} ₫</h3>
                    </div>
                </div>
            </aside>

            <section className="main-booking-area">
                <nav className="booking-nav-flex">
                    {/* BƯỚC 1: CHỌN RẠP */}
                    <div className="nav-col cinema-select">
                        <label>1. CHỌN RẠP</label>
                        <select 
                            value={selectedCinema?.cinema_id || ''} 
                            onChange={(e) => {
                                const cinema = cinemas.find(c => c.cinema_id == e.target.value);
                                setSelectedCinema(cinema);
                                setSelectedDate(null); // Reset ngày khi đổi rạp
                                setSelectedShowtime(null); // Reset suất chiếu
                                setAvailableShowtimes([]);
                            }}
                        >
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>)}
                        </select>
                    </div>

                    {/* BƯỚC 2: CHỌN NGÀY - Disabled nếu chưa chọn Rạp */}
                    <div className={`nav-col date-slider ${!selectedCinema ? 'disabled-step' : ''}`}>
                        <label>2. CHỌN NGÀY</label>
                        <div className="slider-controls">
                            <button className="slide-btn" onClick={() => scroll(dateRef, -150)} disabled={!selectedCinema}>‹</button>
                            <div className="scroll-list" ref={dateRef}>
                                {availableDates.map(d => (
                                    <div 
                                        key={d} 
                                        className={`compact-card ${selectedDate === d ? 'active' : ''}`}
                                        onClick={() => {
                                            if(selectedCinema) {
                                                setSelectedDate(d);
                                                setSelectedShowtime(null); // Reset suất khi đổi ngày
                                            }
                                        }}
                                    >
                                        <span className="day-txt">{new Date(d).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
                                        <span className="date-txt">{new Date(d).getDate()}/{new Date(d).getMonth() + 1}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="slide-btn" onClick={() => scroll(dateRef, 150)} disabled={!selectedCinema}>›</button>
                        </div>
                    </div>

                    {/* BƯỚC 3: SUẤT CHIẾU - Disabled nếu chưa chọn Ngày */}
                    <div className={`nav-col time-slider ${!selectedDate ? 'disabled-step' : ''}`}>
                        <label>3. SUẤT CHIẾU</label>
                        <div className="slider-controls">
                            <button className="slide-btn" onClick={() => scroll(timeRef, -120)} disabled={!selectedDate}>‹</button>
                            <div className="scroll-list" ref={timeRef}>
                                {availableShowtimes.length > 0 ? (
                                    availableShowtimes.map(st => (
                                        <div 
                                            key={st.showtime_id || st.id} 
                                            className={`compact-card time-card ${selectedShowtime?.showtime_id === st.showtime_id || selectedShowtime?.id === st.id ? 'active' : ''}`}
                                            onClick={() => setSelectedShowtime(st)}
                                        >
                                            <span className="time-txt">
                                                {new Date(st.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    selectedDate && <span className="no-showtimes">Hết suất</span>
                                )}
                            </div>
                            <button className="slide-btn" onClick={() => scroll(timeRef, 120)} disabled={!selectedDate}>›</button>
                        </div>
                    </div>
                </nav>

                <div className="seat-selection-content">
                    {selectedShowtime ? (
                        <div className="seat-map-wrapper animate-in">
                            <div className="screen-header">
                                <div className="screen-line"></div>
                                <span>MÀN HÌNH</span>
                            </div>

                            <div className="seats-layout">
                                {Object.keys(groupedSeats).sort().reverse().map(row => (
                                    <div key={row} className="seat-row">
                                        <span className="row-id">{row}</span>
                                        <div className="row-items">
                                            {groupedSeats[row].map(seat => (
                                                <Seat 
                                                    key={seat.seat_id} 
                                                    type={seat.seat_type} 
                                                    selected={selectedSeats.some(s => s.seat_id === seat.seat_id)}
                                                    sold={seat.seat_status === 'Booked'}
                                                    number={seat.seat_number} 
                                                    onClick={() => handleSeatClick(seat)} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="seat-legend">
                                <div className="leg-item"><div className="box normal"></div> Thường</div>
                                <div className="leg-item"><div className="box vip"></div> VIP</div>
                                <div className="leg-item"><div className="box couple"></div> Đôi</div>
                                <div className="leg-item"><div className="box selected"></div> Đang chọn</div>
                                <div className="leg-item"><div className="box sold"></div> Đã bán</div>
                            </div>

                            <div className="booking-actions">
                                <button 
                                    className="btn-next" 
                                    disabled={selectedSeats.length === 0} 
                                    onClick={() => navigate('/foods', { state: { ...location.state, selectedShowtime, selectedSeats } })}
                                >
                                    TIẾP TỤC CHỌN ĐỒ ĂN
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="placeholder-msg">
                            <i className="fas fa-info-circle"></i>
                            <p>Vui lòng chọn đầy đủ thông tin ở trên để hiển thị sơ đồ ghế</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    </div>
);
};

export default Booking;