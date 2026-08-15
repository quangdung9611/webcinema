import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/api';
import {
    Zap,
    Trash2,
    X,
    Info,
    AlertTriangle,
    Clock,
    User,
    Settings,
    Loader2,
    CheckCircle
} from 'lucide-react';
import AdminModal from '../../../components/AdminModal';
import Seat from '../../../../user_frontend/components/Seat';
import '../../../styles/AdminSeat.css';

const SeatList = () => {
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [seats, setSeats] = useState([]);
    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [loading, setLoading] = useState(false);

    const [modal, setModal] = useState({
        isOpen: false,
        type: '', // 'init' | 'delete' | 'maintenance' | 'info' | 'error' | 'success'
        data: null,
        title: ''
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    // --- FETCH CINEMAS ---
    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaList = res.data?.data || [];
            setCinemas(cinemaList);
        } catch (err) {
            console.error('Lỗi lấy rạp:', err);
        }
    }, []);

    useEffect(() => {
        fetchCinemas();
    }, [fetchCinemas]);

    // --- FETCH ROOMS BY CINEMA ---
    const fetchRooms = useCallback(async (cinemaId) => {
        if (!cinemaId) {
            setRooms([]);
            setSelectedRoom('');
            setSeats([]);
            return;
        }
        try {
            const res = await api.get(`/api/rooms/cinema/${cinemaId}`);
            const roomList = res.data?.data || [];
            setRooms(roomList);
            setSelectedRoom('');
            setSeats([]);
        } catch (err) {
            console.error('Lỗi lấy phòng:', err);
            setRooms([]);
        }
    }, []);

    useEffect(() => {
        fetchRooms(selectedCinema);
    }, [selectedCinema, fetchRooms]);

    // --- FETCH SEATS BY ROOM ---
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
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get(`/api/seats/room/${roomId}`, {
                signal: controller.signal
            });

            let seatList = [];
            if (res.data?.success === true && Array.isArray(res.data.data)) {
                seatList = res.data.data;
            } else if (Array.isArray(res.data)) {
                seatList = res.data;
            } else {
                console.warn('⚠️ Dữ liệu ghế không đúng định dạng:', res.data);
            }

            setSeats(seatList);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('🛑 Fetch seats bị hủy');
                return;
            }
            console.error('❌ Lỗi lấy ghế:', err);
            setSeats([]);
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        fetchSeats(selectedRoom);
    }, [selectedRoom, fetchSeats]);

    // --- MODAL HANDLERS ---
    const handleModalConfirm = async () => {
        console.log('🔹 handleModalConfirm, modal.type =', modal.type);

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
            const roomInfo = rooms.find(r => r.room_id == selectedRoom);
            const rType = roomInfo?.room_type || '2D';

            if (modal.type === 'maintenance') {
                const seat = modal.data;
                await api.put('/api/seats/toggle-active', {
                    seatId: seat.seat_id,
                    isActive: seat.is_active ? 0 : 1
                });
                await fetchSeats(selectedRoom);
                setModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Thành công',
                    data: `Đã ${seat.is_active ? 'khóa' : 'mở'} bảo trì ghế ${seat.seat_row}${seat.seat_number}`
                });
            } else if (modal.type === 'init') {
                const payload = {
                    roomId: Number(selectedRoom),
                    roomType: rType,
                    cinemaId: Number(selectedCinema)
                };
                console.log('🚀 Gọi API /api/seats/init', payload);
                const response = await api.post('/api/seats/init', payload);
                console.log('✅ Response:', response.data);

                await fetchSeats(selectedRoom);
                setModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Khởi tạo thành công',
                    data: response.data?.message || `Đã tạo phôi ghế cho phòng ${roomInfo?.room_name || ''}`
                });
            } else if (modal.type === 'delete') {
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
            console.error('❌ Lỗi:', err);
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

    // --- GROUP SEATS BY ROW ---
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

    // Xác định hàng cuối cùng (thường là hàng ghế đôi)
    const lastRow = sortedRows.length > 0 ? sortedRows[sortedRows.length - 1] : null;

    // --- KIỂM TRA GHẾ ĐÔI: CHỈ HIỂN THỊ SỐ LẺ, ẨN SỐ CHẴN (tạo cặp) ---
    const shouldShowSeat = (seat, row) => {
        const num = Number(seat.seat_number);
        // Nếu là hàng cuối (ghế đôi) → chỉ hiển thị số lẻ
        if (row === lastRow) {
            return num % 2 === 1;
        }
        // Các hàng khác: nếu là ghế đôi thì hiển thị số lẻ, còn ghế thường thì hiển thị hết
        const seatType = seat.seat_type?.toLowerCase() || 'standard';
        if (seatType === 'couple') {
            return num % 2 === 1; // chỉ hiển thị đại diện cặp (số lẻ)
        }
        return true; // ghế thường hiển thị tất cả
    };

    // --- RENDER ---
    return (
        <div className="admin-seat-container">
            <AdminModal
                open={modal.isOpen}
                onClose={() => {
                    if (modal.type === 'success') {
                        fetchSeats(selectedRoom);
                    }
                    setModal({ ...modal, isOpen: false });
                }}
                title={modal.title}
                onConfirm={handleModalConfirm}
                confirmLoading={loading}
                confirmText={
                    ['info', 'error', 'success'].includes(modal.type)
                        ? 'Đóng'
                        : 'Xác nhận'
                }
                cancelText={['info', 'error', 'success'].includes(modal.type) ? undefined : 'Hủy'}
            >
                {/* Nội dung modal giữ nguyên */}
                {modal.type === 'maintenance' ? (
                    <div className="modal-body-content text-center">
                        <Settings size={40} className="mb-3" color="#ffc107" />
                        <p>Bạn có muốn <strong>{modal.data?.is_active ? 'KHÓA BẢO TRÌ' : 'MỞ HOẠT ĐỘNG'}</strong> ghế này?</p>
                        <small className="text-muted">* Ghế bảo trì sẽ không hiển thị khi khách đặt vé.</small>
                    </div>
                ) : modal.type === 'info' ? (
                    <div className="modal-body-info">
                        <div className="info-row"><User size={18} /> <span>Khách hàng: <strong>{modal.data?.customer_name || 'N/A'}</strong></span></div>
                        <div className="info-row"><Clock size={18} /> <span>Thời gian đặt: {modal.data?.booking_time ? new Date(modal.data.booking_time).toLocaleString('vi-VN') : 'N/A'}</span></div>
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
                        <p className="mt-2" style={{ color: '#2ed573', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {modal.data}
                        </p>
                    </div>
                ) : (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color={modal.type === 'delete' ? '#ff4757' : '#ffb020'} />
                        <p>
                            {modal.type === 'delete'
                                ? 'Bạn có chắc chắn muốn XÓA SẠCH sơ đồ ghế của phòng này không?'
                                : 'Bạn có chắc chắn muốn KHỞI TẠO lại sơ đồ ghế cho phòng này không?'
                            }
                        </p>
                        <small style={{ color: 'var(--text-muted)' }}>
                            {modal.type === 'delete'
                                ? 'Hành động này sẽ xóa tất cả ghế hiện có và không thể khôi phục.'
                                : 'Hành động này sẽ tạo mới toàn bộ ghế theo cấu hình mặc định.'
                            }
                        </small>
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
                        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} disabled={!selectedCinema}>
                            <option value="">-- Chọn phòng --</option>
                            {rooms.map(r => (
                                <option key={r.room_id} value={r.room_id}>{r.room_name} ({r.room_type})</option>
                            ))}
                        </select>
                    </div>
                    {selectedRoom && !loading && (
                        <div className="action-buttons">
                            <button className="btn btn-init" onClick={() => setModal({ isOpen: true, type: 'init', title: 'Khởi tạo phôi ghế', data: null })}>
                                <Zap size={18} /> Khởi tạo
                            </button>
                            <button className="btn btn-delete" onClick={() => setModal({ isOpen: true, type: 'delete', title: 'Xóa sạch sơ đồ', data: null })}>
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
                    <div className="loading-text"><Loader2 size={36} className="spin-icon" /> <span>Đang tải...</span></div>
                ) : seats.length > 0 ? (
                    <div className="seat-map-wrapper">
                        {/* MÀN HÌNH LỚN */}
                        <div className="screen-big">
                            <span className="screen-label">MÀN HÌNH</span>
                        </div>

                        {/* SƠ ĐỒ GHẾ */}
                        <div className="seats-layout">
                            {sortedRows.map(row => {
                                const rowSeats = groupedSeats[row] || [];
                                const filteredSeats = rowSeats.filter(seat => shouldShowSeat(seat, row));

                                return (
                                    <div key={row} className="seat-row">
                                        <span className="row-id">{row}</span>
                                        <div className="row-items">
                                            {filteredSeats.map(seat => {
                                                const isMaint = seat.is_active === 0;
                                                const isBooked = !!seat.customer_name;
                                                const seatType = seat.seat_type?.toUpperCase() || 'NORMAL';

                                                // Xác định số hiển thị
                                                let displayNumber = seat.seat_number;
                                                const num = Number(seat.seat_number);
                                                // Nếu là hàng cuối (ghế đôi) hoặc ghế có loại Couple → hiển thị dạng cặp
                                                if (row === lastRow || seat.seat_type?.toLowerCase() === 'couple') {
                                                    if (num % 2 === 1) {
                                                        displayNumber = `${num}-${num + 1}`;
                                                    }
                                                }

                                                const handleClick = () => {
                                                    if (isBooked) {
                                                        setModal({
                                                            isOpen: true,
                                                            type: 'info',
                                                            data: seat,
                                                            title: `Thông tin Ghế ${seat.seat_row}${seat.seat_number}`
                                                        });
                                                    } else {
                                                        setModal({
                                                            isOpen: true,
                                                            type: 'maintenance',
                                                            data: seat,
                                                            title: `Chỉnh sửa bảo trì ghế ${seat.seat_row}${seat.seat_number}`
                                                        });
                                                    }
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
                            <div className="legend-item leg-item">
                                <Seat type="NORMAL" selected={false} sold={false} maintenance={false} number="" onClick={() => {}} />
                                <span>Thường</span>
                            </div>
                            <div className="legend-item leg-item">
                                <Seat type="VIP" selected={false} sold={false} maintenance={false} number="" onClick={() => {}} />
                                <span>VIP</span>
                            </div>
                            <div className="legend-item leg-item">
                                <Seat type="COUPLE" selected={false} sold={false} maintenance={false} number="" onClick={() => {}} />
                                <span>Đôi</span>
                            </div>
                            <div className="legend-item leg-item">
                                <Seat type="NORMAL" selected={false} sold={true} maintenance={false} number="" onClick={() => {}} />
                                <span>Đã đặt</span>
                            </div>
                            <div className="legend-item leg-item">
                                <Seat type="NORMAL" selected={false} sold={false} maintenance={true} number="" onClick={() => {}} />
                                <span>Bảo trì</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-text">
                        <Info size={40} />
                        <h3>{selectedRoom ? 'Phòng chưa có phôi ghế, bấm Khởi tạo nhé!' : 'Vui lòng chọn Rạp và Phòng để quản lý.'}</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatList;