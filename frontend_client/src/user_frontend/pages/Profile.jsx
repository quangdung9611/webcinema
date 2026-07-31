import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import { QRCodeCanvas } from 'qrcode.react';
import '../styles/Profile.css';
import {
    User, ClipboardList, Bell, Pencil, ShieldCheck, Star, Info,
    ChevronRight, Camera, Calendar, Clock, MapPin, ReceiptText, Armchair, Trash2, X,
    Eye, EyeOff
} from 'lucide-react';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingClear, setLoadingClear] = useState(false);

    // state cho avatar
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState('');
    const fileInputRef = useRef(null);

    // State cho form thông tin
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone: '', address: '', username: '', points: 0, user_avatar: ''
    });

    // State cho modal chỉnh sửa hồ sơ
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({ full_name: '', email: '', phone: '' });
    const [editPasswordData, setEditPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [loadingEdit, setLoadingEdit] = useState(false);

    // 👁️ STATE CHO HIỂN THỊ MẬT KHẨU
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // State cho modal chính (thông báo)
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });

    const [activeTab, setActiveTab] = useState('orders');
    const [bookingHistory, setBookingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Hàm fetch lịch sử giao dịch
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/users/booking-history', { withCredentials: true });
            setBookingHistory(res.data.bookings || []);
        } catch (error) {
            console.error("Lỗi fetch lịch sử:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchHistory();
        }
    }, [activeTab]);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                username: user.username || '',
                points: user.points || 0,
                user_avatar: user.user_avatar || ''
            });
        }
    }, [user]);

    // Mở modal chỉnh sửa
    const openEditModal = () => {
        setEditFormData({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
        });
        setEditPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setShowEditModal(true);
    };

    // Đóng modal chỉnh sửa
    const closeEditModal = () => {
        setShowEditModal(false);
        setEditPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setLoadingEdit(false);
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    // Xử lý submit chỉnh sửa
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const { oldPassword, newPassword, confirmPassword } = editPasswordData;

        if (newPassword && newPassword !== confirmPassword) {
            setModal({
                show: true,
                type: 'error',
                title: 'Lỗi',
                message: 'Mật khẩu xác nhận không khớp!',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
            return;
        }

        if (newPassword && !oldPassword) {
            setModal({
                show: true,
                type: 'error',
                title: 'Lỗi',
                message: 'Vui lòng nhập mật khẩu cũ để đổi mật khẩu mới!',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
            return;
        }

        setLoadingEdit(true);
        try {
            const updateData = {
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone,
            };
            if (oldPassword && newPassword) {
                updateData.oldPassword = oldPassword;
                updateData.newPassword = newPassword;
                updateData.confirmPassword = confirmPassword;
            }

            await axios.put('https://api.quangdungcinema.id.vn/api/users/profile', updateData, { withCredentials: true });

            setFormData(prev => ({
                ...prev,
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone,
            }));

            setModal({
                show: true,
                type: 'success',
                title: 'Thành công',
                message: 'Hồ sơ đã được cập nhật!',
                onConfirm: () => {
                    setModal(prev => ({ ...prev, show: false }));
                    checkAuth();
                }
            });
            closeEditModal();
        } catch (error) {
            console.error('Update error:', error);
            setModal({
                show: true,
                type: 'error',
                title: 'Thất bại',
                message: error.response?.data?.error || 'Có lỗi xảy ra!',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        } finally {
            setLoadingEdit(false);
        }
    };

    // --- XÓA LỊCH SỬ ---
    const handleClearHistory = async () => {
        setLoadingClear(true);
        try {
            const res = await axios.delete('https://api.quangdungcinema.id.vn/api/users/booking-history', { withCredentials: true });

            if (res.data.success) {
                setBookingHistory([]);
                setFormData(prev => ({ ...prev, points: 0 }));

                setModal({
                    show: true,
                    type: 'success',
                    title: 'Thành công',
                    message: 'Đã xóa sạch lịch sử và điểm thưởng!',
                    onConfirm: () => {
                        setModal(prev => ({ ...prev, show: false }));
                        checkAuth();
                    }
                });
            }
        } catch (error) {
            console.error("Lỗi xóa:", error);
            setModal({
                show: true,
                type: 'error',
                title: 'Lỗi',
                message: 'Không thể xóa lịch sử lúc này.',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        } finally {
            setLoadingClear(false);
        }
    };

    const confirmClearHistory = () => {
        setModal({
            show: true,
            type: 'warning',
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc muốn xóa sạch lịch sử và đưa điểm về 0 không?',
            onConfirm: () => handleClearHistory()
        });
    };

    // --- AVATAR ---
    const openFileSelector = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setModal({
                show: true,
                type: 'error',
                title: 'Sai định dạng',
                message: 'Vui lòng chọn file ảnh.',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setModal({
                show: true,
                type: 'error',
                title: 'Kích thước quá lớn',
                message: 'Ảnh không được vượt quá 5MB.',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);

        setUploadingAvatar(true);
        const formDataUpload = new FormData();
        formDataUpload.append('user_avatar', file);

        try {
            const res = await axios.post(
                'https://api.quangdungcinema.id.vn/api/users/avatar',
                formDataUpload,
                {
                    withCredentials: true,
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            if (res.data.success) {
                setFormData(prev => ({ ...prev, user_avatar: res.data.data.avatar }));
                await checkAuth();
                setModal({
                    show: true,
                    type: 'success',
                    title: 'Thành công',
                    message: 'Đã cập nhật ảnh đại diện!',
                    onConfirm: () => setModal(prev => ({ ...prev, show: false }))
                });
                setAvatarPreview('');
            }
        } catch (error) {
            console.error('Upload avatar error:', error);
            setModal({
                show: true,
                type: 'error',
                title: 'Lỗi',
                message: error.response?.data?.message || 'Không thể tải ảnh lên.',
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
            setAvatarPreview('');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    const avatarUrl = avatarPreview || (formData.user_avatar ?
        (formData.user_avatar.startsWith('http') ? formData.user_avatar : `https://api.quangdungcinema.id.vn/uploads/avatars/${formData.user_avatar}`)
        : '');

    if (!user) return <div className="loader">Đang tải...</div>;

    return (
        <div className="galaxy-profile-wrapper">
            <div className="container">
                <div className="profile-layout-grid">
                    {/* SIDEBAR BÊN TRÁI */}
                    <aside className="galaxy-sidebar">
                        <div className="user-card-top">
                            <div className="avatar-wrapper" onClick={openFileSelector} style={{ cursor: 'pointer' }}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="avatar" className="avatar-img" />
                                ) : (
                                    <div className="avatar-main">{formData.full_name?.charAt(0).toUpperCase()}</div>
                                )}
                                <div className="camera-icon">
                                    {uploadingAvatar ? <span className="spinner-small"></span> : <Camera size={14} />}
                                </div>
                            </div>
                            <div className="user-titles">
                                <h3>{formData.full_name}</h3>
                                <div className="star-badge">
                                    <Star size={14} fill="#f37021" color="#f37021" />
                                    <span>{Math.floor(formData.points / 10000)} Stars</span>
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

                        <div className="star-progress-container">
                            <div className="progress-bar-track">
                                <div className="progress-fill" style={{ width: `${Math.min((formData.points / 4000000) * 100, 100)}%` }}></div>
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
                            <div className="nav-link">HOTLINE: 19002224 <ChevronRight size={16} /></div>
                            <div className="nav-link">Email: hotro@galaxystudio.vn <ChevronRight size={16} /></div>
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
                                <div className="profile-info-view">
                                    <div className="profile-info-item">
                                        <span className="label">Họ và tên</span>
                                        <span className="value">{formData.full_name}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label">Email</span>
                                        <span className="value">{formData.email}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label">Số điện thoại</span>
                                        <span className="value">{formData.phone}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label">Ngày sinh</span>
                                        <span className="value">02/09/2004</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label">Điểm thưởng</span>
                                        <span className="value">{formData.points} điểm</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label">Hạng thành viên</span>
                                        <span className="value">{formData.points >= 4000000 ? 'VIP' : 'Thường'}</span>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn-edit-mode" onClick={openEditModal}>
                                            <Pencil size={16} /> Chỉnh sửa hồ sơ
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="history-tab-content">
                                    {bookingHistory.length > 0 && (
                                        <div className="history-action-bar" style={{ textAlign: 'right', marginBottom: '15px' }}>
                                            <LoadingButton
                                                type="button"
                                                loading={loadingClear}
                                                loadingText="Đang xóa..."
                                                onClick={confirmClearHistory}
                                                disabled={loadingClear}
                                                className="btn-clear-history"
                                                spinnerColor="#ffffff"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    background: '#ff4d4f',
                                                    border: 'none',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    padding: '8px 16px',
                                                    borderRadius: '6px'
                                                }}
                                            >
                                                <Trash2 size={16} /> Xóa lịch sử và điểm
                                            </LoadingButton>
                                        </div>
                                    )}

                                    {loadingHistory ? (
                                        <div className="loading-text">Đang tải lịch sử giao dịch...</div>
                                    ) : bookingHistory.length > 0 ? (
                                        <div className="ticket-list">
                                            {bookingHistory.map((item, index) => (
                                                <div key={index} className="history-ticket-item">
                                                    <div className="ticket-thumb">
                                                        <img src={item.moviePoster?.startsWith('http') ? item.moviePoster : `https://api.quangdungcinema.id.vn/uploads/posters/${item.moviePoster}`} alt="poster" />
                                                    </div>

                                                    <div className="ticket-main-info">
                                                        <h4 className="movie-title-history">{item.movieTitle}</h4>
                                                        <div className="info-row">
                                                            <ReceiptText size={14} />
                                                            <span>Ngày đặt: <strong>{item.bookingDateFull}</strong></span>
                                                        </div>
                                                        <div className="info-row">
                                                            <MapPin size={14} />
                                                            <span>{item.cinemaName} | {item.roomName}</span>
                                                        </div>
                                                        <div className="info-row highlight">
                                                            <Calendar size={14} />
                                                            <span>{item.selectedDate}</span>
                                                            <Clock size={14} style={{ marginLeft: '15px' }} />
                                                            <span>{item.startTime}</span>
                                                        </div>
                                                        <div className="seat-text">
                                                            <Armchair size={14} />
                                                            <span><strong>{item.seatDisplay}</strong></span>
                                                        </div>
                                                        <p className="price-text">Tổng tiền: <span>{Number(item.total_amount).toLocaleString()} đ</span></p>
                                                    </div>

                                                    <div className="ticket-qr-side">
                                                        <span className={`status-label ${item.status === 'Completed' ? 'paid' : 'pending'}`}>
                                                            {item.status === 'Completed' ? 'Đã thanh toán' : 'Chờ xử lý'}
                                                        </span>
                                                        <div className="qr-container-mini">
                                                            <QRCodeCanvas value={`TICKET-${item.bookingId}-${item.ticketPIN}`} size={70} />
                                                        </div>
                                                        <span className="pin-text">PIN: {item.ticketPIN}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-history">
                                            <ClipboardList size={48} color="#444" />
                                            <p>Bạn chưa có giao dịch nào trong năm 2026.</p>
                                            <Link to="/" className="btn-book-now">ĐẶT VÉ NGAY</Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* INPUT FILE AVATAR (ẩn) */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
            />

            {/* MODAL CHUNG THÔNG BÁO */}
            <Modal
                show={modal.show}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm || (() => setModal(prev => ({ ...prev, show: false })))}
            />

            {/* MODAL CHỈNH SỬA HỒ SƠ */}
            {showEditModal && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-container edit-profile-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Chỉnh sửa hồ sơ</h2>
                            <button className="modal-close-btn" onClick={closeEditModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Họ và tên</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={editFormData.full_name}
                                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={editFormData.phone}
                                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="password-section">
                                    <h4>Đổi mật khẩu (tùy chọn)</h4>
                                    
                                    {/* Mật khẩu cũ */}
                                    <div className="form-group">
                                        <label>Mật khẩu cũ</label>
                                        <div className="password-wrapper">
                                            <input
                                                type={showOldPassword ? 'text' : 'password'}
                                                placeholder="Nhập mật khẩu cũ"
                                                value={editPasswordData.oldPassword}
                                                onChange={(e) => setEditPasswordData({ ...editPasswordData, oldPassword: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="toggle-password"
                                                onClick={() => setShowOldPassword(!showOldPassword)}
                                                tabIndex="-1"
                                            >
                                                {showOldPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mật khẩu mới */}
                                    <div className="form-group">
                                        <label>Mật khẩu mới</label>
                                        <div className="password-wrapper">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                placeholder="Nhập mật khẩu mới"
                                                value={editPasswordData.newPassword}
                                                onChange={(e) => setEditPasswordData({ ...editPasswordData, newPassword: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="toggle-password"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                tabIndex="-1"
                                            >
                                                {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Xác nhận mật khẩu */}
                                    <div className="form-group">
                                        <label>Xác nhận mật khẩu</label>
                                        <div className="password-wrapper">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Xác nhận mật khẩu mới"
                                                value={editPasswordData.confirmPassword}
                                                onChange={(e) => setEditPasswordData({ ...editPasswordData, confirmPassword: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className="toggle-password"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                tabIndex="-1"
                                            >
                                                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={closeEditModal}>Hủy</button>
                                <LoadingButton
                                    type="submit"
                                    loading={loadingEdit}
                                    loadingText="Đang lưu..."
                                    disabled={loadingEdit}
                                    className="btn-submit-galaxy"
                                    spinnerColor="#ffffff"
                                >
                                    Lưu thay đổi
                                </LoadingButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;