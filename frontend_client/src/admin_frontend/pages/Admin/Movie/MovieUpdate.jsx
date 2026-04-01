import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

// --- HELPERS ---
const generateSlug = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .trim();
};

const MovieUpdate = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT
    const [formData, setFormData] = useState({
        title: '',
        director: '',
        nation: '', // Bổ sung trường quốc gia
        duration: '',
        age_rating: 0,
        release_date: '',
        status: 'Sắp chiếu',
        trailer_url: '', 
        description: ''
    });

    const [oldPoster, setOldPoster] = useState(''); 
    const [newPoster, setNewPoster] = useState(null); 
    const [preview, setPreview] = useState(null); 
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    // 2. EFFECT: LẤY DỮ LIỆU CŨ
    useEffect(() => {
        const fetchMovie = async () => {
            try {
                const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/movies/detail/${id}`);
                const movie = res.data;

                setFormData({
                    title: movie.title || '',
                    director: movie.director || '',
                    nation: movie.nation || '', // Lấy nation từ database
                    duration: movie.duration || '',
                    age_rating: movie.age_rating || 0,
                    release_date: movie.release_date ? movie.release_date.substring(0, 10) : '',
                    status: movie.status || 'Sắp chiếu',
                    trailer_url: movie.trailer_url || '', 
                    description: movie.description || ''
                });
                setOldPoster(movie.poster_url); 
            } catch (err) {
                handleShowModal('error', 'LỖI', 'Không thể tải thông tin phim.');
            }
        };
        fetchMovie();
    }, [id]);

    // 3. HANDLERS
    const handleShowModal = (type, title, message, onConfirm = null) => {
        setModal({
            show: true, type, title, message,
            onConfirm: onConfirm || (() => setModal(m => ({ ...m, show: false })))
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewPoster(file);
            setPreview(URL.createObjectURL(file)); 
        }
    };

    // 4. SUBMIT: CẬP NHẬT
    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- LOGIC KIỂM TRA NGÀY THÁNG ---
        const selectedDate = new Date(formData.release_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        if (formData.status === "Sắp chiếu" && selectedDate < today) {
            handleShowModal(
                'error', 
                'NGÀY KHÔNG HỢP LỆ', 
                'Phim "Sắp chiếu" thì ngày phát hành không được là ngày trong quá khứ.'
            );
            return; 
        }

        const data = new FormData();
        // Gửi kèm toàn bộ formData (bao gồm nation)
        Object.entries(formData).forEach(([key, value]) => data.append(key, value));
        
        if (newPoster) {
            data.append('posters', newPoster);
        }

        try {
            await axios.put(`https://webcinema-zb8z.onrender.com/api/movies/update/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            handleShowModal('success', 'THÀNH CÔNG', `Đã cập nhật phim "${formData.title}" thành công!`, () => {
                navigate('/admin/movies');
            });
        } catch (err) {
            handleShowModal('error', 'THẤT BẠI', err.response?.data?.error || 'Lỗi hệ thống.');
        }
    };

    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <div className="update-header">
                <h2>CẬP NHẬT THÔNG TIN PHIM</h2>
                <p>ID Phim: <strong>#{id}</strong></p>
            </div>
            
            <form onSubmit={handleSubmit} className="clean-update-form">
                <div className="update-form-grid">
                    
                    <div className="update-field">
                        <label>Tên phim</label>
                        <input name="title" value={formData.title} onChange={handleChange} required />
                    </div>

                    <div className="update-field">
                        <label>Slug (Xem trước)</label>
                        <input value={generateSlug(formData.title)} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                    </div>

                    <div className="update-field">
                        <label>Đạo diễn</label>
                        <input name="director" value={formData.director} onChange={handleChange} />
                    </div>

                    {/* BỔ SUNG TRƯỜNG QUỐC GIA */}
                    <div className="update-field">
                        <label>Quốc gia</label>
                        <input name="nation" value={formData.nation} onChange={handleChange} placeholder="VD: Mỹ, Hàn Quốc..." />
                    </div>

                    <div className="update-field">
                        <label>Thời lượng (phút)</label>
                        <input name="duration" type="number" value={formData.duration} onChange={handleChange} required />
                    </div>

                    <div className="update-field">
                        <label>Ngày phát hành</label>
                        <input name="release_date" type="date" value={formData.release_date} onChange={handleChange} required />
                    </div>

                    <div className="update-field">
                        <label>Giới hạn độ tuổi</label>
                        <select name="age_rating" value={formData.age_rating} onChange={handleChange}>
                            <option value="0">P - Mọi lứa tuổi</option>
                            <option value="13">C13 - Trên 13 tuổi</option>
                            <option value="16">C16 - Trên 16 tuổi</option>
                            <option value="18">C18 - Trên 18 tuổi</option>
                        </select>
                    </div>

                    <div className="update-field">
                        <label>Trạng thái</label>
                        <select name="status" value={formData.status} onChange={handleChange}>
                            <option value="Sắp chiếu">Sắp chiếu</option>
                            <option value="Đang chiếu">Đang chiếu</option>
                            <option value="Ngừng chiếu">Ngừng chiếu</option>
                        </select>
                    </div>

                    <div className="update-field full-width">
                        <label>Link Trailer (YouTube)</label>
                        <input 
                            name="trailer_url" 
                            value={formData.trailer_url} 
                            onChange={handleChange} 
                            placeholder="https://www.youtube.com/watch?v=..." 
                        />
                    </div>

                    <div className="update-field full-width">
                        <label>Ảnh Poster</label>
                        <div className="poster-update-section" style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            <img 
                                src={preview ? preview : `https://webcinema-zb8z.onrender.com/uploads/posters/${oldPoster}`} 
                                alt="Poster" 
                                style={{ width: '100px', height: '140px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                onError={(e) => e.target.src = 'https://via.placeholder.com/100x140?text=No+Image'} 
                            />
                            <div className="file-input-group">
                                <input type="file" onChange={handleFileChange} accept="image/*" />
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                                    {preview ? "Đã chọn ảnh mới" : "Giữ nguyên nếu không muốn thay đổi ảnh cũ"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="update-field full-width">
                        <label>Mô tả nội dung</label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="5" 
                            placeholder="Nhập mô tả phim..."
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button type="submit" className="btn-submit-update">LƯU THAY ĐỔI</button>
                    <button type="button" className="btn-go-back" onClick={() => navigate('/admin/movies')}>HỦY BỎ</button>
                </div>
            </form>
        </div>
    );
};

export default MovieUpdate;