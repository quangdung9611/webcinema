import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Modal from '../../admin_frontend/components/Modal';
import '../styles/Profile.css';
import { User, ClipboardList, Bell, Pencil, ShieldCheck, Star, Info, ChevronRight, Camera } from 'lucide-react';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({ 
        full_name: '', email: '', phone: '', address: '', username: '', points: 0 
    });
    
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '' });
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
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
            setModal({ show: true, type: 'success', title: 'Thành công', message: 'Hồ sơ đã được cập nhật!' });
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
        <div className="galaxy-profile-wrapper">
            <div className="container">
                <div className="profile-layout-grid">
                    {/* SIDEBAR BÊN TRÁI - GALAXY STYLE */}
                    <aside className="galaxy-sidebar">
                        <div className="user-card-top">
                            <div className="avatar-wrapper">
                                <div className="avatar-main">{formData.full_name?.charAt(0).toUpperCase()}</div>
                                <div className="camera-icon"><Camera size={14} /></div>
                            </div>
                            <div className="user-titles">
                                <h3>{formData.full_name}</h3>
                                <div className="star-badge">
                                    <Star size={14} fill="#f37021" color="#f37021" />
                                    <span>0 Stars</span>
                                </div>
                            </div>
                        </div>

                        <div className="spending-summary">
                            <div className="spending-header">
                                <span>Tổng chi tiêu 2026</span>
                                <Info size={14} />
                            </div>
                            <div className="spending-value">{Number(formData.points).toLocaleString()} đ</div>
                        </div>

                        {/* Thanh tiến trình Stars */}
                        <div className="star-progress-container">
                            <div className="progress-bar-track">
                                <div className="progress-fill" style={{width: '5%'}}></div>
                                <div className="dot d-0 active"></div>
                                <div className="dot d-2"></div>
                                <div className="dot d-4"></div>
                            </div>
                            <div className="progress-labels">
                                <span>0 đ</span>
                                <span>2.000.000 đ</span>
                                <span>4.000.000 đ</span>
                            </div>
                        </div>

                        <nav className="galaxy-nav-menu">
                            <div className="nav-link">HOTLINE hỗ trợ: 19002224 <ChevronRight size={16}/></div>
                            <div className="nav-link">Email: hotro@galaxystudio.vn <ChevronRight size={16}/></div>
                            <div className="nav-link">Câu hỏi thường gặp <ChevronRight size={16}/></div>
                        </nav>
                    </aside>

                    {/* NỘI DUNG CHÍNH BÊN PHẢI */}
                    <main className="galaxy-content-area">
                        <div className="tabs-header">
                            <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Lịch sử giao dịch</button>
                            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Thông tin cá nhân</button>
                            <button>Thông báo</button>
                            <button>Quà tặng</button>
                        </div>

                        <div className="tab-body">
                            {activeTab === 'profile' ? (
                                <form onSubmit={handleSubmit} className="galaxy-profile-form">
                                    <div className="form-grid-2col">
                                        <div className="input-box">
                                            <label>Họ và tên</label>
                                            <input name="full_name" value={formData.full_name} onChange={handleInput} disabled={!isEditing} />
                                        </div>
                                        <div className="input-box">
                                            <label>Ngày sinh</label>
                                            <input type="text" value="02/09/2004" disabled />
                                        </div>
                                        <div className="input-box">
                                            <label>Email</label>
                                            <div className="input-with-action">
                                                <input name="email" value={formData.email} onChange={handleInput} disabled={!isEditing} />
                                                {isEditing && <span className="action-link">Thay đổi</span>}
                                            </div>
                                        </div>
                                        <div className="input-box">
                                            <label>Số điện thoại</label>
                                            <input name="phone" value={formData.phone} onChange={handleInput} disabled={!isEditing} />
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="password-change-section">
                                            <h4><ShieldCheck size={18}/> Đổi mật khẩu</h4>
                                            <div className="form-grid-2col">
                                                <input type="password" name="oldPassword" placeholder="Mật khẩu cũ" onChange={handlePass} />
                                                <input type="password" name="newPassword" placeholder="Mật khẩu mới" onChange={handlePass} />
                                                <input type="password" name="confirmPassword" placeholder="Xác nhận mật khẩu" onChange={handlePass} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        {!isEditing ? (
                                            <button type="button" className="btn-edit-mode" onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</button>
                                        ) : (
                                            <>
                                                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Hủy</button>
                                                <button type="submit" className="btn-submit-galaxy" disabled={loading}>
                                                    {loading ? 'Đang lưu...' : 'Cập nhật'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </form>
                            ) : (
                                <div className="empty-history">
                                    <p>Bạn chưa có giao dịch nào trong năm 2026.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <Modal show={modal.show} type={modal.type} title={modal.title} message={modal.message} 
                   onConfirm={() => setModal({ ...modal, show: false })} />
        </div>
    );
};

export default Profile;