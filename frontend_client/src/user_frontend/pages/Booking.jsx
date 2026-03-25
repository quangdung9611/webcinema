import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

    const socket = useMemo(() => io("https://webcinema-zb8z.onrender.com", {
        withCredentials: true,
        transports: ["websocket", "polling"]
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

    // --- EFFECT LẮNG NGHE REAL-TIME ---
    useEffect(() => {
        if (!showtimeId) return;

        socket.on('server-gui-danh-sach-dang-giu', (holdingList) => {
            setSeats(prevSeats => {
                if (prevSeats.length === 0) return prevSeats;
                return prevSeats.map(seat => {
                    const isHeld = holdingList.some(h => 
                        Number(h.seatId) === Number(seat.seat_id) && 
                        Number(h.showtimeId) === Number(showtimeId)
                    );
                    return { ...seat, is_locked_by_user: isHeld };
                });
            });
        });

        socket.on('server-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prevSeats => prevSeats.map(seat => 
                    Number(seat.seat_id) === Number(data.seatId) 
                    ? { ...seat, is_locked_by_user: true } 
                    : seat
                ));
            }
        });

        socket.on('server-mo-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prevSeats => prevSeats.map(seat => 
                    Number(seat.seat_id) === Number(data.seatId) 
                    ? { ...seat, is_locked_by_user: false } 
                    : seat
                ));
            }
        });

        return () => {
            socket.off('server-gui-danh-sach-dang-giu');
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
            
            let initialSeats = res.data;
            const savedSeats = sessionStorage.getItem('selectedSeats');
            const savedShowtime = sessionStorage.getItem('currentShowtimeId');
            
            if (savedSeats && savedShowtime === showtimeId.toString()) {
                const parsedSeats = JSON.parse(savedSeats);
                setSelectedSeats(parsedSeats);
                if (sessionStorage.getItem('holdExpiresAt')) {
                    setIsTimerActive(true);
                }
                parsedSeats.forEach(s => {
                    socket.emit('client-chon-ghe', { seatId: s.seat_id, showtimeId });
                });
            }
            setSeats(initialSeats);
        } catch (err) {
            console.error("Lỗi tải dữ liệu ghế:", err);
            setSeats([]);
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
            
            if (selectedSeats.length === 0) { // Sửa logic: ghế đầu tiên mới bật timer
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

    // --- LOGIC QUAN TRỌNG: Lọc trùng lặp để đồng bộ với Admin ---
    const groupedSeats = useMemo(() => {
        const uniqueSeats = Array.from(new Map(seats.map(s => [s.seat_id, s])).values());
        
        return uniqueSeats.reduce((acc, seat) => {
            const row = seat.seat_row;
            if (!acc[row]) acc[row] = [];
            acc[row].push(seat);
            acc[row].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
            return acc;
        }, {});
    }, [seats]);

    if (loading) return <div className="loading-screen">Đang tải sơ đồ ghế...</div>;

    return (
        <div className="booking-page-full-wrapper">
            <Modal {...modalConfig} onConfirm={modalConfig.onConfirm} onCancel={modalConfig.onCancel} />
            
            <div className="stepper-bar-full">
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

                                                return (
                                                    <div 
                                                        key={seat.seat_id}
                                                        className={`seat-unit ${seat.seat_type.toLowerCase()} 
                                                            ${isSelected || isLockedRealtime ? 'selected' : ''} 
                                                            ${isBooked ? 'booked' : ''} 
                                                            ${isMaintenance ? 'maintenance' : ''}`}
                                                        onClick={() => handleSeatClick(seat)}
                                                    >
                                                        {isBooked ? <span className="booked-icon">X</span> : 
                                                         isMaintenance ? <span className="maintenance-icon">X</span> : seat.seat_number}
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
                                <div className="legend-item"><span className="legend-box status-selected"></span> Đang chọn</div>
                                <div className="legend-item"><span className="legend-box status-maintenance">X</span> Bảo trì</div>
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
                                            ? selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ')
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