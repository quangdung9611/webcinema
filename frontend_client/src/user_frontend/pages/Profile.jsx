import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import { QRCodeCanvas } from 'qrcode.react';

import '../styles/Profile.css';

import {
    User,
    ClipboardList,
    Bell,
    Pencil,
    ShieldCheck,
    Star,
    Info,
    ChevronRight,
    Camera,
    Calendar,
    Clock,
    MapPin,
    ReceiptText,
    Armchair,
    Trash2,
    X,
    Eye,
    EyeOff
} from 'lucide-react';

const Profile = () => {
    // =========================================================
    // STATE: USER DATA
    // =========================================================
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [avatarPreview, setAvatarPreview] = useState('');
    const fileInputRef = useRef(null);

    // =========================================================
    // STATE: FORM
    // =========================================================
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        username: '',
        points: 0,
        user_avatar: ''
    });

    // =========================================================
    // STATE: EDIT MODAL
    // =========================================================
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        email: '',
        phone: ''
    });
    const [editPasswordData, setEditPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loadingEdit, setLoadingEdit] = useState(false);

    // =========================================================
    // STATE: PASSWORD VISIBILITY
    // =========================================================
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // =========================================================
    // STATE: MODAL
    // =========================================================
    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // =========================================================
    // STATE: TAB
    // =========================================================
    const [activeTab, setActiveTab] = useState('orders');

    // =========================================================
    // STATE: BOOKING HISTORY
    // =========================================================
    const [bookingHistory, setBookingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingClear, setLoadingClear] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // =========================================================
    // FETCH USER PROFILE
    // =========================================================
    const fetchUserProfile = async () => {
        setLoadingUser(true);
        try {
            const res = await api.get('/api/users/profile');
            if (res.data.success) {
                const userData = res.data.data;
                setUser(userData);
                setFormData({
                    full_name: userData.full_name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    address: userData.address || '',
                    username: userData.username || '',
                    points: userData.points || 0,
                    user_avatar: userData.user_avatar || ''
                });
            }
        } catch (error) {
            console.error('Lỗi lấy profile:', error);
            // Nếu 401, có thể redirect sang login
            if (error.response?.status === 401) {
                window.location.href = '/login';
            }
        } finally {
            setLoadingUser(false);
        }
    };

    // =========================================================
    // FETCH BOOKING HISTORY
    // =========================================================
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get('/api/users/booking-history');
            setBookingHistory(res.data.bookings || []);
        } catch (error) {
            console.error('Lỗi fetch lịch sử:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // =========================================================
    // EFFECT: FETCH PROFILE ON MOUNT
    // =========================================================
    useEffect(() => {
        fetchUserProfile();
    }, []);

    // =========================================================
    // EFFECT: FETCH HISTORY WHEN TAB = ORDERS
    // =========================================================
    useEffect(() => {
        if (activeTab === 'orders') {
            fetchHistory();
        }
    }, [activeTab]);

    // =========================================================
    // MODAL HELPERS
    // =========================================================
    const showModal = (type, title, message, onConfirm = null) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    const closeModal = () => {
        setModal(prev => ({ ...prev, show: false }));
    };

    // =========================================================
    // OPEN EDIT MODAL
    // =========================================================
    const openEditModal = () => {
        setEditFormData({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone
        });
        setEditPasswordData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditPasswordData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setLoadingEdit(false);
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    // =========================================================
    // SUBMIT EDIT PROFILE
    // =========================================================
    const handleEditSubmit = async (e) => {
        e.preventDefault();

        const { oldPassword, newPassword, confirmPassword } = editPasswordData;

        if (newPassword && newPassword !== confirmPassword) {
            showModal('error', 'Lỗi', 'Mật khẩu xác nhận không khớp!');
            return;
        }

        if (newPassword && !oldPassword) {
            showModal('error', 'Lỗi', 'Vui lòng nhập mật khẩu cũ để đổi mật khẩu mới!');
            return;
        }

        setLoadingEdit(true);

        try {
            const updateData = {
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone
            };

            if (oldPassword && newPassword) {
                updateData.oldPassword = oldPassword;
                updateData.newPassword = newPassword;
                updateData.confirmPassword = confirmPassword;
            }

            await api.put('/api/users/profile', updateData);

            // Cập nhật state local
            setFormData(prev => ({
                ...prev,
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone
            }));

            // Refresh lại profile từ server
            await fetchUserProfile();

            closeEditModal();
            showModal('success', 'Thành công', 'Hồ sơ đã được cập nhật!');

        } catch (error) {
            console.error('Update error:', error);
            showModal(
                'error',
                'Thất bại',
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Có lỗi xảy ra!'
            );
        } finally {
            setLoadingEdit(false);
        }
    };

    // =========================================================
    // CLEAR BOOKING HISTORY
    // =========================================================
    const handleClearHistory = async () => {
        setLoadingClear(true);
        try {
            const res = await api.delete('/api/users/booking-history');
            if (res.data.success) {
                setBookingHistory([]);
                setFormData(prev => ({ ...prev, points: 0 }));
                // Refresh lại profile để lấy điểm mới
                await fetchUserProfile();
                showModal('success', 'Thành công', 'Đã xóa sạch lịch sử và điểm thưởng!');
            }
        } catch (error) {
            console.error('Lỗi xóa:', error);
            showModal('error', 'Lỗi', 'Không thể xóa lịch sử lúc này.');
        } finally {
            setLoadingClear(false);
        }
    };

    const confirmClearHistory = () => {
        showModal(
            'warning',
            'Xác nhận xóa',
            'Bạn có chắc muốn xóa sạch lịch sử và đưa điểm về 0 không?',
            handleClearHistory
        );
    };

    // =========================================================
    // AVATAR HANDLERS
    // =========================================================
    const openFileSelector = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showModal('error', 'Sai định dạng', 'Vui lòng chọn file ảnh.');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showModal('error', 'Kích thước quá lớn', 'Ảnh không được vượt quá 5MB.');
            e.target.value = '';
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);

        setUploadingAvatar(true);

        const formDataUpload = new FormData();
        formDataUpload.append('user_avatar', file);

        try {
            const res = await api.post('/api/users/avatar', formDataUpload);
            if (res.data.success) {
                setFormData(prev => ({
                    ...prev,
                    user_avatar: res.data.data.avatar
                }));
                await fetchUserProfile();
                showModal('success', 'Thành công', 'Đã cập nhật ảnh đại diện!');
                setAvatarPreview('');
            }
        } catch (error) {
            console.error('Upload avatar error:', error);
            showModal(
                'error',
                'Lỗi',
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Không thể tải ảnh lên.'
            );
            setAvatarPreview('');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    // =========================================================
    // AVATAR URL
    // =========================================================
    const avatarUrl =
        avatarPreview ||
        (formData.user_avatar
            ? formData.user_avatar.startsWith('http')
                ? formData.user_avatar
                : `https://api.quangdungcinema.id.vn/uploads/avatars/${formData.user_avatar}`
            : '');

    // =========================================================
    // RENDER LOADING
    // =========================================================
    if (loadingUser) {
        return <div className="loader">Đang tải...</div>;
    }

    // Nếu không có user (chưa đăng nhập) -> chuyển hướng hoặc hiển thị thông báo
    if (!user) {
        return (
            <div className="loader">
                <p>Vui lòng đăng nhập để xem hồ sơ.</p>
                <Link to="/login" className="btn-book-now">Đăng nhập</Link>
            </div>
        );
    }

    // =========================================================
    // RENDER MAIN
    // =========================================================
    return (
        <div className="galaxy-profile-wrapper">
            <div className="container">
                <div className="profile-layout-grid">

                    {/* =================================================
                        SIDEBAR
                    ================================================= */}
                    <aside className="galaxy-sidebar">
                        <div className="user-card-top">
                            <div
                                className="avatar-wrapper"
                                onClick={openFileSelector}
                                style={{ cursor: 'pointer' }}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="avatar" className="avatar-img" />
                                ) : (
                                    <div className="avatar-main">
                                        {formData.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="camera-icon">
                                    {uploadingAvatar ? (
                                        <span className="spinner-small"></span>
                                    ) : (
                                        <Camera size={14} />
                                    )}
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
                            <div className="spending-value">
                                {Number(formData.points).toLocaleString()} đ
                            </div>
                        </div>

                        <div className="star-progress-container">
                            <div className="progress-bar-track">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${Math.min((formData.points / 4000000) * 100, 100)}%`
                                    }}
                                />
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
                            <div className="nav-link">
                                HOTLINE: 19002224 <ChevronRight size={16} />
                            </div>
                            <div className="nav-link">
                                Email: hotro@galaxystudio.vn <ChevronRight size={16} />
                            </div>
                        </nav>
                    </aside>

                    {/* =================================================
                        MAIN CONTENT
                    ================================================= */}
                    <main className="galaxy-content-area">
                        <div className="tabs-header">
                            <button
                                className={activeTab === 'orders' ? 'active' : ''}
                                onClick={() => setActiveTab('orders')}
                            >
                                Lịch sử giao dịch
                            </button>
                            <button
                                className={activeTab === 'profile' ? 'active' : ''}
                                onClick={() => setActiveTab('profile')}
                            >
                                Thông tin cá nhân
                            </button>
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
                                        <span className="value">
                                            {formData.points >= 4000000 ? 'VIP' : 'Thường'}
                                        </span>
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
                                                        <img
                                                            src={
                                                                item.moviePoster?.startsWith('http')
                                                                    ? item.moviePoster
                                                                    : `https://api.quangdungcinema.id.vn/uploads/posters/${item.moviePoster}`
                                                            }
                                                            alt="poster"
                                                        />
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
                                                        <p className="price-text">
                                                            Tổng tiền: <span>{Number(item.total_amount).toLocaleString()} đ</span>
                                                        </p>
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

            {/* =================================================
                HIDDEN FILE INPUT
            ================================================= */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
            />

            {/* =================================================
                COMMON MODAL
            ================================================= */}
            <Modal
                show={modal.show}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm || closeModal}
            />

            {/* =================================================
                EDIT PROFILE MODAL
            ================================================= */}
            {showEditModal && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-container edit-profile-modal" onClick={e => e.stopPropagation()}>
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
                                        onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editFormData.email}
                                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={editFormData.phone}
                                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="password-section">
                                    <h4>Đổi mật khẩu (tùy chọn)</h4>
                                    <div className="form-group">
                                        <label>Mật khẩu cũ</label>
                                        <div className="password-wrapper">
                                            <input
                                                type={showOldPassword ? 'text' : 'password'}
                                                placeholder="Nhập mật khẩu cũ"
                                                value={editPasswordData.oldPassword}
                                                onChange={e => setEditPasswordData({ ...editPasswordData, oldPassword: e.target.value })}
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
                                    <div className="form-group">
                                        <label>Mật khẩu mới</label>
                                        <div className="password-wrapper">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                placeholder="Nhập mật khẩu mới"
                                                value={editPasswordData.newPassword}
                                                onChange={e => setEditPasswordData({ ...editPasswordData, newPassword: e.target.value })}
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
                                    <div className="form-group">
                                        <label>Xác nhận mật khẩu</label>
                                        <div className="password-wrapper">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Xác nhận mật khẩu mới"
                                                value={editPasswordData.confirmPassword}
                                                onChange={e => setEditPasswordData({ ...editPasswordData, confirmPassword: e.target.value })}
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