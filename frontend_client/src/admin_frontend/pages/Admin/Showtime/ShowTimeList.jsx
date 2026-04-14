import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Edit, Trash2, Loader2, Film, MapPin, Clock } from 'lucide-react';
import Modal from '../../../components/Modal';
// Sử dụng chung style để đảm bảo giao diện đồng bộ
import '../../../styles/UserList.css'; 

const ShowTimeList = () => {
    const [showtimes, setShowtimes] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // ==========================================
    // 1. QUẢN LÝ MODAL (Đồng bộ với UserList)
    // ==========================================
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

    // ==========================================
    // 2. LẤY DỮ LIỆU TỪ API
    // ==========================================
    const fetchShowtimes = async () => {
        setLoading(true);
        try {
            // Gọi endpoint GET /api/showtimes để lấy toàn bộ danh sách kèm JOIN thông tin
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/showtimes');
            setShowtimes(res.data);
        } catch (err) {
            showModal('error', 'LỖI HỆ THỐNG', 'Không thể kết nối đến máy chủ để tải lịch chiếu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShowtimes(); }, []);

    // ==========================================
    // 3. XỬ LÝ XÓA SUẤT CHIẾU
    // ==========================================
    const handleDelete = (showtime_id, movie_title) => {
        showModal(
            'confirm',
            'XÁC NHẬN XÓA',
            `Bạn có chắc muốn xóa suất chiếu phim "${movie_title}" (ID: #${showtime_id})? Hệ thống sẽ không cho phép xóa nếu đã có người mua vé.`,
            async () => {
                try {
                    await axios.delete(`https://api.quangdungcinema.id.vn/api/showtimes/${showtime_id}`);
                    setShowtimes(showtimes.filter(s => s.showtime_id !== showtime_id));
                    showModal('success', 'THÀNH CÔNG', 'Đã gỡ suất chiếu khỏi hệ thống.');
                } catch (err) {
                    const errorMsg = err.response?.data?.error || 'Lỗi không xác định khi xóa.';
                    showModal('error', 'THẤT BẠI', errorMsg);
                }
            }
        );
    };

    // ==========================================
    // 4. HELPERS
    // ==========================================
    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('vi-VN'),
            time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
    };

    return (
        <div className="user-list-container">
            <Modal 
                {...modalConfig}
            />

            <div className="user-list-header">
                <h2>
                    <Calendar size={24} className="header-icon" />
                    QUẢN LÝ LỊCH CHIẾU
                </h2>
                <button 
                    className="btn-add-user"
                    onClick={() => navigate('/admin/showtimes/add')}
                >
                    <Plus size={18} /> Thêm Suất Chiếu
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang tải dữ liệu...
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Thông tin Phim</th>
                                <th>Địa điểm</th>
                                <th>Thời gian chiếu</th>
                                <th className="th-actions">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {showtimes.length > 0 ? (
                                showtimes.map(s => {
                                    const { date, time } = formatDateTime(s.start_time);
                                    return (
                                        <tr key={s.showtime_id}>
                                            <td className="text-center"><strong>#{s.showtime_id}</strong></td>
                                            <td>
                                                <div className="user-info-cell">
                                                    <div className="user-avatar-mini" style={{background: '#e0f2fe', color: '#0284c7'}}>
                                                        <Film size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="user-full-name">{s.title}</div>
                                                        <div className="user-email">{s.duration} phút</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex-column">
                                                    <span style={{fontSize: '14px', fontWeight: '500'}}>
                                                        <MapPin size={12} style={{marginRight: '4px'}} />
                                                        {s.cinema_name}
                                                    </span>
                                                    <span className="role-badge customer" style={{marginTop: '4px', width: 'fit-content'}}>
                                                        {s.room_name} ({s.room_type})
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex-column">
                                                    <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                                        <Calendar size={12} /> {date}
                                                    </div>
                                                    <div className="status-badge pending" style={{marginTop: '4px'}}>
                                                        <Clock size={12} style={{marginRight: '4px'}} /> {time}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="btn-action-edit"
                                                        onClick={() => navigate(`/admin/showtimes/update/${s.showtime_id}`)}
                                                        title="Chỉnh sửa suất chiếu"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button 
                                                        className="btn-delete"
                                                        onClick={() => handleDelete(s.showtime_id, s.title)}
                                                        title="Xóa suất chiếu"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-row">
                                        Hiện chưa có suất chiếu nào được tạo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ShowTimeList;