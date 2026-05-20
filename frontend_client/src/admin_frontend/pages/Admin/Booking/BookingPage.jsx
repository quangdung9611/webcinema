import React, {
    useEffect,
    useState
} from 'react';

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

const BOOKING_API =
    'https://api.quangdungcinema.id.vn/api/bookings';

const BookingPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [bookings, setBookings] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [selectedBooking, setSelectedBooking] =
        useState(null);

    const [bookingDetails, setBookingDetails] =
        useState([]);

    const [isDetailOpen, setIsDetailOpen] =
        useState(false);

    const [alertModal, setAlertModal] =
        useState({
            open: false,
            title: '',
            message: '',
            onConfirm: null,
            onCancel: null
        });

    /* =====================================================
        ALERT MODAL
    ===================================================== */

    const showAlert = (
        title,
        message,
        onConfirm = null,
        onCancel = null
    ) => {

        setAlertModal({
            open: true,
            title,
            message,
            onConfirm,
            onCancel
        });

    };

    const closeAlert = () => {

        setAlertModal(prev => ({
            ...prev,
            open: false
        }));

    };

    /* =====================================================
        FETCH BOOKINGS
    ===================================================== */

    const fetchBookings = async () => {

        setLoading(true);

        try {

            const res = await axios.get(
                BOOKING_API
            );

            setBookings(
                res.data.data || []
            );

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách đơn hàng.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchBookings();

    }, []);

    /* =====================================================
        VIEW DETAIL
    ===================================================== */

    const handleViewDetail = async (
        booking_id
    ) => {

        try {

            setLoading(true);

            const res = await axios.get(
                `${BOOKING_API}/detail/${booking_id}`
            );

            setSelectedBooking(
                res.data.booking
            );

            setBookingDetails(
                res.data.details || []
            );

            setIsDetailOpen(true);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải chi tiết đơn hàng.'
            );

        } finally {

            setLoading(false);

        }

    };

    /* =====================================================
        UPDATE STATUS
    ===================================================== */

    const handleUpdateStatus = (
        booking_id,
        currentStatus
    ) => {

        const nextStatus =
            currentStatus.toLowerCase() ===
            'completed'
                ? 'Cancelled'
                : 'Completed';

        showAlert(
            'Cập nhật trạng thái',
            `Bạn có chắc muốn chuyển đơn #${booking_id} sang "${nextStatus}"?`,

            async () => {

                try {

                    await axios.put(
                        `${BOOKING_API}/update/${booking_id}/status`,
                        {
                            status: nextStatus
                        }
                    );

                    closeAlert();

                    fetchBookings();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể cập nhật trạng thái.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        DELETE
    ===================================================== */

    const handleDelete = (
        booking_id,
        memo
    ) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa đơn "${memo}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${BOOKING_API}/delete/${booking_id}`
                    );

                    closeAlert();

                    fetchBookings();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể xóa đơn hàng.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER
    ===================================================== */

    const filteredBookings =
        bookings.filter(booking => {

            const keyword =
                search.toLowerCase();

            return (

                booking.memo
                    ?.toLowerCase()
                    .includes(keyword) ||

                booking.customer_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                booking.customer_email
                    ?.toLowerCase()
                    .includes(keyword)

            );

        });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'ID',
            key: 'booking_id',

            render: (row) => (

                <strong>
                    #{row.booking_id}
                </strong>

            )
        },

        {
            title: 'Mã đơn',
            key: 'memo',

            render: (row) => (

                <div>

                    <div
                        style={{
                            fontWeight: '700',
                            color: '#f97316'
                        }}
                    >
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

                    <div
                        style={{
                            fontWeight: '600'
                        }}
                    >
                        {row.customer_name}
                    </div>

                    <small
                        style={{
                            color: '#64748b'
                        }}
                    >
                        {row.customer_email}
                    </small>

                </div>

            )
        },

        {
            title: 'Tổng tiền',
            key: 'total_amount',

            render: (row) => (

                <span
                    className="status-badge"
                >
                    {Number(
                        row.total_amount
                    ).toLocaleString()}
                    đ
                </span>

            )
        },

        {
            title: 'Trạng thái',
            key: 'status',

            render: (row) => (

                <span
                    className={`status-badge ${row.status.toLowerCase()}`}
                >
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
                        onClick={() =>
                            handleViewDetail(
                                row.booking_id
                            )
                        }
                    >

                        <Eye size={16} />

                    </button>

                    <button
                        className={`admin-action-btn ${
                            row.status.toLowerCase() ===
                            'completed'
                                ? 'delete-btn'
                                : 'edit-btn'
                        }`}
                        onClick={() =>
                            handleUpdateStatus(
                                row.booking_id,
                                row.status
                            )
                        }
                    >

                        {
                            row.status.toLowerCase() ===
                            'completed'
                                ? (
                                    <XCircle size={16} />
                                )
                                : (
                                    <CheckCircle size={16} />
                                )
                        }

                    </button>

                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(
                                row.booking_id,
                                row.memo
                            )
                        }
                    >

                        <Trash2 size={16} />

                    </button>

                </div>

            )
        }

    ];

    /* =====================================================
        DETAIL DATA
    ===================================================== */

    const seats =
        bookingDetails.filter(
            item => item.seat_id !== null
        );

    const foods =
        bookingDetails.filter(
            item => item.seat_id === null
        );

    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <>

            <AdminPage

                title="Quản lý đơn hàng"

                subtitle="Quản lý toàn bộ booking trong hệ thống"

                icon={
                    <ClipboardList size={30} />
                }

                searchValue={search}

                onSearchChange={setSearch}

            >

                {
                    loading ? (

                        <div className="admin-loading">

                            <Loader2
                                size={32}
                                className="spin-icon"
                            />

                            <span>
                                Đang tải dữ liệu...
                            </span>

                        </div>

                    ) : (

                        <AdminTable
                            columns={columns}
                            data={filteredBookings}
                        />

                    )
                }

            </AdminPage>

            {/* =============================================
                DETAIL MODAL
            ============================================= */}

            <AdminModal
                open={isDetailOpen}
                onClose={() =>
                    setIsDetailOpen(false)
                }
                title={`Chi tiết đơn hàng #${selectedBooking?.booking_id || ''}`}
            >

                {
                    selectedBooking && (

                        <div className="booking-detail-wrapper">

                            {/* ======================
                                KHÁCH HÀNG
                            ====================== */}

                            <section className="detail-section">

                                <h3 className="section-title">

                                    <User size={18} />

                                    Thông tin khách hàng

                                </h3>

                                <div className="section-body">

                                    <p>
                                        <strong>
                                            Họ tên:
                                        </strong>

                                        {' '}

                                        {
                                            selectedBooking.full_name
                                        }
                                    </p>

                                    <p>
                                        <strong>
                                            Số điện thoại:
                                        </strong>

                                        {' '}

                                        {
                                            selectedBooking.phone
                                        }
                                    </p>

                                    <p>
                                        <strong>
                                            Email:
                                        </strong>

                                        {' '}

                                        {
                                            selectedBooking.email
                                        }
                                    </p>

                                </div>

                            </section>

                            {/* ======================
                                SUẤT CHIẾU
                            ====================== */}

                            <section className="detail-section">

                                <h3 className="section-title">

                                    <Film size={18} />

                                    Thông tin suất chiếu

                                </h3>

                                <div className="section-body">

                                    <p
                                        className="movie-name-highlight"
                                    >
                                        {
                                            selectedBooking.movie_name
                                        }
                                    </p>

                                    <p>

                                        <MapPin size={14} />

                                        {' '}

                                        {
                                            selectedBooking.cinema_name
                                        }

                                        {' - '}

                                        {
                                            selectedBooking.room_name
                                        }

                                    </p>

                                    <p
                                        className="time-highlight"
                                    >

                                        <Calendar size={14} />

                                        {' '}

                                        {
                                            selectedBooking.show_time
                                        }

                                    </p>

                                </div>

                            </section>

                            {/* ======================
                                GHẾ
                            ====================== */}

                            <section className="detail-section">

                                <h3 className="section-title">

                                    <Ticket size={18} />

                                    Danh sách ghế

                                </h3>

                                <div
                                    className="seat-list-inline"
                                >

                                    {
                                        seats.map(seat => (

                                            <span
                                                key={
                                                    seat.booking_detail_id
                                                }
                                                className="seat-badge"
                                            >

                                                {
                                                    seat.seat_row
                                                }

                                                {
                                                    seat.seat_number
                                                }

                                                {' '}

                                                (
                                                {
                                                    seat.seat_type
                                                }
                                                )

                                            </span>

                                        ))
                                    }

                                </div>

                            </section>

                            {/* ======================
                                FOOD
                            ====================== */}

                            <section className="detail-section">

                                <h3 className="section-title">

                                    <Popcorn size={18} />

                                    Bắp nước

                                </h3>

                                <div
                                    className="food-list-vertical"
                                >

                                    {
                                        foods.length > 0 ? (

                                            foods.map(food => (

                                                <div
                                                    key={
                                                        food.booking_detail_id
                                                    }
                                                    className="food-item-line"
                                                >

                                                    <span>

                                                        {
                                                            food.item_name
                                                        }

                                                        {' '}

                                                        <small>
                                                            x
                                                            {
                                                                food.quantity
                                                            }
                                                        </small>

                                                    </span>

                                                    <strong>

                                                        {
                                                            Number(
                                                                food.subtotal
                                                            ).toLocaleString()
                                                        }
                                                        đ

                                                    </strong>

                                                </div>

                                            ))

                                        ) : (

                                            <p
                                                className="no-data"
                                            >
                                                Không có dịch vụ.
                                            </p>

                                        )
                                    }

                                </div>

                            </section>

                            {/* ======================
                                TOTAL
                            ====================== */}

                            <section
                                className="detail-section total-card-final"
                            >

                                <div
                                    className="footer-row"
                                >

                                    <span>
                                        Memo:
                                    </span>

                                    <strong>
                                        {
                                            selectedBooking.memo
                                        }
                                    </strong>

                                </div>

                                <div
                                    className="footer-row main-total"
                                >

                                    <span>
                                        TỔNG TIỀN
                                    </span>

                                    <strong
                                        className="amount-highlight"
                                    >

                                        {
                                            Number(
                                                selectedBooking.total_amount
                                            ).toLocaleString()
                                        }
                                        đ

                                    </strong>

                                </div>

                            </section>

                        </div>

                    )
                }

            </AdminModal>

            {/* =============================================
                ALERT MODAL
            ============================================= */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>

                    <div className="admin-alert-actions">

                        {
                            alertModal.onCancel && (

                                <button
                                    className="admin-cancel-btn"
                                    onClick={
                                        alertModal.onCancel
                                    }
                                >
                                    Hủy
                                </button>

                            )
                        }

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm ||
                                closeAlert
                            }
                        >
                            Xác nhận
                        </button>

                    </div>

                </div>

            </AdminModal>

        </>

    );

};

export default BookingPage;