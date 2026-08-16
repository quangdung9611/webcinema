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
import AdminTable from '../../../components/AdminTable';
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
        open: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null
    });

    // ----- MODAL HELPERS -----
    const closeModal = useCallback(() => {
        setModal(prev => ({
            ...prev,
            open: false,
            onConfirm: null
        }));
    }, []);

    const showModal = useCallback(({
        type = 'info',
        title = '',
        message = '',
        onConfirm = null
    }) => {
        setModal({
            open: true,
            type,
            title,
            message,
            onConfirm
        });
    }, []);

    // ----- API ERROR -----
    const handleApiError = useCallback(
        (error, fallbackMessage = 'Có lỗi xảy ra.') => {
            console.error('API Error:', error);
            showModal({
                type: 'error',
                title: 'Lỗi',
                message: error.response?.data?.message || fallbackMessage
            });
        },
        [showModal]
    );

    // ----- 1. FETCH CINEMAS -----
    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaList = res.data?.data || [];
            setCinemas(cinemaList);
            console.log('✅ [Cinemas] Đã tải:', cinemaList.length);
        } catch (err) {
            handleApiError(err, 'Không thể tải danh sách rạp.');
        }
    }, [handleApiError]);

    useEffect(() => {
        fetchCinemas();
    }, [fetchCinemas]);

    // ----- 2. FETCH ROOMS -----
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
    }, [handleApiError]);

    useEffect(() => {
        fetchRooms(filters.cinemaId);
    }, [filters.cinemaId, fetchRooms]);

    // ----- 3. FETCH SHOWTIMES & SEATS -----
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
            const seatsRes = await api.get(`/api/seats/room/${roomId}`);
            const seatList = seatsRes.data?.data || [];
            setAllSeats(seatList);

            const showtimesRes = await api.get(
                `/api/showtimes/by-cinema-room?cinema_id=${cinemaId}&room_id=${roomId}`
            );
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
    }, [handleApiError]);

    useEffect(() => {
        fetchShowtimesAndSeats(filters.cinemaId, filters.roomId);
    }, [filters.cinemaId, filters.roomId, fetchShowtimesAndSeats]);

    // ----- 4. FETCH TICKETS -----
    const fetchTickets = useCallback(async (showtimeId) => {
        if (!showtimeId) {
            setTickets([]);
            return;
        }

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
            const ticketsData = res.data?.data || [];
            setTickets(Array.isArray(ticketsData) ? ticketsData : []);
            console.log(`✅ [Tickets] Đã tải cho showtime ${showtimeId}:`, ticketsData.length);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.code === 'ECONNABORTED') {
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
    }, [handleApiError]);

    useEffect(() => {
        fetchTickets(filters.showtimeId);
    }, [filters.showtimeId, fetchTickets]);

    // ----- 5. CHECK-IN -----
    const handleCheckIn = useCallback((code) => {
        if (!code) {
            showModal({
                type: 'error',
                title: 'Lỗi',
                message: 'Không tìm thấy mã vé.'
            });
            return;
        }

        showModal({
            type: 'confirm',
            title: 'Xác nhận soát vé',
            message: `Bạn có chắc muốn soát vé mã: ${code}?`,
            onConfirm: async () => {
                closeModal();
                try {
                    const response = await api.post('/api/tickets/check-in', { ticketCode: code });
                    if (response.data?.success) {
                        await fetchTickets(filters.showtimeId);
                        showModal({
                            type: 'success',
                            title: 'Soát vé thành công',
                            message: response.data?.message || `Vé ${code} đã được soát thành công.`
                        });
                    } else {
                        showModal({
                            type: 'error',
                            title: 'Không thể soát vé',
                            message: response.data?.message || 'Vé không thể được soát.'
                        });
                    }
                } catch (err) {
                    console.error('❌ [Check-in Error]:', err);
                    showModal({
                        type: 'error',
                        title: 'Lỗi soát vé',
                        message: err.response?.data?.message || err.message || 'Đã xảy ra lỗi khi soát vé.'
                    });
                }
            }
        });
    }, [showModal, closeModal, fetchTickets, filters.showtimeId]);

    // ----- STATS -----
    const stats = {
        total: tickets.length,
        used: tickets.filter(t => t.ticket_status === 'Used').length,
        pending: tickets.filter(t => t.ticket_status === 'Valid').length
    };

    // ----- SEAT MAP LAYOUT -----
    const fullLayout = allSeats.reduce((acc, seat) => {
        const row = seat.seat_row || 'A';
        if (!acc[row]) acc[row] = [];
        const ticket = tickets.find(t => t.seat_id === seat.seat_id);
        acc[row].push({ ...seat, ticketInfo: ticket });
        return acc;
    }, {});

    // ----- FORMAT SHOWTIME LABEL -----
    const formatShowtimeLabel = (showtime) => {
        if (!showtime) return '';
        const datePart = showtime.start_time?.split(' ')[0] || '';
        const timePart = showtime.start_time?.split(' ')[1]?.substring(0, 5) || '';
        const [year, month, day] = datePart.split('-');
        const dateVN = `${day}/${month}/${year}`;
        const title = showtime.title || 'Phim';
        return `${title} | ${dateVN} | ${timePart}`;
    };

    // ----- FORMAT DATE FOR TABLE (đã sửa để bỏ T và Z) -----
    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return '--';
        // Cắt bỏ phần .000Z và thay T thành khoảng trắng
        let cleanDateStr = dateStr.replace(/\.\d+Z$/, '').replace('T', ' ');
        // Khớp định dạng YYYY-MM-DD HH:MM
        const match = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
        if (match) {
            const [_, year, month, day, hour, minute] = match;
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }
        return dateStr;
    };

    // ----- COLUMNS FOR ADMIN TABLE -----
    const columns = [
        {
            title: 'Mã Vé',
            key: 'ticket_code',
            render: (row) => <span className="ticket-code">{row.ticket_code}</span>
        },
        {
            title: 'Ghế',
            key: 'seat',
            render: (row) => (
                <span className="seat-label">
                    {row.seat_row}{row.seat_number}
                </span>
            )
        },
        {
            title: 'Khách hàng',
            key: 'customer_name',
            render: (row) => row.customer_name || row.full_name || 'N/A'
        },
      
        {
            title: 'Trạng thái',
            key: 'ticket_status',
            render: (row) => {
                const isUsed = row.ticket_status === 'Used';
                const className = isUsed ? 'used' : 'pending';
                return (
                    <span className={`status-badge ${className}`}>
                        {isUsed ? <><Check size={12} /> Đã dùng</> : <><Clock size={12} /> Chưa dùng</>}
                    </span>
                );
            }
        },
        {
            title: 'Thời gian soát',
            key: 'updated_at',
            render: (row) => {
                if (row.ticket_status === 'Used') {
                    return formatDateDisplay(row.updated_at);
                }
                return '--';
            }
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => {
                const isValid = row.ticket_status === 'Valid';
                if (isValid) {
                    return (
                        <button
                            type="button"
                            className="checkin-btn"
                            onClick={() => handleCheckIn(row.ticket_code)}
                        >
                            Soát vé
                        </button>
                    );
                }
                return (
                    <button type="button" className="disabled-btn" disabled>
                        {row.ticket_status === 'Used' ? 'Đã soát' : 'Không khả dụng'}
                    </button>
                );
            }
        }
    ];

    // ----- LOADING STATE -----
    const isLoading = loadingTickets || loadingShowtimes;

    // ----- RENDER -----
    return (
        <div className="admin-ticket-container">
            <AdminModal
                open={modal.open}
                onClose={closeModal}
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
                                onChange={(e) => {
                                    setFilters({ cinemaId: e.target.value, roomId: '', showtimeId: '' });
                                    setSearchTerm('');
                                }}
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
                                onChange={(e) => {
                                    setFilters(prev => ({ ...prev, roomId: e.target.value, showtimeId: '' }));
                                    setSearchTerm('');
                                }}
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
                                onChange={(e) => {
                                    setFilters(prev => ({ ...prev, showtimeId: e.target.value }));
                                    setSearchTerm('');
                                }}
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
                        <AdminTable
                            columns={columns}
                            data={tickets}
                            emptyText="Không có vé nào cho suất chiếu này."
                        />
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