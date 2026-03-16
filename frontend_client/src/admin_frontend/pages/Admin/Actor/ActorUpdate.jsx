import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

// --- HELPERS: Tạo Slug sạch ---
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

const ActorUpdate = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        gender: 'Nam',
        nationality: 'Việt Nam',
        birthday: '',
        biography: ''
    });

    const [oldAvatar, setOldAvatar] = useState(''); 
    const [newAvatar, setNewAvatar] = useState(null); 
    const [preview, setPreview] = useState(null); 
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    useEffect(() => {
        const fetchActor = async () => {
            try {
                // Sử dụng đúng route lấy chi tiết theo ID
                const res = await axios.get(`http://localhost:5000/api/actors/id/${id}`);
                const actor = res.data;

                setFormData({
                    name: actor.name || '',
                    gender: actor.gender || 'Nam',
                    nationality: actor.nationality || 'Việt Nam',
                    birthday: actor.birthday ? actor.birthday.substring(0, 10) : '',
                    biography: actor.biography || ''
                });
                setOldAvatar(actor.avatar); 
            } catch (err) {
                console.error("Lỗi fetch:", err);
                handleShowModal('error', 'LỖI', 'Không thể tải thông tin diễn viên.');
            }
        };
        if (id) fetchActor();
    }, [id]);

    const handleShowModal = (type, title, message, onConfirm = null) => {
        setModal({
            show: true, type, title, message,
            onConfirm: onConfirm || (() => setModal(m => ({ ...m, show: false })))
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewAvatar(file);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(file)); 
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        data.append('name', formData.name);
        data.append('gender', formData.gender);
        data.append('nationality', formData.nationality);
        data.append('birthday', formData.birthday);
        data.append('biography', formData.biography);
        data.append('slug', generateSlug(formData.name));
        
        // --- PHẦN SỬA QUAN TRỌNG CHO QUANG DŨNG ---
        if (newAvatar) {
            // 1. Nếu có file mới: Dùng key 'actorImage' khớp với Multer ở Backend
            data.append('actorImage', newAvatar); 
        } else {
            // 2. Nếu không có file mới: Gửi lại tên file cũ thông qua key 'avatar_old' hoặc 'avatar'
            // Để khớp với Controller (let finalAvatar = old[0].avatar), 
            // ta gửi kèm avatar cũ để Backend nhận diện
            data.append('avatar', oldAvatar); 
        }
        // ------------------------------------------

        try {
            await axios.put(`http://localhost:5000/api/actors/update/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            handleShowModal('success', 'THÀNH CÔNG', `Đã cập nhật diễn viên "${formData.name}" thành công!`, () => {
                navigate('/admin/actors');
            });
        } catch (err) {
            console.error("Lỗi update:", err.response?.data);
            handleShowModal('error', 'THẤT BẠI', err.response?.data?.error || 'Lỗi hệ thống khi cập nhật.');
        }
    };

    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <div className="update-header">
                <h2>CẬP NHẬT DIỄN VIÊN</h2>
                <p>Mã diễn viên: <strong>#{id}</strong></p>
            </div>
            
            <form onSubmit={handleSubmit} className="clean-update-form">
                <div className="update-form-grid">
                    <div className="update-field">
                        <label>Họ tên diễn viên</label>
                        <input name="name" value={formData.name} onChange={handleChange} required />
                    </div>

                    <div className="update-field">
                        <label>Slug (URL tự động)</label>
                        <input value={generateSlug(formData.name)} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                    </div>

                    <div className="update-field">
                        <label>Giới tính</label>
                        <select name="gender" value={formData.gender} onChange={handleChange}>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>

                    <div className="update-field">
                        <label>Quốc tịch</label>
                        <input name="nationality" value={formData.nationality} onChange={handleChange} />
                    </div>

                    <div className="update-field">
                        <label>Ngày sinh</label>
                        <input name="birthday" type="date" value={formData.birthday} onChange={handleChange} required />
                    </div>

                    <div className="update-field full-width">
                        <label>Ảnh đại diện (Avatar)</label>
                        <div className="avatar-update-section" style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            <img 
                                src={preview ? preview : `http://localhost:5000/uploads/actors/${oldAvatar}`} 
                                alt="Avatar" 
                                style={{ 
                                    width: '100px', 
                                    height: '100px', 
                                    objectFit: 'cover', 
                                    borderRadius: '50%', 
                                    border: '3px solid #fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                                onError={(e) => { e.target.src = "https://via.placeholder.com/100?text=No+Image"; }}
                            />
                            <div className="file-input-group">
                                <input type="file" onChange={handleFileChange} accept="image/*" />
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                                    {preview ? "Đã chọn ảnh mới" : "Trống hoặc giữ nguyên ảnh cũ"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="update-field full-width">
                        <label>Tiểu sử / Sự nghiệp</label>
                        <textarea 
                            name="biography" 
                            value={formData.biography} 
                            onChange={handleChange} 
                            rows="6" 
                            placeholder="Nhập vài dòng về diễn viên..."
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button type="submit" className="btn-submit-update">LƯU THAY ĐỔI</button>
                    <button type="button" className="btn-go-back" onClick={() => navigate('/admin/actors')}>HỦY BỎ</button>
                </div>
            </form>
        </div>
    );
};

export default ActorUpdate;