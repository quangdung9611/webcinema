import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, 
    User, 
    Film, 
    Ticket, 
    Popcorn, 
    Loader2, 
    Calendar, 
    MapPin
} from 'lucide-react';
import Modal from '../../../components/Modal'; 
import '../../../styles/BookingDetail.css'; 

const BookingDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const showModal = (type, title, message, onConfirm = closeModal) => {
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: () => { onConfirm(); closeModal(); },
        });
    };

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/bookings/detail/${id}`);
            setData(res.data);
        } catch (err) {
            showModal('error', 'Lỗi hệ thống', 'Không thể tải thông tin đơn hàng này.', () => navigate(-1));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 className="spin-icon" size={40} />
                <p>Đang tải đơn hàng #{id}...</p>
            </div>
        );
    }

    if (!data) return null;

    const { booking, details } = data;
    const seats = details.filter(item => item.seat_id !== null);
    const foods = details.filter(item => item.seat_id === null);

    return (
        <div className="booking-detail-wrapper">
            <Modal {...modalConfig} />

            <div className="booking-detail-container">
                {/* Header */}
                <div className="detail-header">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    <div className={`status-tag ${booking.status.toLowerCase()}`}>
                        {booking.status}
                    </div>
                </div>

                <div className="detail-title-section">
                    <h2>CHI TIẾT ĐƠN HÀNG <span className="text-id">#{id}</span></h2>
                </div>

                {/* Nội dung nằm dọc */}
                <div className="detail-content-vertical">
                    
                    {/* 1. Khách hàng */}
                    <section className="detail-section">
                        <h3 className="section-title"><User size={18} /> Thông tin khách hàng</h3>
                        <div className="section-body">
                            <p><strong>Họ tên:</strong> {booking.full_name}</p>
                            <p><strong>Số điện thoại:</strong> {booking.phone}</p>
                            <p><strong>Email:</strong> {booking.email}</p>
                        </div>
                    </section>

                    {/* 2. Suất chiếu */}
                    <section className="detail-section">
                        <h3 className="section-title"><Film size={18} /> Thông tin suất chiếu</h3>
                        <div className="section-body">
                            <p className="movie-name-highlight">{booking.movie_name}</p>
                            <p><MapPin size={14} /> {booking.cinema_name} - {booking.room_name}</p>
                            <p className="time-highlight"><Calendar size={14} /> {booking.show_time}</p>
                        </div>
                    </section>

                    {/* 3. Ghế ngồi */}
                    <section className="detail-section">
                        <h3 className="section-title"><Ticket size={18} /> Danh sách ghế ({seats.length})</h3>
                        <div className="seat-list-inline">
                            {seats.map(s => (
                                <span key={s.booking_detail_id} className="seat-badge">
                                    {s.seat_row}{s.seat_number} ({s.seat_type})
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* 4. Dịch vụ */}
                    <section className="detail-section">
                        <h3 className="section-title"><Popcorn size={18} /> Dịch vụ bắp nước</h3>
                        <div className="food-list-vertical">
                            {foods.length > 0 ? (
                                foods.map(f => (
                                    <div key={f.booking_detail_id} className="food-item-line">
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
                            <span className="memo-text">{booking.memo || 'N/A'}</span>
                        </div>
                        <div className="footer-row main-total">
                            <span>TỔNG THANH TOÁN</span>
                            <span className="amount-highlight">{Number(booking.total_amount).toLocaleString()}đ</span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default BookingDetail;