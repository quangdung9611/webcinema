import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../../styles/UserForm.css';
import Modal from '../../../components/Modal';

const GenresAdd = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        genre_name: '',
        slug: ''
    });

    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });

    // Hàm tạo slug tự động
    const createSlug = (text) => {
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
            .replace(/([^0-9a-z-\s])/g, '').replace(/(\s+)/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'genre_name') {
            setFormData(prev => ({ ...prev, genre_name: value, slug: createSlug(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.genre_name.trim() || formData.genre_name.length < 2) 
            newErrors.genre_name = "Tên thể loại phải có ít nhất 2 ký tự";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const token = sessionStorage.getItem('usertoken');
            await axios.post('https://api.quangdungcinema.id.vn/api/genres/add', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setModal({
                show: true, type: 'success', title: 'THÀNH CÔNG',
                message: `Thể loại "${formData.genre_name}" đã được thêm!`,
                onConfirm: () => { setModal({ show: false }); navigate('/admin/genres'); }
            });
        } catch (err) {
            setModal({
                show: true, type: 'error', title: 'LỖI',
                message: err.response?.data?.error || "Không thể lưu thể loại.",
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />
            <h2>THÊM THỂ LOẠI MỚI</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Tên thể loại</label>
                    <input name="genre_name" placeholder="ví dụ: Hành Động" onChange={handleChange} />
                    {errors.genre_name && <span className="error-text">{errors.genre_name}</span>}
                </div>

                <div className="form-group">
                    <label>Đường dẫn (Slug)</label>
                    <input name="slug" value={formData.slug} readOnly style={{ backgroundColor: '#f0f0f0' }} />
                    <small>Tự động tạo để phục vụ tìm kiếm SEO</small>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu thể loại</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/admin/genres')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default GenresAdd;