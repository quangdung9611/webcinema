import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// --- IMPORT THƯ VIỆN MỚI ---
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

const NewsAdd = () => {
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        image_url: '' // Đây là tên file sẽ lưu vào DB
    });

    const [imageFile, setImageFile] = useState(null); // File thực tế để upload
    const [preview, setPreview] = useState(null); 
    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    // --- CẤU HÌNH TOOLBAR CHO QUILL (Tùy chọn) ---
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

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

    // --- HÀM XỬ LÝ RIÊNG CHO QUILL VÌ NÓ KHÔNG DÙNG EVENT (E) ---
    const handleQuillChange = (value) => {
        setFormData(prev => ({ ...prev, content: value }));
        if (errors.content) setErrors(prev => ({ ...prev, content: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
            setErrors(prev => ({ ...prev, image: '' }));
        }
    };

    // 3. VALIDATION
    const validate = () => {
        const newErrors = {};
        if (!formData.title) newErrors.title = "Vui lòng nhập tiêu đề bài viết";
        
        // Loại bỏ tag HTML để kiểm tra độ dài thực tế của chữ
        const plainText = formData.content.replace(/<[^>]*>/g, '').trim();
        if (!formData.content || plainText.length < 20) {
            newErrors.content = "Nội dung bài viết quá ngắn (ít nhất 20 ký tự)";
        }
        if (!imageFile) newErrors.image = "Vui lòng chọn hình ảnh minh họa";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 4. SUBMIT DỮ LIỆU
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        // Vì tin tức có ảnh, chúng ta dùng FormData để upload file
        const submitData = new FormData();
        submitData.append('title', formData.title);
        submitData.append('slug', formData.slug);
        submitData.append('content', formData.content);
        submitData.append('newsImage', imageFile); // 'newsImage' phải khớp với tên field ở backend upload

        try {
            // Gọi API tạo tin tức mới
            await axios.post('https://webcinema-zb8z.onrender.com/api/news', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Đã đăng bài viết: ${formData.title}`,
                onConfirm: () => navigate('/admin/news')
            });
        } catch (err) {
            setErrors({ server: err.response?.data?.message || "Lỗi khi đăng bài viết" });
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} />
            
            <div className="form-header">
                <h2>THÊM TIN TỨC MỚI</h2>
                <p>Nhập nội dung bài viết mới cho hệ thống Cinema Shop</p>
            </div>

            <form onSubmit={handleSubmit} className="clean-form">
                
                <div className="form-row">
                    <div className="form-group full-width">
                        <label>Tiêu đề bài viết</label>
                        <input 
                            name="title" 
                            value={formData.title} 
                            onChange={handleChange} 
                            placeholder="Nhập tiêu đề tin tức..." 
                        />
                        {errors.title && <small className="error-msg">{errors.title}</small>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group full-width">
                        <label>Slug (URL bài viết)</label>
                        <input 
                            name="slug" 
                            value={formData.slug} 
                            readOnly 
                            placeholder="duong-dan-bai-viet-tu-dong" 
                            style={{ backgroundColor: '#f9f9f9', color: '#666' }} 
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Hình ảnh bài viết</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                        {errors.image && <small className="error-msg">{errors.image}</small>}
                    </div>
                    
                    <div className="form-group">
                        <label>Xem trước hình ảnh</label>
                        <div className="poster-preview-wrapper" style={{ marginTop: '10px' }}>
                            <img 
                                src={preview ? preview : 'https://via.placeholder.com/200x120?text=No+Image'} 
                                alt="Preview" 
                                className="img-thumbnail" 
                                style={{ width: '100%', maxWidth: '200px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/200x120?text=No+Image'; }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group full-width" style={{ marginBottom: '50px' }}>
                    <label>Nội dung chi tiết</label>
                    {/* --- THAY THẾ TEXTAREA TẠI ĐÂY --- */}
                    <div style={{ background: 'white', color: 'black' }}>
                        <ReactQuill 
                            theme="snow"
                            value={formData.content} 
                            onChange={handleQuillChange} 
                            modules={modules}
                            placeholder="Viết nội dung tin tức ở đây..."
                            style={{ height: '250px' }}
                        />
                    </div>
                    {errors.content && <small className="error-msg" style={{ display: 'block', marginTop: '45px' }}>{errors.content}</small>}
                </div>

                {errors.server && <div className="alert-error" style={{ color: 'red', marginBottom: '10px' }}>{errors.server}</div>}

                <div className="form-actions">
                    <button type="submit" className="btn-save">Đăng Bài Viết</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/admin/news')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default NewsAdd;