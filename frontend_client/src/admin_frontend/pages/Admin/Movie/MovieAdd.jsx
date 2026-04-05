import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// --- SỬA DÒNG NÀY ---
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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

// 2. CẤU HÌNH TOOLBAR (Modules) cho React Quill
const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],        
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],     
        [{ 'align': [] }], // Nút căn lề (Trái, Giữa, Phải, Đều)
        ['link', 'image'],
        ['clean']                                         
    ],
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
        description: '', // Nội dung HTML từ Quill sẽ lưu ở đây
        total_likes: 0 
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

    // 3. XỬ LÝ RIÊNG CHO REACT QUILL
    // Quill trả về content (chuỗi HTML) trực tiếp, không phải e.target.value
    const handleEditorChange = (content) => {
        setFormData(prev => ({ ...prev, description: content }));
        if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (e.target.name === 'posters') {
                setPoster(file);
                setPreview(URL.createObjectURL(file));
                setErrors(prev => ({ ...prev, poster: '' }));
            } else if (e.target.name === 'backdrop_url') {
                setBackdrop(file);
                setBackdropPreview(URL.createObjectURL(file));
                setErrors(prev => ({ ...prev, backdrop: '' }));
            }
        }
    };

    // 4. VALIDATION
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
        
        // Kiểm tra text thực tế (loại bỏ thẻ HTML)
        const plainText = formData.description.replace(/<[^>]*>/g, '').trim();
        if (plainText.length < 10) newErrors.description = "Mô tả ít nhất 10 ký tự";
        
        if (formData.trailer_url && !formData.trailer_url.includes('youtube.com') && !formData.trailer_url.includes('youtu.be')) {
            newErrors.trailer_url = "Vui lòng nhập đúng định dạng link YouTube";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 5. SUBMIT DỮ LIỆU
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            submitData.append(key, value);
        });
        
        submitData.append('posters', poster);
        submitData.append('backdrop_url', backdrop); 

        try {
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
                <p>Nhập thông tin phim (Sử dụng React Quill)</p>
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
                        <input name="nation" value={formData.nation} onChange={handleChange} placeholder="VD: Việt Nam, Mỹ..." />
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

                <div className="form-row">
                    <div className="form-group">
                        <label>Ảnh Poster (Dọc)</label>
                        <div className="file-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input type="file" name="posters" accept="image/*" onChange={handleFileChange} />
                            {poster && (
                                <div className="file-selected-info" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f1f1f1', borderRadius: '5px' }}>
                                    <img src={preview} alt="Preview" style={{ width: '80px', height: '100px', objectFit: 'cover' }} />
                                    <span style={{ fontSize: '14px' }}>{poster.name}</span>
                                </div>
                            )}
                            {errors.poster && <small className="error-msg">{errors.poster}</small>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Ảnh Backdrop (Ngang)</label>
                        <div className="file-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input type="file" name="backdrop_url" accept="image/*" onChange={handleFileChange} />
                            {backdrop && (
                                <div className="file-selected-info" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f1f1f1', borderRadius: '5px' }}>
                                    <img src={backdropPreview} alt="Preview" style={{ width: '150px', height: '85px', objectFit: 'cover' }} />
                                    <span style={{ fontSize: '14px' }}>{backdrop.name}</span>
                                </div>
                            )}
                            {errors.backdrop && <small className="error-msg">{errors.backdrop}</small>}
                        </div>
                    </div>
                </div>

                {/* --- PHẦN REACT QUILL ĐÃ SỬA --- */}
                <div className="form-group full-width" style={{ marginBottom: '60px' }}>
                    <label style={{ marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>Mô tả nội dung</label>
                    <div style={{ backgroundColor: 'white', color: 'black', borderRadius: '4px' }}>
                        <ReactQuill 
                            theme="snow"
                            value={formData.description} 
                            onChange={handleEditorChange} 
                            modules={modules}
                            placeholder="Nhập nội dung phim..."
                            style={{ height: '250px' }}
                        />
                    </div>
                    {/* Đẩy lỗi xuống dưới khung soạn thảo */}
                    {errors.description && <small className="error-msg" style={{ marginTop: '50px', display: 'block' }}>{errors.description}</small>}
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