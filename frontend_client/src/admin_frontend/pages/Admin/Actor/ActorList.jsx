import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    UserPlus, 
    Edit, 
    Trash2, 
    Loader2, 
    Globe, 
    Calendar, 
    Smile 
} from 'lucide-react';
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css'; 

const ActorList = () => {
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // State điều khiển Modal đồng bộ theo hệ thống
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

    const fetchActors = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/actors');
            setActors(res.data);
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách diễn viên!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchActors(); }, []);

    const handleDelete = (actor_id, name) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc muốn xóa diễn viên: "${name}"?`,
            async () => {
                try {
                    const token = sessionStorage.getItem('usertoken');
                    await axios.delete(`https://api.quangdungcinema.id.vn/api/actors/delete/${actor_id}`, {
                        data: { token: token } 
                    });
                    setActors(actors.filter(a => a.actor_id !== actor_id));
                    showModal('success', 'Thành công', 'Đã xóa diễn viên khỏi danh sách!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa diễn viên. Vui lòng thử lại!');
                }
            }
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
                    <Smile size={24} className="header-icon" />
                    QUẢN LÝ DANH SÁCH DIỄN VIÊN
                </h2>
                <button 
                    className="btn-add-user" 
                    onClick={() => navigate('/admin/actors/add')}
                >
                    <UserPlus size={18} /> Thêm Diễn Viên Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang lấy danh sách diễn viên...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="th-poster">Ảnh</th>
                            <th>Họ tên</th>
                            <th>Giới tính</th>
                            <th><Globe size={14} /> Quốc tịch</th>
                            <th><Calendar size={14} /> Ngày sinh</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {actors.length > 0 ? (
                            actors.map(a => (
                                <tr key={a.actor_id}>
                                    <td className="td-poster">
                                        <img 
                                            src={`https://api.quangdungcinema.id.vn/uploads/actors/${a.avatar}`}
                                            alt={a.name}
                                            className="movie-poster-img"
                                        />
                                    </td>
                                    <td>
                                        <div className="movie-title-main">{a.name}</div>
                                        <div className="movie-director-sub">{a.slug}</div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${a.gender === 'Nam' ? 'used' : 'pending'}`}>
                                            {a.gender}
                                        </span>
                                    </td>
                                    <td>{a.nationality}</td>
                                    <td>
                                        {a.birthday ? new Date(a.birthday).toLocaleDateString('vi-VN') : '---'}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => navigate(`/admin/actors/update/${a.actor_id}`)}
                                                title="Sửa diễn viên"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(a.actor_id, a.name)}
                                                title="Xóa diễn viên"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="empty-row">
                                    Chưa có diễn viên nào trong danh sách.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ActorList;