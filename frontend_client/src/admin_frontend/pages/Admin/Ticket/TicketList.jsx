import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Ticket, 
    LayoutGrid, 
    List, 
    Search, 
    CheckCircle2, 
    Clock, 
    Armchair, 
    Loader2, 
    Monitor,
    Info,
    AlertCircle,
    Check
} from 'lucide-react';
import Modal from '../../../components/Modal';
import '../../../styles/TicketList.css'; 

const TicketList = () => {
    const [tickets, setTickets] = useState([]);
    const [allSeats, setAllSeats] = useState([]); 
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]); 
    const [showtimes, setShowtimes] = useState([]);
    const [viewMode, setViewMode] = useState('table');
    
    const today = new Date().toISOString().split('T')[0];

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: null
    });

    const [filters, setFilters] = useState({ 
        cinemaId: '', 
        roomId: '', 
        showtimeId: '' 
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const openModal = (type, title, message, onConfirm = closeModal, onCancel = null) => {
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: () => { onConfirm(); closeModal(); },
            onCancel: onCancel ? () => { onCancel(); closeModal(); } : null
        });
    };

    // 1. Lấy danh sách rạp
    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/cinemas');
                setCinemas(res.data);
            } catch (err) { console.error("Lỗi lấy rạp:", err); }
        };
        fetchCinemas();
    }, []);

    // 2. Khi chọn Rạp -> Lấy danh sách Phòng
    useEffect(() => {
        if (filters.cinemaId) {
            const fetchRooms = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/rooms/cinema/${filters.cinemaId}`);
                    setRooms(res.data);
                    setFilters(prev => ({ ...prev, roomId: '', showtimeId: '' })); 
                    setTickets([]);
                    setShowtimes([]);
                    setAllSeats([]); 
                } catch (err) { console.error("Lỗi lấy phòng:", err); }
            };
            fetchRooms();
        }
    }, [filters.cinemaId]);

    // 3. Khi chọn Phòng -> Lấy Suất chiếu & Sơ đồ ghế
    useEffect(() => {
        if (filters.roomId) {
            const fetchAllSeats = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/seats/room/${filters.roomId}`);
                    setAllSeats(res.data);
                } catch (err) { console.error("Lỗi lấy sơ đồ ghế:", err); }
            };
            fetchAllSeats();

            const fetchShowtimes = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/tickets/filter`, {
                        params: { roomId: filters.roomId, date: today }
                    });
                    setShowtimes(res.data);
                    setFilters(prev => ({ ...prev, showtimeId: '' }));
                    setTickets([]);
                } catch (err) { console.error("Lỗi lấy suất chiếu:", err); }
            };
            fetchShowtimes();
        }
    }, [filters.roomId]);

    const fetchTickets = async () => {
        if (!filters.showtimeId) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/tickets/showtime/${filters.showtimeId}`);
            setTickets(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Lỗi lấy vé:", err);
            setTickets([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchTickets(); }, [filters.showtimeId]);

    const handleCheckIn = (code) => {
        openModal(
            'confirm',
            'Xác nhận soát vé',
            `Quang Dũng xác nhận soát vé cho mã: ${code}?`,
            async () => {
                try {
                    await axios.post('http://localhost:5000/api/tickets/check-in', { ticketCode: code });
                    openModal('success', 'Thành công', `Đã soát vé ${code} thành công!`);
                    fetchTickets(); 
                } catch (err) {
                    openModal('error', 'Lỗi soát vé', err.response?.data?.message || "Lỗi hệ thống.");
                }
            }
        );
    };

    const stats = {
        total: tickets.length,
        used: tickets.filter(t => t.ticket_status === 'Used').length,
        pending: tickets.filter(t => t.ticket_status !== 'Used').length
    };

    const fullLayout = allSeats.reduce((acc, seat) => {
        const row = seat.seat_row || 'A';
        if (!acc[row]) acc[row] = [];
        const ticket = tickets.find(t => t.seat_id === seat.seat_id);
        acc[row].push({ ...seat, ticketInfo: ticket });
        return acc;
    }, {});

    return (
        <div className="admin-ticket-container">
            <Modal 
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            <div className="admin-ticket-header">
                <h2><Ticket size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> QUẢN LÝ & GIÁM SÁT VÉ</h2>
                
                <div className="top-toolbar">
                    <div className="filter-selection-grid">
                        <div className="filter-group">
                            <label>Rạp chiếu:</label>
                            <select value={filters.cinemaId} onChange={(e) => setFilters({ ...filters, cinemaId: e.target.value })}>
                                <option value="">-- Chọn Rạp --</option>
                                {cinemas.map(c => <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>)}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Phòng:</label>
                            <select value={filters.roomId} onChange={(e) => setFilters({ ...filters, roomId: e.target.value })} disabled={!filters.cinemaId}>
                                <option value="">-- Chọn Phòng --</option>
                                {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_name}</option>)}
                            </select>
                        </div>

                        <div className="filter-group large">
                            <label>Chọn phim & Suất chiếu:</label>
                            <select value={filters.showtimeId} onChange={(e) => setFilters({ ...filters, showtimeId: e.target.value })} disabled={!showtimes.length}>
                                <option value="">-- Chọn Suất chiếu --</option>
                                {showtimes.map(s => (
                                    <option key={s.showtime_id} value={s.showtime_id}>
                                        {s.movie_title} | {s.date_vn} | {s.time_vn}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="view-mode-switch">
                        <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
                            <List size={18} style={{ marginRight: '6px' }} /> Danh sách
                        </button>
                        <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
                            <LayoutGrid size={18} style={{ marginRight: '6px' }} /> Sơ đồ ghế
                        </button>
                    </div>
                </div>

                <div className="ticket-stats-cards">
                    <div className="stat-card blue">
                        <span>{stats.total}</span>
                        <p><Ticket size={16} style={{ marginRight: '5px' }} /> VÉ ĐÃ BÁN</p>
                    </div>
                    <div className="stat-card green">
                        <span>{stats.used}</span>
                        <p><CheckCircle2 size={16} style={{ marginRight: '5px' }} /> KHÁCH ĐÃ VÀO</p>
                    </div>
                    <div className="stat-card yellow">
                        <span>{stats.pending}</span>
                        <p><Clock size={16} style={{ marginRight: '5px' }} /> ĐANG CHỜ SOÁT</p>
                    </div>
                </div>
            </div>

            <div className="content-body">
                {loading ? (
                    <div className="loader">
                        <Loader2 size={24} className="spin" style={{ marginRight: '10px' }} /> Đang quét dữ liệu vé...
                    </div>
                ) : !filters.showtimeId ? (
                    <div className="empty-msg">
                        <Info size={20} style={{ marginRight: '8px' }} /> Vui lòng chọn đầy đủ thông tin để xem dữ liệu.
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="table-section">
                        <div className="search-bar">
                            <Search size={18} className="search-icon" />
                            <input type="text" placeholder="Tìm mã vé hoặc tên khách..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr><th>Mã Vé</th><th>Ghế</th><th>Khách hàng</th><th>Trạng thái</th><th>Thao tác</th></tr>
                            </thead>
                            <tbody>
                                {tickets.filter(t => (
                                    t.ticket_code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    (t.customer_name || t.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                                )).map((ticket) => (
                                    <tr key={ticket.ticket_id}>
                                        <td className="ticket-code">{ticket.ticket_code}</td>
                                        <td><span className="seat-label">{ticket.seat_row}{ticket.seat_number}</span></td>
                                        <td>{ticket.customer_name || ticket.full_name}</td>
                                        <td>
                                            <span className={`status-badge ${ticket.ticket_status === 'Used' ? 'used' : 'pending'}`}>
                                                {ticket.ticket_status === 'Used' ? <><Check size={12} /> Đã dùng</> : <><Clock size={12} /> Chưa dùng</>}
                                            </span>
                                        </td>
                                        <td>
                                            {ticket.ticket_status !== 'Used' ? (
                                                <button className="checkin-btn" onClick={() => handleCheckIn(ticket.ticket_code)}>Soát vé</button>
                                            ) : <button className="disabled-btn" disabled>Đã soát</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="visual-monitor-container">
                        <div className="screen-bar-admin">
                            <Monitor size={16} style={{ marginRight: '8px' }} /> MÀN HÌNH CHÍNH
                        </div>

                        <div className="monitor-grid">
                            {Object.keys(fullLayout).sort().map(row => (
                                <div key={row} className="seat-row-admin">
                                    <span className="row-label-admin">{row}</span>
                                    {fullLayout[row].sort((a,b) => a.seat_number - b.seat_number).map(seat => {
                                        const ticket = seat.ticketInfo;
                                        const isSold = !!ticket;
                                        const isUsed = ticket?.ticket_status === 'Used';
                                        const isBooked = ticket?.ticket_status === 'Booked';

                                        const seatClasses = [
                                            'seat-item-admin',
                                            seat.seat_type === 'Couple' ? 'Couple' : '',
                                            isUsed ? 'used' : (isBooked ? 'reserved' : (isSold ? 'sold' : 'empty'))
                                        ].filter(Boolean).join(' ');

                                        const displayLabel = seat.seat_type === 'Couple' 
                                            ? `${seat.seat_number}-${parseInt(seat.seat_number) + 1}` 
                                            : seat.seat_number;

                                        return (
                                            <div 
                                                key={seat.seat_id} 
                                                className={seatClasses}
                                                onClick={() => isSold && !isUsed && handleCheckIn(ticket.ticket_code)}
                                                title={isSold ? `Khách: ${ticket.customer_name || ticket.full_name}` : 'Ghế trống'}
                                            >
                                                <Armchair size={12} className="seat-icon" />
                                                <span className="seat-text">{displayLabel}</span>
                                                {isSold && (
                                                    <span className="customer-mininame">
                                                        {(ticket.customer_name || '').split(' ').pop()}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        <div className="map-legend">
                            <div className="legend-item"><span className="box empty"></span>Trống</div>
                            <div className="legend-item"><span className="box reserved"><Clock size={10}/></span>Đang đặt</div>
                            <div className="legend-item"><span className="box sold"><Ticket size={10}/></span>Đã mua</div>
                            <div className="legend-item"><span className="box used"><Check size={10}/></span>Đã soát</div>
                        </div>
                    </div>
                )}
            </div>
        </div> 
    );
};

export default TicketList;