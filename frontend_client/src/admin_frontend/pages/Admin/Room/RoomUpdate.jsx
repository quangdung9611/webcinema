import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

// Import tài nguyên theo phong cách của Quang Dũng
import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

const RoomUpdate = () => {
    const { room_id } = useParams(); // Lấy ID từ URL
    const navigate = useNavigate();

    // --- 1. QUẢN LÝ STATE ---
    const [formData, setFormData] = useState({
        room_name: '',
        cinema_id: '',
        room_type: '' // BỔ SUNG TRƯỜNG MỚI
    });

    const [cinemas, setCinemas] = useState([]); // Danh sách rạp để chọn lại

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // --- 2. EFFECT: LẤY DỮ LIỆU CŨ & DANH SÁCH RẠP ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Lấy danh sách rạp trước
                const resCinemas = await axios.get('https://webcinema-zb8z.onrender.com/api/cinemas');
                setCinemas(resCinemas.data);

                // Lấy thông tin chi tiết phòng
                const resRoom = await axios.get(`https://webcinema-zb8z.onrender.com/api/rooms/${room_id}`);
                if (resRoom.data) {
                    setFormData({
                        room_name: resRoom.data.room_name || '',
                        cinema_id: resRoom.data.cinema_id || '',
                        room_type: resRoom.data.room_type || '' // FETCH DỮ LIỆU CŨ LÊN
                    });
                }
            } catch (err) {
                showNotice('error', 'LỖI TẢI DỮ LIỆU', 'Không thể lấy thông tin phòng chiếu hoặc danh sách rạp.');
            }
        };
        fetchData();
    }, [room_id]);

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
        setFormData(prev => ({ 
            ...prev, 
            [name]: value 
        }));
    };

    // --- 4. XỬ LÝ CẬP NHẬT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Bổ sung validate room_type
        if (!formData.room_name.trim() || !formData.cinema_id || !formData.room_type) {
            showNotice('error', 'THIẾU THÔNG TIN', 'Vui lòng nhập đầy đủ tên phòng, loại phòng và rạp.');
            return;
        }

        try {
            await axios.put(`https://webcinema-zb8z.onrender.com/api/rooms/update/${room_id}`, formData);
            
            showNotice(
                'success',
                'CẬP NHẬT THÀNH CÔNG',
                `Thông tin phòng ${formData.room_name} đã được cập nhật.`,
                () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/admin/rooms');
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
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />

            <h2>CHỈNH SỬA PHÒNG CHIẾU</h2>
            <p className="update-subtitle">Sửa thông tin Room ID: <strong>#{room_id}</strong></p>
            
            <form onSubmit={handleSubmit}>
                <div className="update-form-grid">
                    
                    {/* Tên phòng */}
                    <div className="update-field full-width">
                        <label>Tên phòng chiếu</label>
                        <input 
                            name="room_name"
                            value={formData.room_name} 
                            onChange={handleInputChange} 
                            placeholder="Nhập tên phòng (Vd: Phòng 01)"
                            required
                        />
                    </div>

                    {/* Loại phòng (BỔ SUNG) */}
                    <div className="update-field full-width">
                        <label>Loại phòng chiếu</label>
                        <select 
                            name="room_type" 
                            value={formData.room_type} 
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">-- Chọn loại phòng --</option>
                            <option value="2D">Phòng chiếu 2D</option>
                            <option value="3D">Phòng chiếu 3D</option>
                            <option value="IMAX">Phòng chiếu IMAX</option>
                        </select>
                    </div>

                    {/* Chọn Rạp (Cinema) */}
                    <div className="update-field full-width">
                        <label>Thuộc cụm rạp</label>
                        <select 
                            name="cinema_id" 
                            value={formData.cinema_id} 
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">-- Chọn cụm rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>
                                    {c.cinema_name} ({c.city})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Ghi chú thông tin thêm */}
                    <div className="update-field full-width">
                        <p style={{ fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic', marginTop: '10px' }}>
                            * Lưu ý: Việc thay đổi <strong>Loại phòng</strong> sau khi đã có ghế có thể gây sai lệch về giá vé và sơ đồ hiển thị. Hãy cân nhắc trước khi đổi.
                        </p>
                    </div>

                </div>

                <div className="update-actions">
                    <button 
                        type="button" 
                        className="btn-go-back" 
                        onClick={() => navigate('/admin/rooms')}
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

export default RoomUpdate;