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
    ExternalLink,
    Heart
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
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/news');
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
                    await axios.delete(`https://api.quangdungcinema.id.vn/api/news/${news_id}`);
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
                    onClick={() => navigate('/news/add')}
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
                            <th>Tiêu đề bài viết</th>
                            <th><Eye size={14} /> Lượt xem / <Heart size={14} /> Thích</th>
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
                                            src={`https://api.quangdungcinema.id.vn/uploads/news/${n.image_url}`}
                                            alt={n.title}
                                            className="movie-poster-img"
                                            style={{ objectFit: 'cover', borderRadius: '4px' }}
                                        />
                                    </td>
                                    {/* CHỈ HIỂN THỊ TIÊU ĐỀ TẠI ĐÂY */}
                                    <td style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '15px', color: '#333' }}>
                                        {n.title}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                            <span className="status-badge" style={{ backgroundColor: '#e9ecef', color: '#495057', fontSize: '11px', width: 'fit-content' }}>
                                                <Eye size={10} /> {n.views?.toLocaleString()}
                                            </span>
                                            <span className="status-badge" style={{ backgroundColor: '#fff0f3', color: '#ff4d6d', fontSize: '11px', width: 'fit-content' }}>
                                                <Heart size={10} /> {n.likes?.toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {new Date(n.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => navigate(`/news/update/${n.news_id}`)}
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
                                <td colSpan="5" className="empty-row">
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