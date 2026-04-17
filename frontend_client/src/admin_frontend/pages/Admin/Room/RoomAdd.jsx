import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// 1. SỬA ĐƯỜNG DẪN IMPORT
import '../../../styles/UserForm.css';
import Modal from '../../../components/Modal'; 

const RoomAdd = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        room_name: '',
        cinema_id: '',
        room_type: '' // BỔ SUNG TRƯỜNG MỚI
    });

    const [cinemas, setCinemas] = useState([]);
    const [errors, setErrors] = useState({});
    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const res = await axios.get('https://api.quangdungcinema.id.vn/api/cinemas');
                setCinemas(res.data);
            } catch (err) {
                console.error("Không thể tải danh sách rạp");
            }
        };
        fetchCinemas();
    }, []);

    const validateForm = () => {
        let newErrors = {};
        if (!formData.room_name.trim()) {
            newErrors.room_name = "Tên phòng không được để trống";
        } else if (formData.room_name.length < 2) {
            newErrors.room_name = "Tên phòng phải có ít nhất 2 ký tự";
        }
        if (!formData.cinema_id) {
            newErrors.cinema_id = "Vui lòng chọn cụm rạp quản lý phòng này";
        }
        // BỔ SUNG VALIDATE LOẠI PHÒNG
        if (!formData.room_type) {
            newErrors.room_type = "Vui lòng chọn loại phòng (2D/3D/IMAX)";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await axios.post('https://api.quangdungcinema.id.vn/api/rooms/add', formData);
            
            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Đã thêm phòng ${formData.room_type}: ${formData.room_name} vào hệ thống.`,
                onConfirm: () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/rooms');
                }
            });
        } catch (err) {
            setModal({
                show: true,
                type: 'error',
                title: 'THẤT BẠI',
                message: err.response?.data?.error || "Lỗi kết nối đến máy chủ, vui lòng thử lại.",
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        }
    };

    return (
        <div className="user-form-container">
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />
            
            <h2>THÊM PHÒNG CHIẾU MỚI</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Tên phòng chiếu</label>
                        <input 
                            name="room_name" 
                            placeholder="ví dụ: Phòng 01, IMAX 02..." 
                            value={formData.room_name}
                            onChange={handleChange} 
                            style={errors.room_name ? {borderColor: '#ff4d4d'} : {}}
                        />
                        {errors.room_name && <span className="error-text">{errors.room_name}</span>}
                    </div>

                    <div className="form-group">
                        <label>Thuộc cụm rạp</label>
                        <select 
                            name="cinema_id" 
                            value={formData.cinema_id} 
                            onChange={handleChange}
                            style={errors.cinema_id ? {borderColor: '#ff4d4d'} : {}}
                        >
                            <option value="">-- Chọn rạp chiếu --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>
                                    {c.cinema_name} ({c.city})
                                </option>
                            ))}
                        </select>
                        {errors.cinema_id && <span className="error-text">{errors.cinema_id}</span>}
                    </div>
                </div>

                {/* BỔ SUNG ROW MỚI CHO LOẠI PHÒNG */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Loại phòng chiếu</label>
                        <select 
                            name="room_type" 
                            value={formData.room_type} 
                            onChange={handleChange}
                            style={errors.room_type ? {borderColor: '#ff4d4d'} : {}}
                        >
                            <option value="">-- Chọn loại phòng --</option>
                            <option value="2D">Phòng chiếu 2D</option>
                            <option value="3D">Phòng chiếu 3D</option>
                            <option value="IMAX">Phòng chiếu IMAX</option>
                        </select>
                        {errors.room_type && <span className="error-text">{errors.room_type}</span>}
                    </div>
                    
                    {/* Để trống 1 bên cho đẹp form-row hoặc Dũng có thể thêm ghi chú ở đây */}
                    <div className="form-group" style={{ visibility: 'hidden' }}>
                        <label>Ẩn</label>
                        <input disabled />
                    </div>
                </div>

                <div className="form-group">
                    <p style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic', background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
                        * Lưu ý: Mỗi rạp không được trùng tên phòng chiếu. Loại phòng sẽ quyết định sơ đồ ghế và giá vé mặc định khi bạn khởi tạo ghế.
                    </p>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu phòng chiếu</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/rooms')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default RoomAdd;