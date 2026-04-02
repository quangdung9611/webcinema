import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserForm.css'; 
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

const MovieAdd = () => {
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        director: '',
        nation: '', 
        duration: '',
        age_rating: '0',
        release_date: '',
        status: 'Sắp chiếu',
        trailer_url: '', 
        description: '',
        total_likes: 0 // Thêm mặc định cho khớp db
    });

    const [poster, setPoster] = useState(null);
    const [preview, setPreview] = useState(null); 
    const [backdrop, setBackdrop] = useState(null);
    const [backdropPreview, setBackdropPreview] = useState(null);

    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    // 2. LOGIC XỬ LÝ SỰ KIỆN
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'title') {
            setFormData(prev => ({ 
                ...prev, 
                title: value, 
                slug: generateSlug(value) 
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (e.target.name === 'posters') {
                setPoster(file);
                setPreview(URL.createObjectURL(file));
                setErrors(prev => ({ ...prev, poster: '' }));
            } else if (e.target.name === 'backdrop_url') { // ĐỒNG BỘ: Dùng luôn tên backdrop_url
                setBackdrop(file);
                setBackdropPreview(URL.createObjectURL(file));
                setErrors(prev => ({ ...prev, backdrop: '' }));
            }
        }
    };

    // 3. VALIDATION
    const validate = () => {
        const newErrors = {};
        if (!formData.title) newErrors.title = "Vui lòng nhập tiêu đề";
        if (!formData.duration || formData.duration <= 0) newErrors.duration = "Thời lượng không hợp lệ";
        if (!formData.release_date) newErrors.release_date = "Chọn ngày phát hành";
        
        const selectedDate = new Date(formData.release_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (formData.status === "Sắp chiếu" && selectedDate < today) {
            newErrors.release_date = "Phim sắp chiếu thì ngày phải ở tương lai";
        }

        if (!poster) newErrors.poster = "Chưa có ảnh poster";
        if (!backdrop) newErrors.backdrop = "Chưa có ảnh backdrop"; 
        if (formData.description.length < 10) newErrors.description = "Mô tả ít nhất 10 ký tự";
        
        if (formData.trailer_url && !formData.trailer_url.includes('youtube.com') && !formData.trailer_url.includes('youtu.be')) {
            newErrors.trailer_url = "Vui lòng nhập đúng định dạng link YouTube";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 4. SUBMIT DỮ LIỆU
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const submitData = new FormData();
        
        // Append các field text
        Object.entries(formData).forEach(([key, value]) => {
            submitData.append(key, value);
        });
        
        // Append File - QUAN TRỌNG: Tên nhãn (key) phải khớp với Backend
        submitData.append('posters', poster);
        submitData.append('backdrop_url', backdrop); 

        try {
            // Lưu ý: Dũng kiểm tra xem link Render đã deploy code mới nhất chưa nhé
            await axios.post('https://webcinema-zb8z.onrender.com/api/movies/add', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Đã thêm phim ${formData.title} vào hệ thống.`,
                onConfirm: () => navigate('/admin/movies')
            });
        } catch (err) {
            console.error("Lỗi gửi form:", err);
            const serverError = err.response?.data?.error || "Lỗi kết nối Server";
            setErrors(prev => ({ ...prev, server: serverError }));
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} />
            
            <div className="form-header">
                <h2>THÊM PHIM MỚI</h2>
                <p>Hãy nhập thông tin chi tiết cho bộ phim bên dưới</p>
            </div>

            <form onSubmit={handleSubmit} className="clean-form">
                
                <div className="form-row">
                    <div className="form-group">
                        <label>Tiêu đề phim</label>
                        <input name="title" value={formData.title} onChange={handleChange} placeholder="Nhập tên phim..." />
                        {errors.title && <small className="error-msg">{errors.title}</small>}
                    </div>

                    <div className="form-group">
                        <label>Slug (URL)</label>
                        <input name="slug" value={formData.slug} readOnly placeholder="ten-phim-tu-dong" style={{ backgroundColor: '#f9f9f9' }} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Đạo diễn</label>
                        <input name="director" value={formData.director} onChange={handleChange} placeholder="Tên đạo diễn" />
                    </div>
                    <div className="form-group">
                        <label>Quốc gia</label>
                        <input name="nation" value={formData.nation} onChange={handleChange} placeholder="VD: Việt Nam, Mỹ, Hàn Quốc..." />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Thời lượng (phút)</label>
                        <input name="duration" type="number" value={formData.duration} onChange={handleChange} placeholder="Ví dụ: 120" />
                        {errors.duration && <small className="error-msg">{errors.duration}</small>}
                    </div>
                    <div className="form-group">
                        <label>Ngày phát hành</label>
                        <input name="release_date" type="date" value={formData.release_date} onChange={handleChange} />
                        {errors.release_date && <small className="error-msg" style={{ color: '#ff4d4f' }}>{errors.release_date}</small>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Giới hạn độ tuổi</label>
                        <select name="age_rating" value={formData.age_rating} onChange={handleChange}>
                            <option value="0">P - Mọi lứa tuổi</option>
                            <option value="13">C13 - Trên 13 tuổi</option>
                            <option value="16">C16 - Trên 16 tuổi</option>
                            <option value="18">C18 - Trên 18 tuổi</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Trạng thái chiếu</label>
                        <select name="status" value={formData.status} onChange={handleChange}>
                            <option value="Sắp chiếu">Sắp chiếu</option>
                            <option value="Đang chiếu">Đang chiếu</option>
                            <option value="Ngừng chiếu">Ngừng chiếu</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group full-width">
                        <label>Link Trailer (YouTube)</label>
                        <input 
                            name="trailer_url" 
                            value={formData.trailer_url} 
                            onChange={handleChange} 
                            placeholder="https://www.youtube.com/watch?v=..." 
                        />
                        {errors.trailer_url && <small className="error-msg">{errors.trailer_url}</small>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Ảnh Poster (Dọc)</label>
                        <div className="file-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input type="file" name="posters" accept="image/*" onChange={handleFileChange} />
                            {poster && (
                                <div className="file-selected-info" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f1f1f1', borderRadius: '5px' }}>
                                    <img src={preview} alt="Preview" style={{ width: '80px', height: '100px', objectFit: 'cover' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '14px' }}>{poster.name}</span>
                                    </div>
                                </div>
                            )}
                            {errors.poster && <small className="error-msg">{errors.poster}</small>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Ảnh Backdrop (Ngang)</label>
                        <div className="file-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* ĐỒNG BỘ: Đổi name thành backdrop_url để Backend/Multer bắt được ngay lập tức */}
                            <input type="file" name="backdrop_url" accept="image/*" onChange={handleFileChange} />
                            {backdrop && (
                                <div className="file-selected-info" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f1f1f1', borderRadius: '5px' }}>
                                    <img src={backdropPreview} alt="Preview" style={{ width: '150px', height: '85px', objectFit: 'cover' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '14px' }}>{backdrop.name}</span>
                                    </div>
                                </div>
                            )}
                            {errors.backdrop && <small className="error-msg">{errors.backdrop}</small>}
                        </div>
                    </div>
                </div>

                <div className="form-group full-width">
                    <label>Mô tả nội dung</label>
                    <textarea name="description" value={formData.description} rows="4" onChange={handleChange} placeholder="Tóm tắt nội dung phim..."></textarea>
                    {errors.description && <small className="error-msg">{errors.description}</small>}
                </div>

                {errors.server && <div className="alert-error" style={{ color: '#ff4d4f', marginBottom: '15px', fontWeight: '500' }}>{errors.server}</div>}

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu Phim</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/admin/movies')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default MovieAdd;