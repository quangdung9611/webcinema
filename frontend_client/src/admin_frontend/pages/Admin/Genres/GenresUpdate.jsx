import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

const GenresUpdate = () => {
    const { genre_id } = useParams();
    const navigate = useNavigate();

    // --- 1. QUẢN LÝ STATE ---
    const [formData, setFormData] = useState({
        genre_name: '',
        slug: ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // --- HÀM TẠO SLUG TỰ ĐỘNG (Dành riêng cho thể loại) ---
    const createSlug = (text) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD') // Chuẩn hóa tiếng Việt
            .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
            .replace(/[đĐ]/g, 'd')
            .replace(/([^0-9a-z-\s])/g, '') // Xóa ký tự đặc biệt
            .replace(/(\s+)/g, '-') // Thay khoảng trắng bằng dấu gạch ngang
            .replace(/-+/g, '-') // Xóa gạch ngang thừa
            .replace(/^-+|-+$/g, ''); // Xóa gạch ngang ở đầu/cuối
    };

    // --- 2. EFFECT: LẤY DỮ LIỆU CŨ ---
    useEffect(() => {
        const fetchGenre = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/genres/${genre_id}`);
                const genre = res.data;
                
                if (genre) {
                    setFormData({ 
                        genre_name: genre.genre_name || '',
                        slug: genre.slug || ''
                    });
                }
            } catch (err) {
                showNotice('error', 'LỖI TẢI DỮ LIỆU', 'Không thể lấy thông tin thể loại từ máy chủ.');
            }
        };
        fetchGenre();
    }, [genre_id]);

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
        
        if (name === 'genre_name') {
            // Khi sửa tên, cập nhật cả tên và tự tạo slug
            setFormData(prev => ({ 
                ...prev, 
                genre_name: value,
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
        
        if (formData.genre_name && formData.genre_name.length < 2) {
            showNotice('error', 'DỮ LIỆU YẾU', 'Tên thể loại cần ít nhất 2 ký tự.');
            return;
        }

        try {
            await axios.put(`http://localhost:5000/api/genres/update/${genre_id}`, formData);
            
            showNotice(
                'success',
                'CẬP NHẬT THÀNH CÔNG',
                `Thông tin của ${formData.genre_name} đã được lưu lại.`,
                () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/admin/genres');
                }
            );
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Đã có lỗi xảy ra trong quá trình lưu dữ liệu.';
            showNotice('error', 'CẬP NHẬT THẤT BẠI', errorMsg);
        }
    };

    // --- 5. GIAO DIỆN (RENDER) ---
    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <h2>CHỈNH SỬA THỂ LOẠI</h2>
            <p className="update-subtitle">Sửa thông tin Genre ID: <strong>#{genre_id}</strong></p>
            
            <form onSubmit={handleSubmit}>
                <div className="update-form-grid">
                    
                    {/* Tên thể loại */}
                    <div className="update-field full-width">
                        <label>Tên thể loại</label>
                        <input 
                            name="genre_name"
                            value={formData.genre_name} 
                            onChange={handleInputChange} 
                            placeholder="Nhập tên thể loại"
                            required
                        />
                    </div>

                    {/* Slug */}
                    <div className="update-field full-width">
                        <label>Đường dẫn (Slug tự động)</label>
                        <input 
                            name="slug"
                            value={formData.slug} 
                            readOnly // Để readOnly để tránh user nhập sai định dạng slug
                            style={{ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
                            placeholder="slug-tu-dong"
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button 
                        type="button" 
                        className="btn-go-back" 
                        onClick={() => navigate('/admin/genres')}
                    >
                        Quay lại
                    </button>
                    
                    <button 
                        type="submit" 
                        className="btn-submit-update"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GenresUpdate;