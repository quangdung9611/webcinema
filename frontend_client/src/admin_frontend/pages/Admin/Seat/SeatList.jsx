import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Zap,
    Trash2,
    X,
    Info,
    AlertTriangle,
    Clock,
    User,
    Settings,
    Loader2
} from 'lucide-react';
import AdminModal from '../../../components/AdminModal';
import '../../../styles/AdminSeat.css';

const API_BASE = 'https://api.quangdungcinema.id.vn/api';

const SeatList = () => {
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [seats, setSeats] = useState([]);
    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [loading, setLoading] = useState(false);

    const [modal, setModal] = useState({
        isOpen: false,
        type: '',
        data: null,
        title: ''
    });

    // --- FETCH CINEMAS ---
    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const res = await axios.get(`${API_BASE}/cinemas`);
                setCinemas(res.data);
            } catch (err) {
                console.error('Lỗi lấy rạp:', err);
            }
        };
        fetchCinemas();
    }, []);

    // --- FETCH ROOMS BY CINEMA ---
    useEffect(() => {
        const fetchRooms = async () => {
            if (selectedCinema) {
                try {
                    const res = await axios.get(`${API_BASE}/rooms/cinema/${selectedCinema}`);
                    setRooms(res.data);
                    setSelectedRoom('');
                    setSeats([]);
                } catch (err) {
                    console.error('Lỗi lấy phòng:', err);
                }
            }
        };
        fetchRooms();
    }, [selectedCinema]);

    // --- FETCH SEATS BY ROOM ---
    const fetchSeats = async () => {
        if (selectedRoom) {
            setLoading(true);
            try {
                const res = await axios.get(`${API_BASE}/seats/room/${selectedRoom}`);
                setSeats(res.data);
            } catch (err) {
                console.error('Lỗi lấy ghế:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchSeats();
    }, [selectedRoom]);

    // --- MODAL HANDLERS ---
    const handleModalConfirm = async () => {
        if (modal.type === 'info' || modal.type === 'error') {
            setModal({ ...modal, isOpen: false });
            return;
        }

        setLoading(true);
        try {
            const roomInfo = rooms.find(r => r.room_id == selectedRoom);
            const rType = roomInfo?.room_type || '2D';

            if (modal.type === 'maintenance') {
                const seat = modal.data;
                await axios.put(`${API_BASE}/seats/toggle-active`, {
                    seatId: seat.seat_id,
                    isActive: seat.is_active ? 0 : 1
                });
            } else if (modal.type === 'init') {
                await axios.post(`${API_BASE}/seats/init`, {
                    roomId: selectedRoom,
                    roomType: rType,
                    cinemaId: selectedCinema
                });
            } else if (modal.type === 'delete') {
                await axios.delete(`${API_BASE}/seats/room/${selectedRoom}`);
                setSeats([]);
            }

            fetchSeats();
            setModal({ ...modal, isOpen: false });
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Thao tác thất bại',
                data: err.response?.data?.message || err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // --- GROUP SEATS BY ROW ---
    const groupedSeats = seats.reduce((acc, seat) => {
        const row = seat.seat_row;
        if (!acc[row]) acc[row] = [];
        acc[row].push(seat);
        acc[row].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
        return acc;
    }, {});

    // --- RENDER SEAT ICON (SVG) ---
    const renderSeatIcon = (seatType, isMaintenance = false) => {
        const type = seatType?.toLowerCase() || 'standard';
        const color = isMaintenance ? '#94a3b8' : 
                      type === 'vip' ? '#8b5cf6' :
                      type === 'couple' ? '#ec4899' : '#3b82f6';

        return (
            <svg
                viewBox="0 0 40 40"
                className="seat-icon-svg"
                style={{ width: '100%', height: '100%' }}
                fill={color}
                stroke={color}
                strokeWidth="1"
            >
                {type === 'couple' ? (
                    <>
                        <rect x="2" y="8" width="16" height="20" rx="4" />
                        <rect x="22" y="8" width="16" height="20" rx="4" />
                        <path d="M8 28 L12 34 L28 34 L32 28" stroke="currentColor" fill="none" />
                    </>
                ) : (
                    <>
                        <rect x="4" y="6" width="32" height="22" rx="6" />
                        <path d="M10 28 L14 34 L26 34 L30 28" stroke="currentColor" fill="none" />
                    </>
                )}
            </svg>
        );
    };

    return (
        <div className="admin-seat-container">
            <AdminModal
                show={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                onConfirm={handleModalConfirm}
                confirmLoading={loading}
                confirmText={modal.type === 'info' || modal.type === 'error' ? 'Đóng' : 'Xác nhận'}
            >
                {modal.type === 'maintenance' ? (
                    <div className="modal-body-content text-center">
                        <Settings size={40} className="mb-3" color="#ffc107" />
                        <p>Bạn có muốn <strong>{modal.data?.is_active ? 'KHÓA BẢO TRÌ' : 'MỞ HOẠT ĐỘNG'}</strong> ghế này?</p>
                        <small className="text-muted">* Ghế bảo trì sẽ không hiển thị khi khách đặt vé.</small>
                    </div>
                ) : modal.type === 'info' ? (
                    <div className="modal-body-info">
                        <div className="info-row"><User size={18} /> <span>Khách hàng: <strong>{modal.data.customer_name || 'N/A'}</strong></span></div>
                        <div className="info-row"><Clock size={18} /> <span>Thời gian đặt: {modal.data.booking_time ? new Date(modal.data.booking_time).toLocaleString('vi-VN') : 'N/A'}</span></div>
                        <div className="status-badge booked">ĐÃ CÓ VÉ</div>
                        <p className="warning-text">Ghế đã bán, bạn chỉ được phép xem thông tin!</p>
                    </div>
                ) : modal.type === 'error' ? (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color="red" />
                        <p className="mt-2">{modal.data}</p>
                    </div>
                ) : (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color={modal.type === 'delete' ? 'red' : 'orange'} />
                        <p>Bạn có chắc chắn muốn {modal.type === 'delete' ? 'XÓA SẠCH' : 'KHỞI TẠO'} sơ đồ phòng này không?</p>
                    </div>
                )}
            </AdminModal>

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

            <div className="seat-content-area">
                {loading ? (
                    <div className="loading-text"><Loader2 size={36} className="spin-icon" /> <span>Đang tải...</span></div>
                ) : seats.length > 0 ? (
                    <div className="seat-map-wrapper">
                        <div className="screen">MÀN HÌNH</div>
                        <div className="admin-grid seats-layout">
                            {Object.keys(groupedSeats)
                                .sort((a, b) => b.localeCompare(a)) // reverse alphabetical
                                .map(row => (
                                    <div key={row} className="seat-row">
                                        <span className="row-name row-id">{row}</span>
                                        <div className="row-items" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            {groupedSeats[row].map(seat => {
                                                const isMaint = seat.is_active === 0;
                                                const isBooked = !!seat.customer_name;
                                                const seatTypeLower = seat.seat_type ? seat.seat_type.toLowerCase() : 'standard';
                                                const typeClass = isMaint ? 'seat-maintenance' : isBooked ? 'seat-booked' : `seat-${seatTypeLower}`;

                                                return (
                                                    <div
                                                        key={seat.seat_id}
                                                        className={`seat-item ${typeClass}`}
                                                        title={isBooked ? `Khách: ${seat.customer_name}` : `Ghế ${seat.seat_type}`}
                                                        onClick={() => {
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
                                                        }}
                                                    >
                                                        {renderSeatIcon(seat.seat_type, isMaint)}
                                                        <span className="seat-number-text">
                                                            {isMaint ? (
                                                                <X size={12} />
                                                            ) : (
                                                                seatTypeLower === 'couple'
                                                                    ? `${seat.seat_number}-${Number(seat.seat_number) + 1}`
                                                                    : seat.seat_number
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Legend */}
                        <div className="seat-legend">
                            <div className="legend-item leg-item">
                                <div className="seat-item seat-standard small">
                                    {renderSeatIcon('Standard')}
                                </div>
                                <span>Thường</span>
                            </div>
                            <div className="legend-item leg-item">
                                <div className="seat-item seat-vip small">
                                    {renderSeatIcon('VIP')}
                                </div>
                                <span>VIP</span>
                            </div>
                            <div className="legend-item leg-item">
                                <div className="seat-item seat-couple small">
                                    {renderSeatIcon('Couple')}
                                </div>
                                <span>Đôi</span>
                            </div>
                            <div className="legend-item leg-item">
                                <div className="seat-item seat-booked small">
                                    {renderSeatIcon('Standard')}
                                </div>
                                <span>Đã đặt</span>
                            </div>
                            <div className="legend-item leg-item">
                                <div className="seat-item seat-maintenance small">
                                    {renderSeatIcon('Standard', true)}
                                    <span className="seat-number-text"><X size={10} /></span>
                                </div>
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