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
    Settings
} from 'lucide-react';
import Modal from '../../../components/AdminModal'; 
// Import bộ icon ghế
import { SeatNormal, SeatVIP, SeatCouple } from "../../../../user_frontend/components/SeatIcon"; 
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
        type: '', 
        data: null, 
        title: '' 
    });

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const res = await axios.get('https://api.quangdungcinema.id.vn/api/cinemas');
                setCinemas(res.data);
            } catch (err) { console.error("Lỗi lấy rạp:", err); }
        };
        fetchCinemas();
    }, []);

    useEffect(() => {
        const fetchRooms = async () => {
            if (selectedCinema) {
                try {
                    const res = await axios.get(`https://api.quangdungcinema.id.vn/api/rooms/cinema/${selectedCinema}`);
                    setRooms(res.data);
                    setSelectedRoom(''); 
                    setSeats([]);        
                } catch (err) { console.error("Lỗi lấy phòng:", err); }
            }
        };
        fetchRooms();
    }, [selectedCinema]);

    const fetchSeats = async () => {
        if (selectedRoom) {
            setLoading(true);
            try {
                const res = await axios.get(`https://api.quangdungcinema.id.vn/api/seats/room/${selectedRoom}`);
                setSeats(res.data);
            } catch (err) { console.error("Lỗi lấy ghế:", err); } 
            finally { setLoading(false); }
        }
    };

    useEffect(() => { fetchSeats(); }, [selectedRoom]);

    // --- ACTIONS ---
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
                await axios.put('https://api.quangdungcinema.lyria.id.vn/api/seats/toggle-active', {
                    seatId: seat.seat_id,
                    isActive: seat.is_active ? 0 : 1
                });
            } else if (modal.type === 'init') {
                await axios.post('https://api.quangdungcinema.id.vn/api/seats/init', {
                    roomId: selectedRoom,
                    roomType: rType,
                    cinemaId: selectedCinema 
                });
            } else if (modal.type === 'delete') {
                await axios.delete(`https://api.quangdungcinema.id.vn/api/seats/room/${selectedRoom}`);
                setSeats([]);
            }

            fetchSeats();
            setModal({ ...modal, isOpen: false });
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Thao tác thất bại',
                data: err.response?.data?.error || err.message
            });
        } finally { setLoading(false); }
    };

    const groupedSeats = seats.reduce((acc, seat) => {
        const row = seat.seat_row;
        if (!acc[row]) acc[row] = [];
        acc[row].push(seat);
        // Đảm bảo số ghế sắp xếp tăng dần từ trái qua phải theo số ghế
        acc[row].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
        return acc;
    }, {});

    // --- RENDER ICON HELPER ---
    const renderSeatIcon = (seatType) => {
        const typeLower = seatType ? seatType.toLowerCase() : 'standard';
        if (typeLower === 'vip') return <SeatVIP className="seat-icon-svg" />;
        if (typeLower === 'couple') return <SeatCouple className="seat-icon-svg" />;
        return <SeatNormal className="seat-icon-svg" />;
    };

    return (
        <div className="admin-seat-container">
            <Modal 
                show={modal.isOpen} 
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                onConfirm={handleModalConfirm}
                confirmLoading={loading}
                confirmText={modal.type === 'info' || modal.type === 'error' ? "Đóng" : "Xác nhận"}
            >
                {modal.type === 'maintenance' ? (
                    <div className="modal-body-content text-center">
                        <Settings size={40} className="mb-3" color="#ffc107" />
                        <p>Dũng muốn <strong>{modal.data?.is_active ? 'KHÓA BẢO TRÌ' : 'MỞ HOẠT ĐỘNG'}</strong> ghế này?</p>
                        <small className="text-muted">* Ghế bảo trì sẽ không hiển thị khi khách đặt vé.</small>
                    </div>
                ) : modal.type === 'info' ? (
                    <div className="modal-body-info">
                        <div className="info-row"><User size={18}/> <span>Khách hàng: <strong>{modal.data.customer_name}</strong></span></div>
                        <div className="info-row"><Clock size={18}/> <span>Thời gian đặt: {new Date(modal.data.booking_time).toLocaleString('vi-VN')}</span></div>
                        <div className="status-badge booked">ĐÃ CÓ VÉ</div>
                        <p className="warning-text">Ghế đã bán, Dũng chỉ được phép xem thông tin!</p>
                    </div>
                ) : modal.type === 'error' ? (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color="red" />
                        <p className="mt-2">{modal.data}</p>
                    </div>
                ) : (
                    <div className="modal-body-warning">
                        <AlertTriangle size={32} color={modal.type === 'delete' ? 'red' : 'orange'} />
                        <p>Dũng có chắc chắn muốn {modal.type === 'delete' ? 'XÓA SẠCH' : 'KHỞI TẠO'} sơ đồ phòng này không?</p>
                    </div>
                )}
            </Modal>

            <div className="seat-list-header">
                <h2>QUẢN LÝ SƠ ĐỒ GHẾ</h2>
                <div className="filter-controls">
                    <div className="filter-group">
                        <label>Rạp:</label>
                        <select value={selectedCinema} onChange={(e) => setSelectedCinema(e.target.value)}>
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Phòng:</label>
                        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} disabled={!selectedCinema}>
                            <option value="">-- Chọn phòng --</option>
                            {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_name} ({r.room_type})</option>)}
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
                    <div className="loading-text"><h3>Đang xử lý...</h3></div>
                ) : seats.length > 0 ? (
                    <div className="seat-map-wrapper">
                        <div className="screen">MÀN HÌNH</div>
                        {/* Đổi tên class bọc sang tên tương tự client để đồng bộ styling css */}
                        <div className="admin-grid seats-layout">
                            {Object.keys(groupedSeats).sort().reverse().map(row => (
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
                                                    {/* Khảm SVG Icon làm nền */}
                                                    {renderSeatIcon(seat.seat_type)}

                                                    {/* Khảm Text số ghế đè lên trên */}
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
                        
                        {/* --- BẢNG CHÚ THÍCH (LEGEND) --- */}
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
                                    {renderSeatIcon('Standard')}
                                    <span className="seat-number-text"><X size={10} /></span>
                                </div>
                                <span>Bảo trì</span>
                            </div>
                        </div>
                    </div>
                    
                ) : (
                    <div className="empty-text">
                        <Info size={40} />
                        <h3>{selectedRoom ? "Phòng chưa có phôi ghế, bấm Khởi tạo nhé Dũng!" : "Vui lòng chọn Rạp và Phòng để quản lý."}</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatList;