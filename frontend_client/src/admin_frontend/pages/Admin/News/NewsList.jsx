import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Newspaper, 
    Edit, 
    Trash2, 
    Loader2, 
    Calendar, 
    Eye, 
    Plus,
    FileText,
    ExternalLink
} from 'lucide-react';
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css'; 

const NewsList = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

    const fetchNews = async () => {
        setLoading(true);
        try {
            // Sử dụng API news mà chúng ta đã viết
            const res = await axios.get('https://webcinema-zb8z.onrender.com/api/news');
            setNews(res.data);
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách tin tức!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNews(); }, []);

    const handleDelete = (news_id, title) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa bài viết: "${title}"? Hành động này không thể hoàn tác.`,
            async () => {
                try {
                    await axios.delete(`https://webcinema-zb8z.onrender.com/api/news/${news_id}`);
                    setNews(news.filter(n => n.news_id !== news_id));
                    showModal('success', 'Thành công', 'Đã xóa bài viết khỏi danh sách!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa bài viết. Vui lòng thử lại!');
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
                    <Newspaper size={24} className="header-icon" />
                    QUẢN LÝ DANH SÁCH TIN TỨC
                </h2>
                <button 
                    className="btn-add-user" 
                    onClick={() => navigate('/admin/news/add')}
                >
                    <Plus size={18} /> Thêm Tin Tức Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang lấy danh sách tin tức...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="th-poster">Hình ảnh</th>
                            {/* <th>Tiêu đề bài viết</th> */}
                            {/* <th>Đường dẫn (Slug)</th> */}
                            <th><Eye size={14} /> Lượt xem</th>
                            <th><Calendar size={14} /> Ngày đăng</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {news.length > 0 ? (
                            news.map(n => (
                                <tr key={n.news_id}>
                                    <td className="td-poster">
                                        <img 
                                            // Tương tự MovieList, dùng chung folder uploads
                                            src={`https://webcinema-zb8z.onrender.com/uploads/news/${n.image_url}`}
                                            alt={n.title}
                                            className="movie-poster-img"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </td>
                                    {/* <td>
                                        <div className="movie-title-main" style={{ fontSize: '14px', fontWeight: '600' }}>
                                            {n.title}
                                        </div>
                                      
                                        <div className="movie-director-sub" style={{ fontSize: '12px', color: '#666' }}>
                                            {n.short_content}
                                        </div>
                                    </td> */}
                                    {/* <td>
                                        <code style={{ fontSize: '12px', color: '#007bff' }}>/{n.slug}</code>
                                    </td> */}
                                    <td>
                                        <span className="status-badge used" style={{ backgroundColor: '#f8f9fa', color: '#333' }}>
                                            {n.views.toLocaleString()}
                                        </span>
                                    </td>
                                    <td>{new Date(n.created_at).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-edit"
                                                onClick={() => navigate(`/admin/news/update/${n.news_id}`)}
                                                title="Sửa bài viết"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(n.news_id, n.title)}
                                                title="Xóa bài viết"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button 
                                                className="btn-view"
                                                onClick={() => window.open(`/news/${n.slug}`, '_blank')}
                                                title="Xem trên web"
                                                style={{ border: 'none', background: 'none', color: '#17a2b8', padding: '5px' }}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="empty-row">
                                    <FileText size={40} className="empty-icon" /><br/>
                                    Chưa có bài viết nào được đăng.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default NewsList;