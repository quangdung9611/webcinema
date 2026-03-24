import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Monitor, Plus, Edit, Trash2, Loader2, Layout, MapPin, Layers } from 'lucide-react'; // Thêm icon Layers
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css';

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // State điều khiển Modal
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

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://webcinema-zb8z.onrender.com/api/rooms');
            setRooms(res.data);
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách phòng chiếu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchRooms(); 
    }, []);

    const handleDelete = (room_id, room_name) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc chắn muốn xóa phòng "${room_name}" (ID: #${room_id})? Hành động này không thể hoàn tác.`,
            async () => {
                try {
                    await axios.delete(`https://webcinema-zb8z.onrender.com/api/rooms/delete/${room_id}`);
                    setRooms(rooms.filter(r => r.room_id !== room_id)); 
                    showModal('success', 'Thành công', 'Đã xóa phòng chiếu thành công!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa phòng (có thể đang có suất chiếu hoặc ghế).');
                }
            }
        );
    };

    // Hàm render Badge cho Loại phòng để giao diện chuyên nghiệp hơn
    const renderTypeBadge = (type) => {
        const colors = {
            '2D': '#6c757d',
            '3D': '#0d6efd',
            'IMAX': '#6610f2'
        };
        return (
            <span style={{ 
                backgroundColor: colors[type] || '#6c757d', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                fontSize: '12px',
                fontWeight: 'bold'
            }}>
                {type}
            </span>
        );
    };

    return (
        <div className="user-list-container">
            <Modal 
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            <div className="user-list-header">
                <h2>
                    <Monitor size={24} className="header-icon" />
                    QUẢN LÝ PHÒNG CHIẾU
                </h2>
                <button 
                    className="btn-add-user" 
                    onClick={() => navigate('/admin/rooms/add')}
                >
                    <Plus size={18} /> Thêm Phòng Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang tải danh sách...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên Phòng</th>
                            <th><Layers size={14} className="th-icon" /> Loại Phòng</th> {/* BỔ SUNG CỘT MỚI */}
                            <th><Layout size={14} className="th-icon" /> Thuộc Rạp</th>
                            <th><MapPin size={14} className="th-icon" /> Thành Phố</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rooms.length > 0 ? (
                            rooms.map(r => (
                                <tr key={r.room_id}>
                                    <td><strong>#{r.room_id}</strong></td>
                                    <td className="ticket-code">{r.room_name}</td>
                                    <td>{renderTypeBadge(r.room_type)}</td> {/* HIỂN THỊ ROOM_TYPE */}
                                    <td>{r.cinema_name}</td>
                                    <td>{r.city}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => navigate(`/admin/rooms/update/${r.room_id}`)}
                                                title="Sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(r.room_id, r.room_name)}
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="empty-row"> {/* TĂNG COLSPAN LÊN 6 */}
                                    Không tìm thấy phòng chiếu nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default RoomList;