import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Film, 
    Clapperboard, 
    Edit, 
    Trash2, 
    Loader2, 
    Calendar, 
    Clock, 
    Plus,
    PlayCircle 
} from 'lucide-react';
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css'; 

const MovieList = () => {
    const [movies, setMovies] = useState([]);
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

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/movies');
            setMovies(res.data);
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách phim!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMovies(); }, []);

    // --- HÀM XỬ LÝ TRAILER (ĐÃ TỐI ƯU ĐỂ HIỂN THỊ CHUẨN) ---
    const handlePreviewTrailer = (movie) => {
        if (!movie.trailer_url) {
            showModal('info', 'Thông báo', `Phim "${movie.title}" chưa có link trailer.`);
            return;
        }

        // 1. Hàm bóc tách ID video YouTube mạnh mẽ hơn (hỗ trợ cả shorts, watch, share link)
        const getYoutubeID = (url) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        };

        const videoId = getYoutubeID(movie.trailer_url);

        // 2. Kiểm tra nếu link không hợp lệ
        if (!videoId) {
            showModal('error', 'Lỗi Link Video', 'Định dạng link YouTube không hợp lệ hoặc không được hỗ trợ!');
            return;
        }

        // 3. Tạo URL nhúng chuẩn với tham số rel=0 để không hiện video gợi ý khác
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

        showModal(
            'info', 
            `Trailer: ${movie.title}`, 
            // Container bọc iframe để đảm bảo video luôn đúng tỷ lệ 16:9 và không bị ẩn bởi CSS Modal
            <div style={{ width: '100%', minWidth: '300px' }}>
                <div style={{ 
                    position: 'relative', 
                    paddingBottom: '56.25%', 
                    height: 0, 
                    overflow: 'hidden', 
                    backgroundColor: '#000', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    <iframe 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        src={embedUrl}
                        title={movie.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        );
    };

    const handleDelete = (movie_id, title) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa phim: "${title}"? Dữ liệu liên quan sẽ bị ảnh hưởng.`,
            async () => {
                try {
                    await axios.delete(`https://api.quangdungcinema.id.vn/api/movies/${movie_id}`);
                    setMovies(movies.filter(m => m.movie_id !== movie_id));
                    showModal('success', 'Thành công', 'Đã xóa phim khỏi danh sách!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa phim. Vui lòng thử lại!');
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
                    <Film size={24} className="header-icon" />
                    QUẢN LÝ DANH SÁCH PHIM
                </h2>
                <button 
                    className="btn-add-user" 
                    onClick={() => navigate('/movies/add')}
                >
                    <Plus size={18} /> Thêm Phim Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang lấy danh sách phim...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="th-poster">Poster</th>
                            <th>Tiêu đề phim</th>
                            <th className="th-age">Độ tuổi</th>
                            <th><Clock size={14} /> Thời lượng</th>
                            <th><Calendar size={14} /> Ngày chiếu</th>
                            <th>Trạng thái</th>
                            <th>Trailer</th> 
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movies.length > 0 ? (
                            movies.map(m => (
                                <tr key={m.movie_id}>
                                    <td className="td-poster">
                                        <img 
                                            src={`https://api.quangdungcinema.id.vn/uploads/posters/${m.poster_url}`}
                                            alt={m.title}
                                            className="movie-poster-img"
                                        />
                                    </td>
                                    <td>
                                        <div className="movie-title-main">{m.title}</div>
                                        <div className="movie-director-sub">ĐD: {m.director}</div>
                                    </td>
                                    <td>
                                        <span className={`badge-age ${m.age_rating >= 18 ? 'c18' : 'p-rating'}`}>
                                            {m.age_rating === 0 ? 'P' : `${m.age_rating}+`}
                                        </span>
                                    </td>
                                    <td>{m.duration} phút</td>
                                    <td>{new Date(m.release_date).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <span className={`status-badge ${m.status === 'Đang chiếu' ? 'used' : 'pending'}`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td>
                                        {m.trailer_url ? (
                                            <button 
                                                className="btn-view-trailer" 
                                                onClick={() => handlePreviewTrailer(m)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e74c3c' }}
                                                title="Xem Trailer"
                                            >
                                                <PlayCircle size={24} />
                                            </button>
                                        ) : (
                                            <span style={{ color: '#ccc', fontSize: '12px', fontStyle: 'italic' }}>Chưa có</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-action-edit"
                                                onClick={() => navigate(`/movies/update/${m.movie_id}`)}
                                                title="Sửa phim"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(m.movie_id, m.title)}
                                                title="Xóa phim"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="empty-row">
                                    <Clapperboard size={40} className="empty-icon" /><br/>
                                    Chưa có phim nào trong danh sách.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default MovieList;