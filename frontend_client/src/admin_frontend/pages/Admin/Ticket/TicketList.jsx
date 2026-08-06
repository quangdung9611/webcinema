import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/api';
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
    Check
} from 'lucide-react';
import AdminModal from '../../../components/AdminModal';
import '../../../styles/TicketList.css';

const TicketList = () => {
    // ----- STATES -----
    const [tickets, setTickets] = useState([]);
    const [allSeats, setAllSeats] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);
    const [viewMode, setViewMode] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [loadingShowtimes, setLoadingShowtimes] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const [filters, setFilters] = useState({
        cinemaId: '',
        roomId: '',
        showtimeId: ''
    });

    // ----- ABORT CONTROLLER -----
    const abortControllerRef = useRef(null);

    // ----- MODAL STATE -----
    const [modal, setModal] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    // ----- MODAL HELPERS -----
    const closeModal = () => setModal(prev => ({ ...prev, show: false }));

    const showModal = (type, title, message, onConfirm = closeModal, onCancel = closeModal) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                closeModal();
            },
            onCancel: () => {
                if (onCancel) onCancel();
                closeModal();
            }
        });
    };

    const handleApiError = (error, fallbackMessage = 'Có lỗi xảy ra.') => {
        console.error('API Error:', error);
        showModal('error', 'Lỗi', error.response?.data?.message || fallbackMessage);
    };

    // ----- 1. Lấy danh sách rạp (có parse) -----
    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            // ✅ Lấy mảng từ res.data.data
            const cinemaList = res.data?.data || [];
            setCinemas(cinemaList);
            console.log('✅ [Cinemas] Đã tải:', cinemaList.length);
        } catch (err) {
            handleApiError(err, 'Không thể tải danh sách rạp.');
        }
    }, []);

    useEffect(() => {
        fetchCinemas();
    }, [fetchCinemas]);

    // ----- 2. Khi chọn rạp -> lấy phòng (có parse) -----
    const fetchRooms = useCallback(async (cinemaId) => {
        if (!cinemaId) {
            setRooms([]);
            setFilters(prev => ({ ...prev, roomId: '', showtimeId: '' }));
            setShowtimes([]);
            setTickets([]);
            setAllSeats([]);
            return;
        }

        setLoadingRooms(true);
        try {
            const res = await api.get(`/api/rooms/cinema/${cinemaId}`);
            // ✅ Lấy mảng từ res.data.data
            const roomList = res.data?.data || [];
            setRooms(roomList);
            setFilters(prev => ({ ...prev, roomId: '', showtimeId: '' }));
            setShowtimes([]);
            setTickets([]);
            setAllSeats([]);
            console.log(`✅ [Rooms] Đã tải cho cinema ${cinemaId}:`, roomList.length);
        } catch (err) {
            handleApiError(err, 'Không thể tải danh sách phòng.');
        } finally {
            setLoadingRooms(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms(filters.cinemaId);
    }, [filters.cinemaId, fetchRooms]);

    // ----- 3. Khi chọn phòng -> lấy sơ đồ ghế + suất chiếu -----
    const fetchShowtimesAndSeats = useCallback(async (cinemaId, roomId) => {
        if (!roomId) {
            setShowtimes([]);
            setAllSeats([]);
            setTickets([]);
            setFilters(prev => ({ ...prev, showtimeId: '' }));
            return;
        }

        setLoadingShowtimes(true);
        try {
            // Lấy sơ đồ ghế (public)
            const seatsRes = await api.get(`/api/seats/room/${roomId}`);
            // ✅ Lấy mảng từ res.data.data
            const seatList = seatsRes.data?.data || [];
            setAllSeats(seatList);

            // Lấy suất chiếu theo rạp và phòng (admin)
            const showtimesRes = await api.get(
                `/api/showtimes/by-cinema-room?cinema_id=${cinemaId}&room_id=${roomId}`
            );
            // ✅ Lấy mảng từ res.data.data
            const showtimeList = showtimesRes.data?.data || [];
            setShowtimes(showtimeList);
            setFilters(prev => ({ ...prev, showtimeId: '' }));
            setTickets([]);
            console.log(`✅ [Showtimes] Đã tải cho room ${roomId}:`, showtimeList.length);
            console.log(`✅ [Seats] Đã tải cho room ${roomId}:`, seatList.length);
        } catch (err) {
            handleApiError(err, 'Không thể tải suất chiếu.');
        } finally {
            setLoadingShowtimes(false);
        }
    }, []);

    useEffect(() => {
        fetchShowtimesAndSeats(filters.cinemaId, filters.roomId);
    }, [filters.cinemaId, filters.roomId, fetchShowtimesAndSeats]);

    // ----- 4. Khi chọn suất chiếu -> lấy vé (có abort controller) -----
    const fetchTickets = useCallback(async (showtimeId) => {
        if (!showtimeId) {
            setTickets([]);
            return;
        }

        // Hủy request cũ nếu có
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoadingTickets(true);
        try {
            const res = await api.get(`/api/tickets/showtime/${showtimeId}`, {
                signal: controller.signal
            });
            // ✅ Lấy mảng từ res.data.data
            const ticketsData = res.data?.data || [];
            setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            console.log(`✅ [Tickets] Đã tải cho showtime ${showtimeId}:`, ticketsData.length);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('🛑 [Tickets] Request bị hủy');
                return;
            }
            handleApiError(err, 'Không thể tải danh sách vé.');
            setTickets([]);
        } finally {
            setLoadingTickets(false);
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        fetchTickets(filters.showtimeId);
    }, [filters.showtimeId, fetchTickets]);

    // ----- 5. Check-in vé -----
    const handleCheckIn = (code) => {
        showModal(
            'confirm',
            'Xác nhận soát vé',
            `Bạn có chắc muốn soát vé mã: ${code}?`,
            async () => {
                try {
                    const response = await api.post('/api/tickets/check-in', { ticketCode: code });
                    if (response.data.success) {
                        showModal('success', 'Thành công', response.data.message || 'Đã soát vé thành công!');
                        await fetchTickets(filters.showtimeId);
                    } else {
                        showModal('error', 'Lỗi', response.data.message || 'Không thể soát vé.');
                    }
                } catch (err) {
                    const errorMsg = err.response?.data?.message || err.message || 'Lỗi hệ thống.';
                    showModal('error', 'Lỗi soát vé', errorMsg);
                }
            }
        );
    };

    // ----- Thống kê -----
    const stats = {
        total: tickets.length,
        used: tickets.filter(t => t.ticket_status === 'Used').length,
        pending: tickets.filter(t => t.ticket_status === 'Valid').length
    };

    // ----- Sơ đồ ghế -----
    const fullLayout = allSeats.reduce((acc, seat) => {
        const row = seat.seat_row || 'A';
        if (!acc[row]) acc[row] = [];
        const ticket = tickets.find(t => t.seat_id === seat.seat_id);
        acc[row].push({ ...seat, ticketInfo: ticket });
        return acc;
    }, {});

    // ----- Format -----
    const formatShowtimeLabel = (showtime) => {
        if (!showtime) return '';
        const datePart = showtime.start_time?.split(' ')[0] || '';
        const timePart = showtime.start_time?.split(' ')[1]?.substring(0, 5) || '';
        const [year, month, day] = datePart.split('-');
        const dateVN = `${day}/${month}/${year}`;
        const title = showtime.title || 'Phim';
        return `${title} | ${dateVN} | ${timePart}`;
    };

    const isLoading = loadingTickets || loadingShowtimes;

    // ----- RENDER -----
    return (
        <div className="admin-ticket-container">
            <AdminModal
                show={modal.show}
                onCancel={closeModal}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
            />

            <div className="admin-ticket-header">
                <h2>
                    <Ticket size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                    QUẢN LÝ & GIÁM SÁT VÉ
                </h2>

                <div className="top-toolbar">
                    <div className="filter-selection-grid">
                        <div className="filter-group">
                            <label>Rạp chiếu:</label>
                            <select
                                value={filters.cinemaId}
                                onChange={(e) => setFilters({ ...filters, cinemaId: e.target.value })}
                            >
                                <option value="">-- Chọn Rạp --</option>
                                {cinemas.map(c => (
                                    <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Phòng:</label>
                            <select
                                value={filters.roomId}
                                onChange={(e) => setFilters({ ...filters, roomId: e.target.value })}
                                disabled={!filters.cinemaId || loadingRooms}
                            >
                                <option value="">-- Chọn Phòng --</option>
                                {rooms.map(r => (
                                    <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group large">
                            <label>Chọn phim & Suất chiếu:</label>
                            <select
                                value={filters.showtimeId}
                                onChange={(e) => setFilters({ ...filters, showtimeId: e.target.value })}
                                disabled={!showtimes.length || loadingShowtimes}
                            >
                                <option value="">-- Chọn Suất chiếu --</option>
                                {showtimes.map(s => (
                                    <option key={s.showtime_id} value={s.showtime_id}>
                                        {formatShowtimeLabel(s)}
                                    </option>
                                ))}
                            </select>
                            {loadingShowtimes && <span className="loading-indicator">Đang tải...</span>}
                        </div>
                    </div>

                    <div className="view-mode-switch">
                        <button
                            className={viewMode === 'table' ? 'active' : ''}
                            onClick={() => setViewMode('table')}
                        >
                            <List size={18} style={{ marginRight: '6px' }} /> Danh sách
                        </button>
                        <button
                            className={viewMode === 'map' ? 'active' : ''}
                            onClick={() => setViewMode('map')}
                        >
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
                {isLoading ? (
                    <div className="loader">
                        <Loader2 size={24} className="spin" style={{ marginRight: '10px' }} />
                        Đang tải dữ liệu...
                    </div>
                ) : !filters.showtimeId ? (
                    <div className="empty-msg">
                        <Info size={20} style={{ marginRight: '8px' }} />
                        Vui lòng chọn đầy đủ thông tin để xem dữ liệu.
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="table-section">
                        <div className="search-bar">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Tìm mã vé hoặc tên khách..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã Vé</th>
                                    <th>Ghế</th>
                                    <th>Khách hàng</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets
                                    .filter(t =>
                                        t.ticket_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (t.customer_name || t.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((ticket) => {
                                        const isUsed = ticket.ticket_status === 'Used';
                                        const isValid = ticket.ticket_status === 'Valid';
                                        return (
                                            <tr key={ticket.ticket_id}>
                                                <td className="ticket-code">{ticket.ticket_code}</td>
                                                <td>
                                                    <span className="seat-label">
                                                        {ticket.seat_row}{ticket.seat_number}
                                                    </span>
                                                </td>
                                                <td>{ticket.customer_name || ticket.full_name || 'N/A'}</td>
                                                <td>
                                                    <span className={`status-badge ${isUsed ? 'used' : 'pending'}`}>
                                                        {isUsed ? (
                                                            <><Check size={12} /> Đã dùng</>
                                                        ) : (
                                                            <><Clock size={12} /> Chưa dùng</>
                                                        )}
                                                    </span>
                                                </td>
                                                <td>
                                                    {isValid ? (
                                                        <button
                                                            className="checkin-btn"
                                                            onClick={() => handleCheckIn(ticket.ticket_code)}
                                                        >
                                                            Soát vé
                                                        </button>
                                                    ) : (
                                                        <button className="disabled-btn" disabled>
                                                            {isUsed ? 'Đã soát' : 'Không khả dụng'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="visual-monitor-container">
                        <div className="screen-bar-admin">
                            <Monitor size={16} style={{ marginRight: '8px' }} /> MÀN HÌNH CHÍNH
                        </div>

                        <div className="monitor-grid">
                            {Object.keys(fullLayout)
                                .sort()
                                .map(row => (
                                    <div key={row} className="seat-row-admin">
                                        <span className="row-label-admin">{row}</span>
                                        {fullLayout[row]
                                            .sort((a, b) => a.seat_number - b.seat_number)
                                            .map(seat => {
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
                            <div className="legend-item"><span className="box reserved"><Clock size={10} /></span>Đang đặt</div>
                            <div className="legend-item"><span className="box sold"><Ticket size={10} /></span>Đã mua</div>
                            <div className="legend-item"><span className="box used"><Check size={10} /></span>Đã soát</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketList;