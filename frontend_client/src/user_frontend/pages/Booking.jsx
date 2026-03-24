import React, { useState, useEffect, useCallback, useMemo } from 'react'; // 1. Thêm useMemo
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../../admin_frontend/components/Modal';
import CountdownTimer from './CountdownTimer'; 
import '../styles/Booking.css';
import { io } from "socket.io-client";

const Booking = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const { movie, cinemaName, slot, selectedDate } = location.state || {};
    const showtimeId = slot?.showtime_id || slot?.id;

    // --- 2. KHỞI TẠO SOCKET VỚI PATH CHUẨN ---
    // Dùng useMemo để socket chỉ khởi tạo DUY NHẤT một lần
    const socket = useMemo(() => io("https://webcinema-zb8z.onrender.com", {
        path: "/socket.io/", // BẮT BUỘC có dòng này để hết lỗi 404
        withCredentials: true,
        transports: ["websocket", "polling"] // Ưu tiên websocket
    }), []);

    const [seats, setSeats] = useState([]); 
    const [selectedSeats, setSelectedSeats] = useState([]); 
    const [showtimeDetail, setShowtimeDetail] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [isTimerActive, setIsTimerActive] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        show: false, type: 'info', title: '', message: '',
        onConfirm: () => {}, onCancel: null
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    // --- 3. EFFECT LẮNG NGHE REAL-TIME ---
    useEffect(() => {
        if (!showtimeId) return;

        // Log để kiểm tra kết nối (Dũng có thể xóa sau khi chạy ok)
        socket.on("connect", () => {
            console.log("⚡ Đã kết nối Socket thành công với ID:", socket.id);
        });

        socket.on('server-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prevSeats => prevSeats.map(seat => 
                    seat.seat_id === data.seatId ? { ...seat, is_locked_by_user: true } : seat
                ));
            }
        });

        socket.on('server-mo-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prevSeats => prevSeats.map(seat => 
                    seat.seat_id === data.seatId ? { ...seat, is_locked_by_user: false } : seat
                ));
            }
        });

        // Cleanup: Ngắt lắng nghe khi rời khỏi trang
        return () => {
            socket.off('connect');
            socket.off('server-khoa-ghe');
            socket.off('server-mo-khoa-ghe');
        };
    }, [showtimeId, socket]);

    const fetchShowtimeDetail = useCallback(async () => {
        if (!showtimeId) return;
        try {
           const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/showtimes/detail/${showtimeId}`);
            setShowtimeDetail(res.data);
        } catch (err) {
            console.error("Lỗi tải chi tiết suất chiếu:", err);
        }
    }, [showtimeId]);

    const fetchSeats = useCallback(async () => {
        if (!showtimeId) return;
        try {
            setLoading(true);
            const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/seats/showtime/${showtimeId}`);
            setSeats(res.data);

            const savedSeats = sessionStorage.getItem('selectedSeats');
            const savedShowtime = sessionStorage.getItem('currentShowtimeId');
            
            if (savedSeats && savedShowtime === showtimeId.toString()) {
                const parsedSeats = JSON.parse(savedSeats);
                setSelectedSeats(parsedSeats);
                if (sessionStorage.getItem('holdExpiresAt')) {
                    setIsTimerActive(true);
                }
                // Báo cho người khác biết mình đang chọn lại ghế từ session
                parsedSeats.forEach(s => {
                    socket.emit('client-chon-ghe', { seatId: s.seat_id, showtimeId });
                });
            }
        } catch (err) {
            console.error("Lỗi tải ghế:", err);
        } finally {
            setLoading(false);
        }
    }, [showtimeId, socket]);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!movie || !slot) {
            navigate('/');
            return;
        }
        fetchShowtimeDetail();
        fetchSeats();
    }, [fetchSeats, fetchShowtimeDetail, movie, slot, navigate]);

    const clearBookingSession = () => {
        selectedSeats.forEach(s => {
            socket.emit('client-huy-chon-ghe', { seatId: s.seat_id, showtimeId });
        });
        
        sessionStorage.removeItem('selectedSeats');
        sessionStorage.removeItem('holdExpiresAt');
        sessionStorage.removeItem('currentShowtimeId');
        setIsTimerActive(false);
        setSelectedSeats([]);
    };

    const handleTimeExpire = () => {
        clearBookingSession();
        setModalConfig({
            show: true, type: 'error', title: 'HẾT GIỜ',
            message: 'Đã hết thời gian giữ ghế, vui lòng chọn lại nhé!',
            onConfirm: () => { closeModal(); window.location.reload(); }
        });
    };

    const handleSeatClick = (seat) => {
        if (seat.seat_status === 'Booked' || Number(seat.is_active) === 0 || seat.is_locked_by_user) return;
        
        const isSelected = selectedSeats.find(s => s.seat_id === seat.seat_id);
        let updatedSeats = [];

        if (isSelected) {
            updatedSeats = selectedSeats.filter(s => s.seat_id !== seat.seat_id);
            socket.emit('client-huy-chon-ghe', { seatId: seat.seat_id, showtimeId });
            if (updatedSeats.length === 0) clearBookingSession();
        } else {
            if (selectedSeats.length >= 8) {
                setModalConfig({ show: true, type: 'info', title: 'GIỚI HẠN', message: 'Tối đa 8 ghế thôi nhé!', onConfirm: closeModal });
                return;
            }
            updatedSeats = [...selectedSeats, seat];
            socket.emit('client-chon-ghe', { seatId: seat.seat_id, showtimeId });
            
            if (selectedSeats.length === 0) {
                const expiresAt = Date.now() + 10 * 60 * 1000;
                sessionStorage.setItem('holdExpiresAt', expiresAt.toString());
                sessionStorage.setItem('currentShowtimeId', showtimeId.toString());
                setIsTimerActive(true);
            }
        }
        setSelectedSeats(updatedSeats);
        sessionStorage.setItem('selectedSeats', JSON.stringify(updatedSeats));
    };

    const handleContinue = () => {
        if (selectedSeats.length === 0) return;
        const bookingData = { 
            ...location.state, 
            showtimeDetail, 
            selectedSeats, 
            totalTicketPrice: selectedSeats.reduce((sum, s) => sum + Number(s.price), 0) 
        };
        
        setModalConfig({
            show: true, type: 'confirm', title: 'BẮP NƯỚC',
            message: 'Bạn có muốn đặt thêm bắp nước không?',
            onConfirm: () => navigate('/foods', { state: bookingData }),
            onCancel: () => navigate('/payment', { state: bookingData })
        });
    };

    const groupedSeats = seats.reduce((acc, seat) => {
        const row = seat.seat_row;
        if (!acc[row]) acc[row] = [];
        acc[row].push(seat);
        return acc;
    }, {});

    if (loading) return <div className="loading-screen">Đang tải sơ đồ ghế...</div>;

    return (
        <div className="booking-page-full-wrapper">
            <Modal {...modalConfig} onConfirm={modalConfig.onConfirm} onCancel={modalConfig.onCancel} />
            
            {/* Các phần UI render bên dưới giữ nguyên... */}
            <div className="stepper-bar-full">
                {/* Giữ nguyên như cũ của Dũng */}
                <div className="stepper-content">
                    <div className="step-item done">01 CHỌN SUẤT</div>
                    <div className="step-item active">02 CHỌN GHẾ</div>
                    <div className="step-item">03 BẮP NƯỚC</div>
                    <div className="step-item">04 THANH TOÁN</div>
                </div>
            </div>

            <div className="booking-main-layout">
                <div className="booking-grid-container">
                    <div className="left-section-seatmap">
                        <div className="seat-selection-card">
                            <div className="seats-layout-engine">
                                {Object.keys(groupedSeats).sort().reverse().map(row => (
                                    <div key={row} className="seat-row">
                                        <span className="row-label side-label">{row}</span>
                                        <div className="row-cells-group">
                                            {groupedSeats[row].map(seat => {
                                                const isSelected = selectedSeats.some(s => s.seat_id === seat.seat_id);
                                                const isBooked = seat.seat_status === 'Booked';
                                                const isMaintenance = Number(seat.is_active) === 0;
                                                const isLockedRealtime = seat.is_locked_by_user; 
                                                const isCouple = seat.seat_type.toLowerCase() === 'couple';

                                                return (
                                                    <div 
                                                        key={seat.seat_id}
                                                        className={`seat-unit ${seat.seat_type.toLowerCase()} 
                                                            ${isSelected ? 'selected' : ''} 
                                                            ${isBooked ? 'booked' : ''} 
                                                            ${isMaintenance ? 'maintenance' : ''} 
                                                            ${isLockedRealtime ? 'locked-realtime' : ''}`}
                                                        onClick={() => handleSeatClick(seat)}
                                                    >
                                                        {isBooked ? (
                                                            <span className="booked-icon">X</span>
                                                        ) : (isMaintenance || isLockedRealtime) ? (
                                                            <span className="maintenance-icon">X</span>
                                                        ) : (
                                                            isCouple ? (
                                                                <div className="couple-numbers">
                                                                    <span>{seat.seat_number}</span>
                                                                    <span>{Number(seat.seat_number) + 1}</span>
                                                                </div>
                                                            ) : (seat.seat_number)
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <span className="row-label side-label">{row}</span>
                                    </div>
                                ))}
                            </div>
                             <div className="screen-container">
                                <div className="screen-line">Màn hình</div>
                            </div>
                            <div className="seat-legend-area">
                                <div className="legend-item"><span className="legend-box status-booked">X</span> Đã bán</div>
                                <div className="legend-item"><span className="legend-box status-maintenance">X</span> Bảo trì/Đang giữ</div>
                                <div className="legend-item"><span className="legend-box status-selected"></span> Đang chọn</div>
                                <div className="legend-item"><span className="legend-box type-vip"></span> VIP</div>
                                <div className="legend-item"><span className="legend-box type-standard"></span> Thường</div>
                                <div className="legend-item"><span className="legend-box type-couple"></span> Ghế đôi</div>
                            </div>
                        </div>
                    </div>

                    <aside className="right-section-sidebar">
                        <div className="sidebar-sticky-content">
                            {isTimerActive && selectedSeats.length > 0 && (
                                <div className="timer-display-box">
                                    <CountdownTimer onExpire={handleTimeExpire} />
                                </div>
                            )}

                            <div className="movie-info-summary">
                                <img src={`https://webcinema-zb8z.onrender.com/uploads/posters/${showtimeDetail?.poster_url || movie?.poster_url}`} alt="" className="summary-poster" />
                                <div className="summary-meta-data">
                                    <h4 className="movie-title-text">{showtimeDetail?.title || movie?.title}</h4>
                                    <p className="movie-sub-desc">
                                        {showtimeDetail?.room_type || '2D'} Phụ Đề - 
                                        <span className="age-badge-t18">
                                            T{showtimeDetail?.age_rating || movie?.age_rating || '18'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="ticket-details-breakdown">
                                <p className="detail-row"><strong>{cinemaName}</strong> - {showtimeDetail?.room_name || 'Đang tải...'}</p>
                                <p className="detail-row">Suất: <strong>{new Date(slot?.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong> - {selectedDate}</p>
                                <div className="selected-seats-display">
                                    <span>Ghế: </span>
                                    <strong className="highlight-orange">
                                        {selectedSeats.length > 0 
                                            ? selectedSeats.flatMap(s => 
                                                s.seat_type.toLowerCase() === 'couple' 
                                                ? [`${s.seat_row}${s.seat_number}`, `${s.seat_row}${Number(s.seat_number) + 1}`] 
                                                : [`${s.seat_row}${s.seat_number}`]
                                            ).join(', ')
                                            : 'Chưa chọn'}
                                    </strong>
                                </div>
                            </div>

                            <div className="payment-footer-section">
                                <div className="total-amount-row">
                                    <span className="total-label">Tạm tính</span>
                                    <span className="total-value">
                                        {selectedSeats.reduce((sum, s) => sum + Number(s.price), 0).toLocaleString()} ₫
                                    </span>
                                </div>

                                <div className="action-buttons-group">
                                    <button className="btn-confirm-booking" onClick={handleContinue} disabled={selectedSeats.length === 0}>
                                        TIẾP TỤC
                                    </button>
                                    <button className="btn-go-back" onClick={() => navigate(-1)}>Quay lại</button>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default Booking;