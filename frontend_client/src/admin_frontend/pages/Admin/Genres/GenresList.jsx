import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Theater, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import Modal from '../../../components/Modal'; 
import '../../../styles/UserList.css'; 

const GenresList = () => {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Cấu hình Modal đồng bộ
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: null
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const openModal = (type, title, message, onConfirm = closeModal, onCancel = null) => {
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: () => { onConfirm(); closeModal(); },
            onCancel: onCancel ? () => { onCancel(); closeModal(); } : null
        });
    };

    const fetchGenres = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/genres');
            setGenres(res.data);
        } catch (err) {
            openModal('error', 'Lỗi hệ thống', 'Không thể tải danh sách thể loại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchGenres(); 
    }, []);

    const handleDelete = (genre_id, genre_name) => {
        openModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc chắn muốn xóa thể loại "${genre_name}" không?`,
            async () => {
                try {
                    await axios.delete(`https://api.quangdungcinema.id.vn/api/genres/delete/${genre_id}`);
                    setGenres(genres.filter(g => g.genre_id !== genre_id)); 
                    openModal('success', 'Thành công', 'Đã xóa thể loại thành công!');
                } catch (err) {
                    openModal('error', 'Lỗi xóa', 'Không thể xóa thể loại này. Vui lòng thử lại sau.');
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
                    <Theater size={24} className="header-icon" /> 
                    QUẢN LÝ THỂ LOẠI
                </h2>
                <button 
                    className="btn-add-user"
                    onClick={() => navigate('/admin/genres/add')}
                >
                    <Plus size={18} /> Thêm Thể Loại Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang tải dữ liệu...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>ID</th>
                            <th>Tên thể loại</th>
                            <th>Slug (Đường dẫn)</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {genres.length > 0 ? (
                            genres.map(g => (
                                <tr key={g.genre_id}>
                                    <td><strong>#{g.genre_id}</strong></td>
                                    <td className="movie-title-main">{g.genre_name}</td>
                                    <td className="ticket-code">{g.slug}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => navigate(`/admin/genres/update/${g.genre_id}`)}
                                                title="Sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(g.genre_id, g.genre_name)}
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
                                <td colSpan="4" className="empty-row">
                                    Không có dữ liệu thể loại.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default GenresList;