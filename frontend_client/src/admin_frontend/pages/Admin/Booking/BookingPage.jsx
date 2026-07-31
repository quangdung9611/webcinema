import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    ClipboardList,
    Eye,
    Trash2,
    Loader2,
    CheckCircle,
    XCircle,
    User,
    Film,
    Ticket,
    Popcorn,
    Calendar,
    MapPin
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import '../../../styles/BookingDetail.css'; // Giữ CSS của BookingDetail

const BOOKING_API = 'https://api.quangdungcinema.id.vn/api/bookings';

const BookingPage = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [bookingDetails, setBookingDetails] = useState([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await axios.get(BOOKING_API);
            setBookings(res.data.data || []);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách đơn hàng.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleViewDetail = async (booking_id) => {
        try {
            setLoading(true);
            const res = await axios.get(`${BOOKING_API}/detail/${booking_id}`);
            setSelectedBooking(res.data.booking);
            const tickets = res.data.tickets || [];
            const foods = res.data.foods || [];
            const details = [
                ...tickets.map(t => ({
                    ...t,
                    seat_id: t.seat_id,
                    item_name: `Ghế ${t.seat_row}${t.seat_number}`,
                    quantity: 1,
                    price: t.price,
                    subtotal: t.price,
                })),
                ...foods.map(f => ({
                    ...f,
                    seat_id: null,
                    item_name: f.item_name,
                    quantity: f.quantity,
                    price: f.price,
                    subtotal: f.price * f.quantity,
                }))
            ];
            setBookingDetails(details);
            setIsDetailOpen(true);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải chi tiết đơn hàng.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = (booking_id, currentStatus) => {
        const nextStatus = currentStatus.toLowerCase() === 'completed' ? 'Cancelled' : 'Completed';
        showAlert(
            'Cập nhật trạng thái',
            `Bạn có chắc muốn chuyển đơn #${booking_id} sang "${nextStatus}"?`,
            async () => {
                try {
                    await axios.put(`${BOOKING_API}/update/${booking_id}/status`, { status: nextStatus });
                    closeAlert();
                    fetchBookings();
                } catch (error) {
                    showAlert('Lỗi', 'Không thể cập nhật trạng thái.');
                }
            },
            closeAlert
        );
    };

    const handleDelete = (booking_id, memo) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa đơn "${memo}"?`,
            async () => {
                try {
                    await axios.delete(`${BOOKING_API}/delete/${booking_id}`);
                    closeAlert();
                    fetchBookings();
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa đơn hàng.');
                }
            },
            closeAlert
        );
    };

    const filteredBookings = bookings.filter(booking => {
        const keyword = search.toLowerCase();
        return (
            booking.memo?.toLowerCase().includes(keyword) ||
            booking.customer_name?.toLowerCase().includes(keyword) ||
            booking.customer_email?.toLowerCase().includes(keyword)
        );
    });

    const columns = [
        {
            title: 'ID',
            key: 'booking_id',
            render: (row) => <strong>#{row.booking_id}</strong>
        },
        {
            title: 'Mã đơn',
            key: 'memo',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: '700', color: '#f97316' }}>
                        {row.memo || 'N/A'}
                    </div>
                </div>
            )
        },
        {
            title: 'Khách hàng',
            key: 'customer_name',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: '600' }}>{row.customer_name}</div>
                    <small style={{ color: '#64748b' }}>{row.customer_email}</small>
                </div>
            )
        },
        {
            title: 'Tổng tiền',
            key: 'total_amount',
            render: (row) => (
                <span className="status-badge">
                    {Number(row.total_amount).toLocaleString()}đ
                </span>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (row) => (
                <span className={`status-badge ${row.status.toLowerCase()}`}>
                    {row.status}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
                <div className="admin-table-actions">
                    <button className="admin-action-btn view-btn" onClick={() => handleViewDetail(row.booking_id)}>
                        <Eye size={16} />
                    </button>
                    <button
                        className={`admin-action-btn ${row.status.toLowerCase() === 'completed' ? 'delete-btn' : 'edit-btn'}`}
                        onClick={() => handleUpdateStatus(row.booking_id, row.status)}
                    >
                        {row.status.toLowerCase() === 'completed' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                    </button>
                    <button className="admin-action-btn delete-btn" onClick={() => handleDelete(row.booking_id, row.memo)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const seats = bookingDetails.filter(item => item.seat_id !== null);
    const foods = bookingDetails.filter(item => item.seat_id === null);

    return (
        <>
            <AdminPage
                title="Quản lý đơn hàng"
                subtitle="Quản lý toàn bộ booking trong hệ thống"
                icon={<ClipboardList size={30} />}
                searchValue={search}
                onSearchChange={setSearch}
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <AdminTable columns={columns} data={filteredBookings} />
                )}
            </AdminPage>

            {/* DETAIL MODAL – Nội dung lấy từ BookingDetail */}
            <AdminModal
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`CHI TIẾT ĐƠN HÀNG #${selectedBooking?.booking_id || ''}`}
            >
                {selectedBooking && (
                    <div className="booking-detail-wrapper">
                        <div className="detail-content-vertical">
                            {/* 1. Khách hàng */}
                            <section className="detail-section">
                                <h3 className="section-title"><User size={18} /> Thông tin khách hàng</h3>
                                <div className="section-body">
                                    <p><strong>Họ tên:</strong> {selectedBooking.full_name}</p>
                                    <p><strong>Số điện thoại:</strong> {selectedBooking.phone}</p>
                                    <p><strong>Email:</strong> {selectedBooking.email}</p>
                                </div>
                            </section>

                            {/* 2. Suất chiếu */}
                            <section className="detail-section">
                                <h3 className="section-title"><Film size={18} /> Thông tin suất chiếu</h3>
                                <div className="section-body">
                                    <p className="movie-name-highlight">{selectedBooking.movie_name}</p>
                                    <p><MapPin size={14} /> {selectedBooking.cinema_name} - {selectedBooking.room_name}</p>
                                    <p>
                                            <Calendar size={14} /> 
                                            <span className="time-highlight">Ngày: {selectedBooking.show_date}</span>
                                            <span className="time-highlight" style={{ marginLeft: '12px' }}>Giờ: {selectedBooking.show_hour}</span>
                                    </p>
                                </div>
                            </section>

                            {/* 3. Ghế ngồi */}
                            <section className="detail-section">
                                <h3 className="section-title"><Ticket size={18} /> Danh sách ghế ({seats.length})</h3>
                                <div className="seat-list-inline">
                                    {seats.map(s => (
                                        <span key={s.booking_detail_id || s.ticket_id} className="seat-badge">
                                            {s.seat_row}{s.seat_number} ({s.seat_type})
                                        </span>
                                    ))}
                                </div>
                            </section>

                            {/* 4. Dịch vụ bắp nước */}
                            <section className="detail-section">
                                <h3 className="section-title"><Popcorn size={18} /> Dịch vụ bắp nước</h3>
                                <div className="food-list-vertical">
                                    {foods.length > 0 ? (
                                        foods.map(f => (
                                            <div key={f.booking_detail_id || f.id} className="food-item-line">
                                                <span>{f.item_name} <small>x{f.quantity}</small></span>
                                                <span className="text-bold">{Number(f.subtotal).toLocaleString()}đ</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-data">Không có dịch vụ đi kèm.</p>
                                    )}
                                </div>
                            </section>

                            {/* 5. Tổng tiền */}
                            <section className="detail-section total-card-final">
                                <div className="footer-row">
                                    <span>Mã đơn (Memo):</span>
                                    <span className="memo-text">{selectedBooking.memo || 'N/A'}</span>
                                </div>
                                <div className="footer-row main-total">
                                    <span>TỔNG THANH TOÁN</span>
                                    <span className="amount-highlight">{Number(selectedBooking.total_amount).toLocaleString()}đ</span>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* ALERT MODAL */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                    <div className="admin-alert-actions">
                        {alertModal.onCancel && (
                            <button className="admin-cancel-btn" onClick={alertModal.onCancel}>
                                Hủy
                            </button>
                        )}
                        <button className="admin-confirm-btn" onClick={alertModal.onConfirm || closeAlert}>
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default BookingPage;