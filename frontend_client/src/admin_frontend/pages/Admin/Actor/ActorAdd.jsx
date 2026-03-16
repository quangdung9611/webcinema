import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserForm.css'; 
import Modal from '../../../components/Modal';

// Khai báo địa chỉ server để lấy hình cho diễn viên
const IMAGE_BASE_URL = "http://localhost:5000/uploads/actors/";

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

const ActorAdd = () => {
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        gender: 'Nam',
        nationality: 'Việt Nam',
        birthday: '',
        biography: ''
    });

    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(null); 
    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    // 2. LOGIC XỬ LÝ SỰ KIỆN
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'name') {
            setFormData(prev => ({ 
                ...prev, 
                name: value, 
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
            setAvatar(file);
            setPreview(URL.createObjectURL(file)); // Tạo link xem trước
            setErrors(prev => ({ ...prev, avatar: '' }));
        }
    };

    // 3. VALIDATION
    const validate = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = "Vui lòng nhập họ tên diễn viên";
        if (!formData.birthday) newErrors.birthday = "Vui lòng chọn ngày sinh";
        if (!avatar) newErrors.avatar = "Chưa có ảnh đại diện";
        if (formData.biography.length < 10) newErrors.biography = "Tiểu sử ít nhất 10 ký tự";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 4. SUBMIT DỮ LIỆU
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const submitData = new FormData();
        // Append các thông tin text
        Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
        // Append file ảnh (đổi key thành 'avatar' cho đúng backend)
        submitData.append('avatar', avatar);

        try {
            await axios.post('http://localhost:5000/api/actors/add', submitData);
            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Đã thêm diễn viên ${formData.name} vào hệ thống.`,
                onConfirm: () => navigate('/admin/actors')
            });
        } catch (err) {
            setErrors({ server: err.response?.data?.error || "Lỗi kết nối Server" });
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} />
            
            <div className="form-header">
                <h2>THÊM DIỄN VIÊN MỚI</h2>
                <p>Nhập thông tin chi tiết của diễn viên</p>
            </div>

            <form onSubmit={handleSubmit} className="clean-form">
                
                <div className="form-row">
                    <div className="form-group">
                        <label>Họ tên diễn viên</label>
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nhập tên diễn viên..." />
                        {errors.name && <small className="error-msg">{errors.name}</small>}
                    </div>

                    <div className="form-group">
                        <label>Slug (URL)</label>
                        <input name="slug" value={formData.slug} readOnly placeholder="ten-dien-vien-tu-dong" style={{ backgroundColor: '#f9f9f9' }} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Giới tính</label>
                        <select name="gender" value={formData.gender} onChange={handleChange}>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Quốc tịch</label>
                        <input name="nationality" value={formData.nationality} onChange={handleChange} placeholder="Ví dụ: Việt Nam, Mỹ..." />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Ngày sinh</label>
                        <input name="birthday" type="date" onChange={handleChange} />
                        {errors.birthday && <small className="error-msg">{errors.birthday}</small>}
                    </div>
                    <div className="form-group">
                        <label>Ảnh đại diện (Avatar)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                        {errors.avatar && <small className="error-msg">{errors.avatar}</small>}
                    </div>
                </div>

                {/* PHẦN HIỂN THỊ HÌNH ẢNH */}
                {preview && (
                    <div className="poster-preview-wrapper" style={{ marginBottom: '20px' }}>
                        <img 
                            src={preview} 
                            alt="Preview" 
                            className="img-thumbnail" 
                            style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%' }}
                        />
                    </div>
                )}

                <div className="form-group full-width">
                    <label>Tiểu sử</label>
                    <textarea name="biography" rows="5" onChange={handleChange} placeholder="Nhập tóm tắt tiểu sử và sự nghiệp..."></textarea>
                    {errors.biography && <small className="error-msg">{errors.biography}</small>}
                </div>

                {errors.server && <div className="alert-error">{errors.server}</div>}

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu Diễn Viên</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/admin/actors')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default ActorAdd;