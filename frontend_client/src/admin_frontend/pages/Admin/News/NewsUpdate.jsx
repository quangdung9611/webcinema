import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

// --- HELPERS: TẠO SLUG TỰ ĐỘNG ---
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

const NewsUpdate = () => {
    const { news_id } = useParams(); 
    const navigate = useNavigate();

    // 1. STATE MANAGEMENT
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    });

    const [oldImage, setOldImage] = useState(''); 
    const [newImage, setNewImage] = useState(null); 
    const [preview, setPreview] = useState(null); 
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });

    // 2. EFFECT: LẤY DỮ LIỆU CŨ TỪ API DETAIL
    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/news/detail/${news_id}`);
                const news = res.data;

                setFormData({
                    title: news.title || '',
                    content: news.content || ''
                });
                setOldImage(news.image_url);
            } catch (err) {
                console.error("Lỗi fetch tin tức:", err);
                handleShowModal('error', 'LỖI', 'Không thể tải thông tin bài viết. ID có thể không tồn tại.');
            }
        };
        if (news_id) fetchNews();
    }, [news_id]);

    // 3. HANDLERS
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
            setNewImage(file);
            setPreview(URL.createObjectURL(file)); 
        }
    };

    // 4. SUBMIT: CẬP NHẬT
    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        
        // NÊN: Append các trường text trước để Multer xử lý req.body tốt hơn
        data.append('title', formData.title);
        data.append('slug', generateSlug(formData.title)); 
        data.append('content', formData.content);
        
        if (newImage) {
            // Tên key 'newsImage' phải khớp với upload.single('newsImage') ở Backend
            data.append('newsImage', newImage); 
        } else {
            // Nếu không có ảnh mới, gửi lại tên ảnh cũ để Backend giữ nguyên
            data.append('image_url', oldImage); 
        }

        try {
            await axios.put(`http://localhost:5000/api/news/update/${news_id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            handleShowModal('success', 'THÀNH CÔNG', `Đã cập nhật bài viết "${formData.title}" thành công!`, () => {
                navigate('/admin/news');
            });
        } catch (err) {
            console.error("Lỗi cập nhật tin tức:", err.response?.data);
            handleShowModal('error', 'THẤT BẠI', err.response?.data?.message || 'Lỗi hệ thống khi cập nhật.');
        }
    };

    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <div className="update-header">
                <h2>CẬP NHẬT BÀI VIẾT</h2>
                <p>Mã bài viết: <strong>#{news_id}</strong></p>
            </div>
            
            <form onSubmit={handleSubmit} className="clean-update-form">
                <div className="update-form-grid">
                    
                    <div className="update-field full-width">
                        <label>Tiêu đề bài viết</label>
                        <input name="title" value={formData.title} onChange={handleChange} required />
                    </div>

                    <div className="update-field full-width">
                        <label>Slug (URL tự động)</label>
                        <input value={generateSlug(formData.title)} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                    </div>

                    <div className="update-field full-width">
                        <label>Hình ảnh bài viết</label>
                        <div className="poster-update-section" style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                            <img 
                                src={preview ? preview : `http://localhost:5000/uploads/news/${oldImage}`} 
                                alt="News" 
                                style={{ width: '180px', height: '110px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                // Đã loại bỏ onError theo yêu cầu
                            />
                            <div className="file-input-group">
                                <input type="file" onChange={handleFileChange} accept="image/*" />
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                                    {preview ? "Đã chọn ảnh mới" : "Giữ nguyên nếu không muốn thay đổi ảnh cũ"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="update-field full-width">
                        <label>Nội dung chi tiết bài viết</label>
                        <textarea 
                            name="content" 
                            value={formData.content} 
                            onChange={handleChange} 
                            rows="12" 
                            placeholder="Nhập nội dung bài viết..."
                            required
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button type="submit" className="btn-submit-update">LƯU THAY ĐỔI</button>
                    <button type="button" className="btn-go-back" onClick={() => navigate('/admin/news')}>HỦY BỎ</button>
                </div>
            </form>
        </div>
    );
};

export default NewsUpdate;