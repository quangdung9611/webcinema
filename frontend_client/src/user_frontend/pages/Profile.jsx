import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Modal from '../../admin_frontend/components/Modal';
import '../styles/Profile.css';
import { User, ClipboardList, Bell, Pencil, ShieldCheck, Star } from 'lucide-react';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // 1. Khởi tạo state với đầy đủ các trường để React quản lý tốt hơn
    const [formData, setFormData] = useState({ 
        full_name: '', 
        email: '', 
        phone: '', 
        address: '', 
        username: '', 
        points: 0 
    });
    
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });
    const [activeTab, setActiveTab] = useState('profile');

    // 2. Sửa lại useEffect để ép dữ liệu từ Backend vào Form (kể cả khi address bị null)
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '', // Đảm bảo lấy được địa chỉ từ Backend
                username: user.username || '',
                points: user.points || 0
            });
        }
    }, [user]);

    const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handlePass = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
            return setModal({ show: true, type: 'error', title: 'Lỗi', message: 'Mật khẩu xác nhận không khớp!' });
        }

        setLoading(true);
        try {
            await axios.put('https://webcinema-zb8z.onrender.com/api/users/profile/update', 
                { ...formData, ...passwordData }, { withCredentials: true });
            
            setModal({ show: true, type: 'success', title: 'Thành công', message: 'Hồ sơ của bạn đã được cập nhật mượt mà!' });
            setIsEditing(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            await checkAuth(); 
        } catch (error) {
            setModal({ show: true, type: 'error', title: 'Thất bại', message: error.response?.data?.error || 'Có lỗi xảy ra!' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="loader">Đang tải...</div>;

    return (
        <div className="shopee-profile-layout">
            <div className="container">
                <div className="profile-grid">
                    <div className="shopee-sidebar">
                        <div className="user-brief">
                            <div className="avatar-small">{formData.full_name?.charAt(0).toUpperCase()}</div>
                            <div className="user-info">
                                <span className="username-display">{formData.username}</span>
                                <div className="edit-text" onClick={() => {setActiveTab('profile'); setIsEditing(true);}} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Pencil size={12} /> Sửa hồ sơ
                                </div>
                            </div>
                        </div>
                        
                        <nav className="sidebar-nav">
                            <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <User size={18} color={activeTab === 'profile' ? '#ee4d2d' : '#555'} /> Tài khoản của tôi
                            </div>
                            <div className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <ClipboardList size={18} color={activeTab === 'orders' ? '#ee4d2d' : '#555'} /> Đơn mua
                            </div>
                            <div className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <Bell size={18} color="#555" /> Thông báo
                            </div>
                        </nav>
                    </div>

                    <div className="shopee-main-content">
                        {activeTab === 'profile' ? (
                            <div className="profile-section">
                                <div className="section-header">
                                    <h2>Hồ sơ của tôi</h2>
                                    <p>Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
                                    <button className={`btn-action-edit ${isEditing ? 'active' : ''}`} onClick={() => setIsEditing(!isEditing)}>
                                        {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                                    </button>
                                </div>

                                <div className="profile-body-flex">
                                    <form onSubmit={handleSubmit} className="form-main">
                                        <div className="form-row-shopee">
                                            <label>Tên đăng nhập</label>
                                            <div className="static-text">{formData.username}</div>
                                        </div>
                                        <div className="form-row-shopee">
                                            <label>Họ tên</label>
                                            <input name="full_name" value={formData.full_name} onChange={handleInput} disabled={!isEditing} />
                                        </div>
                                        <div className="form-row-shopee">
                                            <label>Email</label>
                                            <input name="email" value={formData.email} onChange={handleInput} disabled={!isEditing} />
                                        </div>
                                        <div className="form-row-shopee">
                                            <label>Số điện thoại</label>
                                            <input name="phone" value={formData.phone} onChange={handleInput} disabled={!isEditing} />
                                        </div>
                                        <div className="form-row-shopee">
                                            <label>Địa chỉ</label>
                                            {/* Thêm || "" để chắc chắn input luôn có giá trị */}
                                            <input name="address" value={formData.address || ""} onChange={handleInput} disabled={!isEditing} placeholder="Nhập địa chỉ của bạn" />
                                        </div>

                                        {isEditing && (
                                            <div className="password-box-shopee">
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ShieldCheck size={20} /> Đổi mật khẩu
                                                </h4>
                                                <div className="form-row-shopee">
                                                    <label>Mật khẩu cũ</label>
                                                    <input type="password" name="oldPassword" placeholder="Nhập mật khẩu cũ" onChange={handlePass} />
                                                </div>
                                                <div className="forgot-pass-container">
                                                    <Link to="/forgot-password">Quên mật khẩu?</Link>
                                                </div>
                                                <div className="form-row-shopee">
                                                    <label>Mật khẩu mới</label>
                                                    <input type="password" name="newPassword" placeholder="Mật khẩu mới" onChange={handlePass} />
                                                </div>
                                                <div className="form-row-shopee">
                                                    <label>Xác nhận</label>
                                                    <input type="password" name="confirmPassword" placeholder="Nhập lại mật khẩu" onChange={handlePass} />
                                                </div>
                                            </div>
                                        )}
                                        
                                        {isEditing && (
                                            <button type="submit" className="btn-save-shopee" disabled={loading}>
                                                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                            </button>
                                        )}
                                    </form>

                                    <div className="profile-avatar-side">
                                        <div className="avatar-large">{formData.full_name?.charAt(0).toUpperCase()}</div>
                                        <div className="point-display" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Star size={16} fill="#f1c40f" color="#f1c40f" /> Số điểm: {formData.points}
                                        </div>
                                        <p className="file-info">Dung lượng file tối đa 1 MB <br/> Định dạng: .JPEG, .PNG</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="order-section">
                                <div className="section-header">
                                    <h2>Đơn mua của bạn</h2>
                                </div>
                                <div className="order-card-demo">
                                    <p>Bạn đang có 2 giao dịch trong hệ thống.</p>
                                    <small>(Phần này bạn có thể map dữ liệu từ API bookings)</small>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal 
                show={modal.show} 
                type={modal.type} 
                title={modal.title} 
                message={modal.message} 
                onConfirm={() => setModal({ ...modal, show: false })} 
            />
        </div>
    );
};

export default Profile;