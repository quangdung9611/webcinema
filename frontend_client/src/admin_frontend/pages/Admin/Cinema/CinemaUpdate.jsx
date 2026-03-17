import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

const CinemaUpdate = () => {
    const { cinema_id } = useParams();
    const navigate = useNavigate();

    // --- 1. QUẢN LÝ STATE ---
    const [formData, setFormData] = useState({
        cinema_name: '', 
        address: '', 
        city: '', 
        slug: ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // --- HÀM TẠO SLUG TỰ ĐỘNG ---
    const createSlug = (text) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/([^0-9a-z-\s])/g, '')
            .replace(/(\s+)/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    // --- 2. EFFECT: LẤY DỮ LIỆU CŨ ---
    useEffect(() => {
        if (cinema_id) {
            const fetchCinema = async () => {
                try {
                    const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/cinemas/${cinema_id}`);
                    const cinema = res.data;
                    
                    if (cinema) {
                        setFormData({ 
                            cinema_name: cinema.cinema_name || '',
                            address: cinema.address || '',
                            city: cinema.city || '',
                            slug: cinema.slug || ''
                        });
                    }
                } catch (err) {
                    console.error("Lỗi tải rạp:", err);
                    showNotice('error', 'LỖI TẢI DỮ LIỆU', 'Không thể lấy thông tin rạp.');
                }
            };
            fetchCinema();
        }
    }, [cinema_id]);

    // --- 3. CÁC HÀM TRỢ GIÚP (HELPERS) ---
    const showNotice = (type, title, message, onConfirm = null) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'cinema_name') {
            // Khi thay đổi tên rạp, tự động cập nhật Slug
            setFormData(prev => ({ 
                ...prev, 
                cinema_name: value,
                slug: createSlug(value) 
            }));
        } else {
            setFormData(prev => ({ 
                ...prev, 
                [name]: value 
            }));
        }
    };

    // --- 4. XỬ LÝ CẬP NHẬT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`https://webcinema-zb8z.onrender.com/api/cinemas/update/${cinema_id}`, formData);
            
            showNotice(
                'success',
                'CẬP NHẬT THÀNH CÔNG',
                `Thông tin của ${formData.cinema_name} đã được lưu lại.`,
                () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/admin/cinemas');
                }
            );
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Lỗi khi lưu dữ liệu.';
            showNotice('error', 'CẬP NHẬT THẤT BẠI', errorMsg);
        }
    };

    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <h2>CHỈNH SỬA RẠP CHIẾU</h2>
            <p className="update-subtitle">Sửa thông tin Cinema ID: <strong>#{cinema_id}</strong></p>
            
            <form onSubmit={handleSubmit}>
                <div className="update-form-grid">
                    
                    {/* Tên rạp */}
                    <div className="update-field">
                        <label>Tên rạp chiếu</label>
                        <input 
                            name="cinema_name" 
                            value={formData.cinema_name} 
                            onChange={handleInputChange} 
                            placeholder="Ví dụ: Lotte Cinema"
                            required 
                        />
                    </div>

                    {/* Thành phố */}
                    <div className="update-field">
                        <label>Thành phố</label>
                        <input 
                            name="city" 
                            value={formData.city} 
                            onChange={handleInputChange} 
                            placeholder="Ví dụ: Biên Hòa"
                            required 
                        />
                    </div>

                    {/* Slug tự động */}
                    <div className="update-field full-width">
                        <label>Đường dẫn (Slug tự động)</label>
                        <input 
                            name="slug" 
                            value={formData.slug} 
                            readOnly 
                            style={{ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' }} 
                        />
                    </div>

                    {/* Địa chỉ */}
                    <div className="update-field full-width">
                        <label>Địa chỉ chi tiết</label>
                        <textarea 
                            name="address" 
                            value={formData.address} 
                            onChange={handleInputChange} 
                            rows="2" 
                            placeholder="Số nhà, tên đường..."
                            required 
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button type="button" className="btn-go-back" onClick={() => navigate('/admin/cinemas')}>
                        Quay lại
                    </button>
                    <button type="submit" className="btn-submit-update">
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CinemaUpdate;