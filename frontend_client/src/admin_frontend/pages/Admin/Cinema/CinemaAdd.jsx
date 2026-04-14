import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../../styles/UserForm.css';
import Modal from '../../../components/Modal';

const CinemaAdd = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        cinema_name: '',
        address: '',
        city: ''
    });

    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        let newErrors = {};
        if (!formData.cinema_name.trim()) newErrors.cinema_name = "Tên rạp không được để trống";
        if (!formData.address.trim()) newErrors.address = "Địa chỉ không được để trống";
        if (!formData.city.trim()) newErrors.city = "Thành phố không được để trống";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const token = sessionStorage.getItem('usertoken');
            await axios.post('https://api.quangdungcinema.id.vn/api/cinemas/add', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setModal({
                show: true, type: 'success', title: 'THÀNH CÔNG',
                message: `Rạp "${formData.cinema_name}" đã được thêm thành công!`,
                onConfirm: () => { setModal({ show: false }); navigate('/admin/cinemas'); }
            });
        } catch (err) {
            setModal({
                show: true, type: 'error', title: 'LỖI HỆ THỐNG',
                message: err.response?.data?.error || "Lỗi khi lưu thông tin rạp.",
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />
            <h2>THÊM RẠP CHIẾU MỚI</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Tên rạp chiếu</label>
                    <input name="cinema_name" placeholder="ví dụ: CGV Vincom" onChange={handleChange} />
                    {errors.cinema_name && <span className="error-text">{errors.cinema_name}</span>}
                </div>

                <div className="form-group">
                    <label>Địa chỉ cụ thể</label>
                    <input name="address" placeholder="Số nhà, tên đường..." onChange={handleChange} />
                    {errors.address && <span className="error-text">{errors.address}</span>}
                </div>

                <div className="form-group">
                    <label>Thành phố</label>
                    <input name="city" placeholder="ví dụ: Biên Hòa" onChange={handleChange} />
                    {errors.city && <span className="error-text">{errors.city}</span>}
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu rạp chiếu</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/admin/cinemas')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default CinemaAdd;