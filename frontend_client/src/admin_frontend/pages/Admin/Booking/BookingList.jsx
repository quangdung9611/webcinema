import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ClipboardList, 
    Eye, 
    Trash2, 
    Loader2, 
    CheckCircle, 
    XCircle
} from 'lucide-react'; 
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css'; 

const BookingList = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: null
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const showModal = (type, title, message, onConfirm = closeModal, onCancel = null) => {
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: () => { onConfirm(); closeModal(); },
            onCancel: onCancel ? () => { onCancel(); closeModal(); } : null
        });
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://webcinema-zb8z.onrender.com/api/bookings');
            setBookings(res.data.data);
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách hóa đơn.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBookings(); }, []);

    const handleViewDetail = async (id) => {
        // Hàm này giờ chỉ để xử lý logic chuyển trang hoặc chuẩn bị dữ liệu
        setLoading(true);
        try {
            // Nếu bạn dùng trang riêng, bạn có thể dùng window.location.href 
            // hoặc điều hướng ở đây mà không cần fetch detail tại list
            window.location.href = `/admin/bookings/${id}`;
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể chuyển hướng đến trang chi tiết.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = (booking_id, currentStatus) => {
        const nextStatus = currentStatus.toLowerCase() === 'completed' ? 'Cancelled' : 'Completed';
        
        showModal(
            'confirm',
            'Cập nhật trạng thái',
            `Quang Dũng muốn chuyển đơn hàng #${booking_id} sang trạng thái "${nextStatus}"?`,
            async () => {
                try {
                    await axios.put(`https://webcinema-zb8z.onrender.com/api/bookings/update/${booking_id}/status`, { status: nextStatus });
                    fetchBookings(); 
                    showModal('success', 'Thành công', 'Đã cập nhật trạng thái đơn hàng!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Không thể cập nhật trạng thái.');
                }
            }
        );
    };

    const handleDelete = (booking_id, memo) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc muốn xóa hóa đơn "${memo}"?`,
            async () => {
                try {
                    await axios.delete(`https://webcinema-zb8z.onrender.com/api/bookings/delete/${booking_id}`);
                    setBookings(bookings.filter(b => b.booking_id !== booking_id));
                    showModal('success', 'Thành công', 'Đã xóa hóa đơn thành công!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa hóa đơn.');
                }
            }
        );
    };

    return (
        <div className="user-list-container">
            <Modal {...modalConfig} />

            <div className="user-list-header">
                <h2>
                    <ClipboardList size={24} className="header-icon" />
                    QUẢN LÝ ĐƠN HÀNG
                </h2>
                <div className="booking-summary">
                    Tổng số đơn: {bookings.length}
                </div>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang tải dữ liệu...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Mã đơn (Memo)</th>
                            <th>Khách hàng</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings && bookings.length > 0 ? (
                            bookings.map(b => (
                                <tr key={b.booking_id}>
                                    <td><strong>#{b.booking_id}</strong></td>
                                    <td className="ticket-code">{b.memo || 'N/A'}</td>
                                    <td>
                                        <div className="customer-info-name">{b.customer_name}</div>
                                        <small className="customer-info-email">{b.customer_email}</small>
                                    </td>
                                    <td className="booking-amount-cell">
                                        {Number(b.total_amount).toLocaleString()}đ
                                    </td>
                                    <td>
                                        <span className={`status-badge ${b.status.toLowerCase()}`}>
                                            {b.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-view"
                                                onClick={() => handleViewDetail(b.booking_id)}
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            
                                            <button 
                                                className={`btn-toggle-status ${b.status.toLowerCase() === 'completed' ? 'to-cancel' : 'to-complete'}`}
                                                onClick={() => handleUpdateStatus(b.booking_id, b.status)}
                                                title="Đổi trạng thái"
                                            >
                                                {b.status.toLowerCase() === 'completed' ? <XCircle size={18}/> : <CheckCircle size={18} />}
                                            </button>

                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(b.booking_id, b.memo)}
                                                title="Xóa hóa đơn"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="empty-row">Không tìm thấy đơn hàng nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default BookingList;