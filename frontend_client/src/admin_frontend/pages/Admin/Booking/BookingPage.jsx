import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
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
import AdminPagination from '../../../components/AdminPagination';
import '../../../styles/BookingDetail.css';

// ==========================================================
// CONSTANTS & HELPERS
// ==========================================================
const parseData = (response) => {
    if (response?.data?.success && response.data.data?.data) {
        return response.data.data.data;
    }
    if (response?.data?.data) {
        return response.data.data;
    }
    if (Array.isArray(response?.data)) {
        return response.data;
    }
    return [];
};

const parsePagination = (response) => {
    if (response?.data?.data?.pagination) {
        return response.data.data.pagination;
    }
    if (response?.data?.pagination) {
        return response.data.pagination;
    }
    return { page: 1, limit: 20, total: 0, totalPages: 1 };
};

// ==========================================================
// COMPONENT
// ==========================================================
const BookingPage = () => {
    // ------------------------------------------------------
    // STATES
    // ------------------------------------------------------
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [bookingDetails, setBookingDetails] = useState([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // ======================================================
    // ALERT MODAL (giống UserPage)
    // ======================================================
    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({
            open: true,
            title,
            message,
            type,
            onConfirm,
            onCancel
        });
    };

    const closeAlert = () => {
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // ------------------------------------------------------
    // FETCH BOOKINGS - GỌI /paginated
    // ------------------------------------------------------
    const fetchBookings = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) {
            console.log('⏳ Đang fetch, bỏ qua lần gọi mới');
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
            const res = await api.get('/api/bookings/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            // ✅ Lấy trực tiếp từ res.data giống các trang khác
            const bookingsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setBookings(bookingsData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH BOOKINGS ERROR:', error);
            setBookings([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách đơn hàng.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        fetchBookings(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchBookings]);

    // ------------------------------------------------------
    // SEARCH DEBOUNCE
    // ------------------------------------------------------
    const prevSearchRef = useRef('');
    useEffect(() => {
        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) return;
        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchBookings(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchBookings]);

    const handlePageChange = (page) => {
        fetchBookings(page, search);
    };

    // ------------------------------------------------------
    // HANDLE VIEW DETAIL
    // ------------------------------------------------------
    const handleViewDetail = async (booking_id) => {
        try {
            setLoading(true);
            const res = await api.get(`/api/bookings/detail/${booking_id}`);
            const { booking, tickets = [], foods = [] } = res.data;

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

            setSelectedBooking(booking);
            setBookingDetails(details);
            setIsDetailOpen(true);
        } catch (error) {
            console.error('View detail error:', error);
            showAlert('Lỗi', 'Không thể tải chi tiết đơn hàng.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------
    // HANDLE UPDATE STATUS
    // ------------------------------------------------------
    const handleUpdateStatus = (booking_id, currentStatus) => {
        const nextStatus = currentStatus.toLowerCase() === 'completed' ? 'Cancelled' : 'Completed';
        showAlert(
            'Cập nhật trạng thái',
            `Bạn có chắc muốn chuyển đơn #${booking_id} sang "${nextStatus}"?`,
            'warning',
            async () => {
                try {
                    await api.put(`/api/bookings/update/${booking_id}/status`, { status: nextStatus });
                    closeAlert();
                    fetchBookings(pagination.page, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Cập nhật trạng thái thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('UPDATE STATUS ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', 'Không thể cập nhật trạng thái.', 'error');
                    }, 100);
                }
            },
            closeAlert
        );
    };

    // ------------------------------------------------------
    // HANDLE DELETE
    // ------------------------------------------------------
    const handleDelete = (booking_id, memo) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa đơn "${memo}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/bookings/delete/${booking_id}`);
                    closeAlert();
                    const currentPage = pagination.page;
                    const newPage = bookings.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchBookings(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa đơn hàng thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE BOOKING ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', 'Không thể xóa đơn hàng.', 'error');
                    }, 100);
                }
            },
            closeAlert
        );
    };

    // ------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------
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
                <span className={`status-badge ${row.status?.toLowerCase()}`}>
                    {row.status}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
                <div className="admin-table-actions">
                    <button
                        className="admin-action-btn view-btn"
                        onClick={() => handleViewDetail(row.booking_id)}
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className={`admin-action-btn ${row.status?.toLowerCase() === 'completed' ? 'delete-btn' : 'edit-btn'}`}
                        onClick={() => handleUpdateStatus(row.booking_id, row.status)}
                    >
                        {row.status?.toLowerCase() === 'completed'
                            ? <XCircle size={16} />
                            : <CheckCircle size={16} />
                        }
                    </button>
                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() => handleDelete(row.booking_id, row.memo)}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    // ------------------------------------------------------
    // RENDER DETAIL DATA
    // ------------------------------------------------------
    const seats = bookingDetails.filter(item => item.seat_id !== null);
    const foods = bookingDetails.filter(item => item.seat_id === null);

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
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
                    <>
                        <AdminTable columns={columns} data={bookings} />
                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                DETAIL MODAL
            ================================================== */}
            <AdminModal
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`CHI TIẾT ĐƠN HÀNG #${selectedBooking?.booking_id || ''}`}
                type="info"
                size="lg"
            >
                {selectedBooking && (
                    <div className="booking-detail-wrapper">
                        <div className="detail-content-vertical">
                            {/* 1. Khách hàng */}
                            <section className="detail-section">
                                <h3 className="section-title">
                                    <User size={18} /> Thông tin khách hàng
                                </h3>
                                <div className="section-body">
                                    <p><strong>Họ tên:</strong> {selectedBooking.full_name}</p>
                                    <p><strong>Email:</strong> {selectedBooking.email}</p>
                                </div>
                            </section>

                            {/* 2. Suất chiếu */}
                            <section className="detail-section">
                                <h3 className="section-title">
                                    <Film size={18} /> Thông tin suất chiếu
                                </h3>
                                <div className="section-body">
                                    <p className="movie-name-highlight">{selectedBooking.movie_name}</p>
                                    <p>
                                        <MapPin size={14} /> {selectedBooking.cinema_name} - {selectedBooking.room_name}
                                    </p>
                                    {selectedBooking.start_time ? (
                                        <p className="time-highlight">
                                            <Calendar size={14} />
                                            Ngày: {new Date(selectedBooking.start_time).toLocaleDateString('vi-VN')}
                                            &nbsp;|&nbsp;
                                            Giờ: {new Date(selectedBooking.start_time).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    ) : (
                                        <p className="no-data">Chưa có thông tin suất chiếu.</p>
                                    )}
                                </div>
                            </section>

                            {/* 3. Ghế */}
                            <section className="detail-section">
                                <h3 className="section-title">
                                    <Ticket size={18} /> Danh sách ghế ({seats.length})
                                </h3>
                                <div className="seat-list-inline">
                                    {seats.map(s => (
                                        <span key={s.booking_detail_id || s.ticket_id} className="seat-badge">
                                            {s.seat_row}{s.seat_number} ({s.seat_type})
                                        </span>
                                    ))}
                                </div>
                            </section>

                            {/* 4. Dịch vụ */}
                            <section className="detail-section">
                                <h3 className="section-title">
                                    <Popcorn size={18} /> Dịch vụ bắp nước
                                </h3>
                                <div className="food-list-vertical">
                                    {foods.length > 0 ? (
                                        foods.map(f => (
                                            <div key={f.booking_detail_id || f.id} className="food-item-line">
                                                <span>
                                                    {f.item_name} <small>x{f.quantity}</small>
                                                </span>
                                                <span className="text-bold">
                                                    {Number(f.subtotal).toLocaleString()}đ
                                                </span>
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
                                    <span className="amount-highlight">
                                        {Number(selectedBooking.total_amount).toLocaleString()}đ
                                    </span>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL (giống UserPage)
            ================================================== */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type || 'default'}
                size="sm"
                onConfirm={alertModal.onConfirm || closeAlert}
                onCancel={alertModal.onCancel || closeAlert}
                confirmText="Xác nhận"
                cancelText="Hủy"
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};

export default BookingPage;