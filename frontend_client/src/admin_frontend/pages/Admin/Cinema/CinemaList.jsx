import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Tv, 
    Plus, 
    Edit, 
    Trash2, 
    Loader2, 
    MapPin, 
    Navigation,
    Building2
} from 'lucide-react'; 
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css'; 

const CinemaList = () => {
    const [cinemas, setCinemas] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Cấu hình Modal đồng bộ hệ thống
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

    const fetchCinemas = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/cinemas');
            setCinemas(res.data);
        } catch (err) {
            showModal('error', 'Lỗi hệ thống', 'Không thể tải danh sách rạp chiếu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchCinemas(); 
    }, []);

    const handleDelete = (cinema_id, cinema_name) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc chắn muốn xóa rạp "${cinema_name}" không?`,
            async () => {
                try {
                    await axios.delete(`https://api.quangdungcinema.id.vn/api/cinemas/delete/${cinema_id}`);
                    setCinemas(cinemas.filter(c => c.cinema_id !== cinema_id)); 
                    showModal('success', 'Thành công', 'Đã xóa rạp chiếu thành công!');
                } catch (err) {
                    showModal('error', 'Lỗi xóa', 'Không thể xóa rạp này. Vui lòng kiểm tra lại!');
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
                    <Tv size={24} className="header-icon" />
                    QUẢN LÝ RẠP CHIẾU
                </h2>
                <button 
                    className="btn-add-user"
                    onClick={() => navigate('/cinemas/add')}
                >
                    <Plus size={18} /> Thêm Rạp Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang tải dữ liệu rạp...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>ID</th>
                            <th>Tên Rạp</th>
                            <th><MapPin size={14} className="th-icon" /> Địa chỉ</th>
                            <th><Building2 size={14} className="th-icon" /> Thành phố</th>
                            <th><Navigation size={14} className="th-icon" /> Slug</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cinemas.length > 0 ? (
                            cinemas.map(c => (
                                <tr key={c.cinema_id}>
                                    <td><strong>#{c.cinema_id}</strong></td>
                                    <td>
                                        <div className="movie-title-main">{c.cinema_name}</div>
                                    </td>
                                    <td className="movie-director-sub" style={{ maxWidth: '300px' }}>
                                        {c.address}
                                    </td>
                                    <td>
                                        <span className="status-badge used">{c.city}</span>
                                    </td>
                                    <td className="ticket-code">{c.slug}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => navigate(`/cinemas/update/${c.cinema_id}`)}
                                                title="Sửa rạp"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(c.cinema_id, c.cinema_name)}
                                                title="Xóa rạp"
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
                                    Chưa có rạp chiếu nào trong danh sách.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CinemaList;