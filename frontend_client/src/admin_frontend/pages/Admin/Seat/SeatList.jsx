import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/api';
import {
    Zap, Trash2, Info, AlertTriangle, Clock,
    User, Settings, Loader2, CheckCircle
} from 'lucide-react';
import AdminModal from '../../../components/AdminModal';
import Seat from '../../../../user_frontend/components/Seat';
import '../../../styles/AdminSeat.css';

const SeatList = () => {
    // ===== STATE =====
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [seats, setSeats] = useState([]);
    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: '', data: null, title: '' });
    const abortControllerRef = useRef(null);

    // ===== FETCH CINEMAS =====
    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            setCinemas(res.data?.data || []);
        } catch (err) {
            console.error('❌ Lỗi lấy rạp:', err);
        }
    }, []);

    useEffect(() => { fetchCinemas(); }, [fetchCinemas]);

    // ===== FETCH ROOMS =====
    const fetchRooms = useCallback(async (cinemaId) => {
        if (!cinemaId) {
            setRooms([]);
            setSelectedRoom('');
            setSeats([]);
            return;
        }
        try {
            const res = await api.get(`/api/rooms/cinema/${cinemaId}`);
            setRooms(res.data?.data || []);
            setSelectedRoom('');
            setSeats([]);
        } catch (err) {
            console.error('❌ Lỗi lấy phòng:', err);
            setRooms([]);
        }
    }, []);

    useEffect(() => { fetchRooms(selectedCinema); }, [selectedCinema, fetchRooms]);

    // ===== FETCH SEATS =====
    const fetchSeats = useCallback(async (roomId) => {
        if (!roomId) {
            setSeats([]);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setLoading(true);

        try {
            const res = await api.get(`/api/seats/room/${roomId}`, { signal: controller.signal });
            let seatList = [];
            if (res.data?.success === true && Array.isArray(res.data.data)) {
                seatList = res.data.data;
            } else if (Array.isArray(res.data)) {
                seatList = res.data;
            }
            setSeats(seatList);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error('❌ Lỗi lấy ghế:', err);
            setSeats([]);
        } finally {
            setLoading(false);
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => { fetchSeats(selectedRoom); }, [selectedRoom, fetchSeats]);

    // ===== HELPERS =====
    const getSeatDisplayName = useCallback((seat) => {
        if (!seat) return '';
        const row = seat.seat_row || '';
        const type = seat.seat_type?.toUpperCase() || 'STANDARD';
        const num = Number(seat.seat_number);
        if (type === 'COUPLE' && !isNaN(num)) {
            const first = num % 2 === 1 ? num : num - 1;
            return `${row}${first} ${row}${first + 1}`;
        }
        return `${row}${seat.seat_number}`;
    }, []);

    const getSeatDisplayNumber = useCallback((seat) => {
        if (!seat) return '';
        const type = seat.seat_type?.toUpperCase() || 'STANDARD';
        const num = Number(seat.seat_number);
        if (type === 'COUPLE' && !isNaN(num)) {
            const first = num % 2 === 1 ? num : num - 1;
            return `${first}-${first + 1}`;
        }
        return seat.seat_number;
    }, []);

    const shouldShowSeat = (seat) => {
        const type = seat.seat_type?.toUpperCase() || 'STANDARD';
        if (type === 'COUPLE') {
            return Number(seat.seat_number) % 2 === 1;
        }
        return true;
    };

    // ===== MODAL CONFIRM =====
    const handleModalConfirm = async () => {
        if (['info', 'error', 'success'].includes(modal.type)) {
            if (modal.type === 'success') {
                await fetchSeats(selectedRoom);
            }
            setModal({ ...modal, isOpen: false });
            return;
        }

        if (!selectedRoom) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Thiếu thông tin',
                data: 'Vui lòng chọn phòng trước khi thực hiện thao tác.'
            });
            return;
        }

        setLoading(true);

        try {
            // BẢO TRÌ GHẾ
            if (modal.type === 'maintenance') {
                const seat = modal.data;
                const nextActive = seat.is_active ? 0 : 1;
                const displayName = getSeatDisplayName(seat);

                await api.put('/api/seats/toggle-active', {
                    seatId: seat.seat_id,
                    isActive: nextActive
                });

                await fetchSeats(selectedRoom);

                const actionText = nextActive === 0 ? 'khóa bảo trì' : 'mở hoạt động';
                setModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Thành công',
                    data: `Đã ${actionText} ghế ${displayName}`
                });
            }

            // XÓA SẠCH GHẾ
            else if (modal.type === 'delete') {
                await api.delete(`/api/seats/room/${selectedRoom}`);
                setSeats([]);
                setModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Xóa thành công',
                    data: 'Đã xóa sạch sơ đồ ghế của phòng này.'
                });
            }

        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Thao tác thất bại',
                data: err.response?.data?.message || err.message || 'Đã xảy ra lỗi.'
            });
        } finally {
            setLoading(false);
        }
    };

    // ===== GROUP & SORT SEATS =====
    const groupedSeats = seats.reduce((acc, seat) => {
        const row = seat.seat_row || '?';
        if (!acc[row]) acc[row] = [];
        acc[row].push(seat);
        acc[row].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
        return acc;
    }, {});

    const sortedRows = Object.keys(groupedSeats).sort((a, b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
    });

    // ===== RENDER =====
    return (
        <div className="admin-seat-container">

            {/* MODAL */}
            <AdminModal
                open={modal.isOpen}
                onClose={() => {
                    if (modal.type === 'success') fetchSeats(selectedRoom);
                    setModal({ ...modal, isOpen: false });
                }}
                title={modal.title}
                onConfirm={handleModalConfirm}
                confirmLoading={loading}
                confirmText={['info', 'error', 'success'].includes(modal.type) ? 'Đóng' : 'Xác nhận'}
                cancelText={['info', 'error', 'success'].includes(modal.type) ? undefined : 'Hủy'}
            >

                {/* BẢO TRÌ */}
                {modal.type === 'maintenance' ? (
                    <div className="modal-body-content text-center">
                        <Settings size={40} className="mb-3" color="#ffc107" />
                        <p>
                            Bạn có muốn <strong>{modal.data?.is_active ? 'KHÓA BẢO TRÌ' : 'MỞ HOẠT ĐỘNG'}</strong>{' '}
                            ghế <strong>{getSeatDisplayName(modal.data)}</strong>?
                        </p>
                        <small className="text-muted">* Ghế bảo trì sẽ không hiển thị khi khách đặt vé.</small>
                    </div>

                ) : modal.type === 'info' ? (
                    <div className="modal-body-info">
                        <div className="info-row"><User size={18} /><span>Khách hàng: <strong>{modal.data?.customer_name || 'N/A'}</strong></span></div>
                        <div className="info-row"><Clock size={18} /><span>Thời gian đặt: {modal.data?.booking_time ? new Date(modal.data.booking_time).toLocaleString('vi-VN') : 'N/A'}</span></div>
                        <div className="status-badge booked">ĐÃ CÓ VÉ</div>
                        <p className="warning-text">Ghế đã bán, bạn chỉ được phép xem thông tin!</p>
                    </div>

                ) : modal.type === 'error' ? (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color="#ff4757" />
                        <p className="mt-2" style={{ color: '#ff4757', fontWeight: 'bold' }}>{modal.data}</p>
                    </div>

                ) : modal.type === 'success' ? (
                    <div className="modal-body-success">
                        <CheckCircle size={48} color="#2ed573" />
                        <p className="mt-2" style={{ color: '#2ed573', fontWeight: 'bold', fontSize: '1.1rem' }}>{modal.data}</p>
                    </div>

                ) : (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color="#ff4757" />
                        <p>Bạn có chắc chắn muốn XÓA SẠCH sơ đồ ghế của phòng này không?</p>
                        <small style={{ color: 'var(--text-muted)' }}>Hành động này sẽ xóa tất cả ghế hiện có và không thể khôi phục.</small>
                    </div>
                )}

            </AdminModal>

            {/* HEADER */}
            <div className="seat-list-header">
                <h2>QUẢN LÝ SƠ ĐỒ GHẾ</h2>
                <div className="filter-controls">

                    <div className="filter-group">
                        <label>Rạp:</label>
                        <select value={selectedCinema} onChange={(e) => setSelectedCinema(e.target.value)}>
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Phòng:</label>
                        <select
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            disabled={!selectedCinema}
                        >
                            <option value="">-- Chọn phòng --</option>
                            {rooms.map(r => (
                                <option key={r.room_id} value={r.room_id}>{r.room_name} ({r.room_type})</option>
                            ))}
                        </select>
                    </div>

                    {selectedRoom && !loading && (
                        <div className="action-buttons">
                            <button className="btn btn-delete" onClick={() =>
                                setModal({ isOpen: true, type: 'delete', title: 'Xóa sạch sơ đồ', data: null })
                            }>
                                <Trash2 size={18} /> Xóa sạch
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <hr />

            {/* CONTENT */}
            <div className="seat-content-area">

                {loading ? (
                    <div className="loading-text">
                        <Loader2 size={36} className="spin-icon" />
                        <span>Đang tải...</span>
                    </div>

                ) : seats.length > 0 ? (
                    <div className="seat-map-wrapper">

                        <div className="screen-big">
                            <span className="screen-label">MÀN HÌNH</span>
                        </div>

                        <div className="seats-layout">
                            {sortedRows.map(row => {
                                const filteredSeats = (groupedSeats[row] || []).filter(shouldShowSeat);
                                return (
                                    <div key={row} className="seat-row">
                                        <span className="row-id">{row}</span>
                                        <div className="row-items">
                                            {filteredSeats.map(seat => {
                                                const isMaint = seat.is_active === 0;
                                                const isBooked = !!seat.customer_name;
                                                const seatType = seat.seat_type?.toUpperCase() || 'STANDARD';
                                                const displayNumber = getSeatDisplayNumber(seat);

                                                const handleClick = () => {
                                                    if (isBooked) {
                                                        setModal({
                                                            isOpen: true,
                                                            type: 'info',
                                                            data: seat,
                                                            title: `Thông tin Ghế ${getSeatDisplayName(seat)}`
                                                        });
                                                        return;
                                                    }
                                                    setModal({
                                                        isOpen: true,
                                                        type: 'maintenance',
                                                        data: seat,
                                                        title: `Chỉnh sửa bảo trì ghế ${getSeatDisplayName(seat)}`
                                                    });
                                                };

                                                return (
                                                    <Seat
                                                        key={seat.seat_id}
                                                        type={seatType}
                                                        selected={false}
                                                        sold={isBooked}
                                                        maintenance={isMaint}
                                                        number={displayNumber}
                                                        onClick={handleClick}
                                                        adminMode={true}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* LEGEND */}
                        <div className="seat-legend">
                            {['STANDARD', 'VIP', 'DELUXE', 'RECLINER', 'COUPLE'].map(type => (
                                <div key={type} className="legend-item leg-item">
                                    <Seat type={type} selected={false} sold={false} maintenance={false} number="" onClick={() => {}} />
                                    <span>{type === 'STANDARD' ? 'Thường' : type === 'COUPLE' ? 'Đôi' : type}</span>
                                </div>
                            ))}
                            <div className="legend-item leg-item">
                                <Seat type="STANDARD" selected={false} sold={true} maintenance={false} number="" onClick={() => {}} />
                                <span>Đã đặt</span>
                            </div>
                            <div className="legend-item leg-item">
                                <Seat type="STANDARD" selected={false} sold={false} maintenance={true} number="" onClick={() => {}} />
                                <span>Bảo trì</span>
                            </div>
                        </div>

                    </div>

                ) : (
                    <div className="empty-text">
                        <Info size={40} />
                        <h3>
                            {selectedRoom
                                ? 'Phòng chưa có sơ đồ ghế. Hãy tạo phòng mới để tự động tạo ghế!'
                                : 'Vui lòng chọn Rạp và Phòng để quản lý.'
                            }
                        </h3>
                    </div>
                )}

            </div>

        </div>
    );
};

export default SeatList;