import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

// 1. THAY THẾ: Sử dụng bản New để hỗ trợ React 19 và Vercel
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; 

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

// Cấu hình Toolbar cho đồng bộ với trang Add
const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],        
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],     
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']                                         
    ],
};

const MovieUpdate = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT
    const [formData, setFormData] = useState({
        title: '',
        director: '',
        nation: '', 
        duration: '',
        age_rating: 0,
        release_date: '',
        status: 'Sắp chiếu',
        trailer_url: '', 
        description: '' // Nội dung HTML từ Quill
    });

    const [oldPoster, setOldPoster] = useState(''); 
    const [oldBackdrop, setOldBackdrop] = useState('');
    const [newPoster, setNewPoster] = useState(null); 
    const [newBackdrop, setNewBackdrop] = useState(null);
    const [preview, setPreview] = useState(null); 
    const [backdropPreview, setBackdropPreview] = useState(null);
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    // 2. EFFECT: LẤY DỮ LIỆU CŨ
    useEffect(() => {
        const fetchMovie = async () => {
            try {
                const res = await axios.get(`https://api.quangdungcinema.id.vn/api/movies/detail/${id}`);
                const movie = res.data;

                setFormData({
                    title: movie.title || '',
                    director: movie.director || '',
                    nation: movie.nation || '', 
                    duration: movie.duration || '',
                    age_rating: movie.age_rating || 0,
                    release_date: movie.release_date ? movie.release_date.substring(0, 10) : '',
                    status: movie.status || 'Sắp chiếu',
                    trailer_url: movie.trailer_url || '', 
                    description: movie.description || ''
                });
                setOldPoster(movie.poster_url); 
                setOldBackdrop(movie.backdrop_url);
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

    // Handler riêng cho React Quill
    const handleEditorChange = (content) => {
        setFormData(prev => ({ ...prev, description: content }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (e.target.name === "posters") {
                setNewPoster(file);
                setPreview(URL.createObjectURL(file)); 
            } else if (e.target.name === "backdrop_url") {
                setNewBackdrop(file);
                setBackdropPreview(URL.createObjectURL(file));
            }
        }
    };

    // 4. SUBMIT: CẬP NHẬT
    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => data.append(key, value));
        data.append('slug', generateSlug(formData.title));
        
        if (newPoster) data.append('posters', newPoster);
        if (newBackdrop) data.append('backdrop_url', newBackdrop);

        try {
            await axios.put(`https://api.quangdungcinema.id.vn/api/movies/update/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            handleShowModal('success', 'THÀNH CÔNG', `Đã cập nhật phim "${formData.title}" thành công!`, () => {
                navigate('/movies');
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

                    <div className="update-field">
                        <label>Quốc gia</label>
                        <input name="nation" value={formData.nation} onChange={handleChange} />
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
                        <input name="trailer_url" value={formData.trailer_url} onChange={handleChange} />
                    </div>

                    {/* POSTER DỌC */}
                    <div className="update-field full-width">
                        <label>Ảnh Poster (Dọc)</label>
                        <div className="poster-update-section" style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            <img 
                                src={preview ? preview : `https://api.quangdungcinema.id.vn/uploads/posters/${oldPoster}`} 
                                alt="Poster" 
                                style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div className="file-input-group">
                                <input type="file" name="posters" onChange={handleFileChange} accept="image/*" />
                            </div>
                        </div>
                    </div>

                    {/* BACKDROP NGANG */}
                    <div className="update-field full-width">
                        <label>Ảnh Backdrop (Ngang)</label>
                        <div className="poster-update-section" style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            <img 
                                src={backdropPreview ? backdropPreview : `https://api.quangdungcinema.id.vn/uploads/backdrops/${oldBackdrop}`} 
                                alt="Backdrop" 
                                style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div className="file-input-group">
                                <input type="file" name="backdrop_url" onChange={handleFileChange} accept="image/*" />
                            </div>
                        </div>
                    </div>

                    {/* --- PHẦN REACT QUILL ĐÃ CẬP NHẬT --- */}
                    <div className="update-field full-width" style={{ marginBottom: '60px' }}>
                        <label style={{ marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>Mô tả nội dung</label>
                        <div style={{ backgroundColor: 'white', color: 'black', borderRadius: '4px' }}>
                            <ReactQuill 
                                theme="snow"
                                value={formData.description} 
                                onChange={handleEditorChange} 
                                modules={modules}
                                style={{ height: '250px' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="update-actions">
                    <button type="submit" className="btn-submit-update">LƯU THAY ĐỔI</button>
                    <button type="button" className="btn-go-back" onClick={() => navigate('/movies')}>HỦY BỎ</button>
                </div>
            </form>
        </div>
    );
};

export default MovieUpdate;