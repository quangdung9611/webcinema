import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import { QRCodeCanvas } from 'qrcode.react';

import '../styles/Profile.css';

import {
    User,
    ClipboardList,
    Pencil,
    Star,
    Info,
    ChevronRight,
    Camera,
    Calendar,
    Clock,
    MapPin,
    ReceiptText,
    Armchair,
    X,
    Eye,
    EyeOff,
    KeyRound,
    UserCircle,
    Lock,
    Smartphone,
    Mail,
    Home,
    ShieldCheck,
    Save,
    HelpCircle
} from 'lucide-react';

const Profile = () => {
    const navigate = useNavigate();

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
    // STATE: EDIT PROFILE
    // =========================================================
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [loadingEdit, setLoadingEdit] = useState(false);

    // =========================================================
    // STATE: CHANGE PASSWORD MODAL
    // =========================================================
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // =========================================================
    // STATE: CHANGE PIN MODAL
    // =========================================================
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinData, setPinData] = useState({
        oldPin: '',
        newPin: '',
        confirmPin: ''
    });
    const [loadingPin, setLoadingPin] = useState(false);
    const [showOldPin, setShowOldPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const pinInputRefs = useRef([]);

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
    // STATE: TAB & FILTER
    // =========================================================
    const [activeTab, setActiveTab] = useState('orders');
    const [bookingHistory, setBookingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

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
                setEditFormData({
                    full_name: userData.full_name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    address: userData.address || ''
                });
            }
        } catch (error) {
            console.error('Lỗi lấy profile:', error);
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
    // EFFECTS
    // =========================================================
    useEffect(() => {
        fetchUserProfile();
    }, []);

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
    // FILTER FUNCTION
    // =========================================================
    const getFilteredBookings = () => {
        if (!filterFrom && !filterTo) return bookingHistory;
        return bookingHistory.filter(item => {
            const dateStr = item.bookingDateFull || item.bookingDate || '';
            const parts = dateStr.split(' ')[0].split('/');
            if (parts.length !== 3) return true;
            const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
            const fromDate = filterFrom ? new Date(filterFrom) : null;
            const toDate = filterTo ? new Date(filterTo) : null;
            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;
            return true;
        });
    };

    const filteredBookings = getFilteredBookings();

    // =========================================================
    // HANDLE FORGOT PASSWORD - CHUYỂN TRANG
    // =========================================================
    const handleForgotPassword = () => {
        navigate('/forgot-password');
    };

    // =========================================================
    // HANDLE FORGOT PIN - CHUYỂN TRANG
    // =========================================================
    const handleForgotPin = () => {
        navigate('/forgot-pin');
    };

    // =========================================================
    // SUBMIT EDIT PROFILE
    // =========================================================
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setLoadingEdit(true);

        try {
            await api.put('/api/users/profile', {
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone,
                address: editFormData.address
            });

            setFormData(prev => ({
                ...prev,
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone,
                address: editFormData.address
            }));

            await fetchUserProfile();
            showModal('success', 'Thành công', 'Thông tin cá nhân đã được cập nhật!');

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
    // SUBMIT CHANGE PASSWORD (MODAL)
    // =========================================================
    const handleChangePassword = async (e) => {
        e.preventDefault();

        const { oldPassword, newPassword, confirmPassword } = passwordData;

        if (!oldPassword) {
            showModal('error', 'Lỗi', 'Vui lòng nhập mật khẩu cũ!');
            return;
        }

        if (!newPassword) {
            showModal('error', 'Lỗi', 'Vui lòng nhập mật khẩu mới!');
            return;
        }

        if (newPassword !== confirmPassword) {
            showModal('error', 'Lỗi', 'Mật khẩu xác nhận không khớp!');
            return;
        }

        setLoadingPassword(true);

        try {
            await api.post('/api/auth/change-password', {
                currentPassword: oldPassword,
                newPassword: newPassword
            });

            setPasswordData({
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setShowPasswordModal(false);
            showModal('success', 'Thành công', 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');

        } catch (error) {
            console.error('Change password error:', error);
            showModal(
                'error',
                'Thất bại',
                error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu!'
            );
        } finally {
            setLoadingPassword(false);
        }
    };

    // =========================================================
    // SUBMIT CHANGE PIN (MODAL)
    // =========================================================
    const handleChangePin = async (e) => {
        e.preventDefault();

        const { oldPin, newPin, confirmPin } = pinData;

        if (!oldPin) {
            showModal('error', 'Lỗi', 'Vui lòng nhập mã PIN hiện tại!');
            return;
        }

        if (!newPin) {
            showModal('error', 'Lỗi', 'Vui lòng nhập mã PIN mới!');
            return;
        }

        if (newPin !== confirmPin) {
            showModal('error', 'Lỗi', 'Mã PIN xác nhận không khớp!');
            return;
        }

        if (!/^\d{6}$/.test(newPin)) {
            showModal('error', 'Lỗi', 'Mã PIN mới phải là 6 chữ số!');
            return;
        }

        setLoadingPin(true);

        try {
            await api.put('/api/users/pin', {
                oldPin: oldPin,
                newPin: newPin
            });

            setPinData({
                oldPin: '',
                newPin: '',
                confirmPin: ''
            });
            setShowPinModal(false);
            showModal('success', 'Thành công', 'Đổi mã PIN thành công!');

        } catch (error) {
            console.error('Change PIN error:', error);
            showModal(
                'error',
                'Thất bại',
                error.response?.data?.message || 'Có lỗi xảy ra khi đổi mã PIN!'
            );
        } finally {
            setLoadingPin(false);
        }
    };

    // =========================================================
    // PIN INPUT HANDLERS
    // =========================================================
    const handlePinInputChange = (index, value, field) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        const newVal = pinData[field].split('');
        newVal[index] = clean;
        setPinData({ ...pinData, [field]: newVal.join('') });

        if (clean && index < 5) {
            pinInputRefs.current[`${field}-${index + 1}`]?.focus();
        }
    };

    const handlePinKeyDown = (index, e, field) => {
        if (e.key === 'Backspace' && !pinData[field][index] && index > 0) {
            pinInputRefs.current[`${field}-${index - 1}`]?.focus();
        }
    };

    // =========================================================
    // RENDER LOADING
    // =========================================================
    if (loadingUser) {
        return <div className="loader">Đang tải...</div>;
    }

    if (!user) {
        return (
            <div className="loader">
                <p>Vui lòng đăng nhập để xem hồ sơ.</p>
                <Link to="/login" className="btn-book-now">Đăng nhập</Link>
            </div>
        );
    }

    // =========================================================
    // RENDER PIN INPUTS
    // =========================================================
    const renderPinInputs = (field, value, placeholder, showState, setShowState) => {
        return (
            <div className="form-group">
                <label>{placeholder}</label>
                <div className="password-wrapper">
                    <div className="pin-input-group">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <input
                                key={idx}
                                ref={(el) => (pinInputRefs.current[`${field}-${idx}`] = el)}
                                type={showState ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={1}
                                value={value[idx] || ''}
                                onChange={(e) => handlePinInputChange(idx, e.target.value, field)}
                                onKeyDown={(e) => handlePinKeyDown(idx, e, field)}
                                className="pin-input-circle"
                                autoComplete="off"
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        className="toggle-password pin-toggle"
                        onClick={() => setShowState(!showState)}
                        tabIndex="-1"
                    >
                        {showState ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                </div>
            </div>
        );
    };

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
                            <div className="nav-link" onClick={handleForgotPassword} style={{ cursor: 'pointer' }}>
                                <HelpCircle size={16} /> Quên mật khẩu <ChevronRight size={16} />
                            </div>
                            <div className="nav-link" onClick={handleForgotPin} style={{ cursor: 'pointer' }}>
                                <KeyRound size={16} /> Quên mã PIN <ChevronRight size={16} />
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
                                <ClipboardList size={16} /> Lịch sử giao dịch
                            </button>
                            <button
                                className={activeTab === 'profile' ? 'active' : ''}
                                onClick={() => setActiveTab('profile')}
                            >
                                <UserCircle size={16} /> Thông tin cá nhân
                            </button>
                            <button
                                className={activeTab === 'edit' ? 'active' : ''}
                                onClick={() => setActiveTab('edit')}
                            >
                                <Pencil size={16} /> Chỉnh sửa hồ sơ
                            </button>
                        </div>

                        <div className="tab-body">
                            {/* =================================================
                                TAB: ORDERS
                            ================================================= */}
                            {activeTab === 'orders' && (
                                <div className="history-tab-content">
                                    <div className="history-filter-bar">
                                        <div className="filter-group">
                                            <label>Từ ngày</label>
                                            <input
                                                type="date"
                                                value={filterFrom}
                                                onChange={e => setFilterFrom(e.target.value)}
                                            />
                                        </div>
                                        <div className="filter-group">
                                            <label>Đến ngày</label>
                                            <input
                                                type="date"
                                                value={filterTo}
                                                onChange={e => setFilterTo(e.target.value)}
                                            />
                                        </div>
                                        <button className="btn-filter" onClick={() => {}}>
                                            Lọc
                                        </button>
                                        {(filterFrom || filterTo) && (
                                            <button
                                                className="btn-filter-clear"
                                                onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                                            >
                                                Xóa lọc
                                            </button>
                                        )}
                                    </div>

                                    {loadingHistory ? (
                                        <div className="loading-text">Đang tải lịch sử giao dịch...</div>
                                    ) : filteredBookings.length > 0 ? (
                                        <div className="ticket-list">
                                            {filteredBookings.map((item, index) => (
                                                <div key={index} className="history-ticket-item">
                                                    <div className="ticket-thumb">
                                                        <img
                                                            src={
                                                                item.moviePoster?.startsWith('http')
                                                                    ? item.moviePoster
                                                                    : `https://api.quangdungcinema.id.vn/uploads/posters/${item.moviePoster}`
                                                            }
                                                            alt="poster"
                                                            onError={(e) => e.target.src = '/default-poster.jpg'}
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
                                                            Tổng tiền: <span>{item.totalAmount ? Number(item.totalAmount).toLocaleString() : '0'} đ</span>
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
                                            <p>
                                                {bookingHistory.length === 0
                                                    ? 'Bạn chưa có giao dịch nào trong năm 2026.'
                                                    : 'Không có giao dịch nào trong khoảng thời gian này.'}
                                            </p>
                                            <Link to="/" className="btn-book-now">ĐẶT VÉ NGAY</Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* =================================================
                                TAB: PROFILE - CHỈ HIỂN THỊ THÔNG TIN
                            ================================================= */}
                            {activeTab === 'profile' && (
                                <div className="profile-info-view">
                                    <div className="profile-info-item">
                                        <span className="label"><User size={16} /> Họ và tên</span>
                                        <span className="value">{formData.full_name}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label"><User size={16} /> Tên đăng nhập</span>
                                        <span className="value">{formData.username}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label"><Mail size={16} /> Email</span>
                                        <span className="value">{formData.email}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label"><Smartphone size={16} /> Số điện thoại</span>
                                        <span className="value">{formData.phone || 'Chưa cập nhật'}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label"><Home size={16} /> Địa chỉ</span>
                                        <span className="value">{formData.address || 'Chưa cập nhật'}</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label"><Star size={16} /> Điểm thưởng</span>
                                        <span className="value">{formData.points} điểm</span>
                                    </div>
                                    <div className="profile-info-item">
                                        <span className="label"><Star size={16} /> Hạng thành viên</span>
                                        <span className="value">
                                            {formData.points >= 4000000 ? '⭐ VIP' : '🌟 Thường'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* =================================================
                                TAB: EDIT - CHỈNH SỬA HỒ SƠ
                            ================================================= */}
                            {activeTab === 'edit' && (
                                <div className="profile-edit-view">
                                    <div className="edit-header">
                                        <h3>🔧 Chỉnh sửa hồ sơ</h3>
                                        <button 
                                            className="btn-back-profile" 
                                            onClick={() => setActiveTab('profile')}
                                        >
                                            ← Quay lại
                                        </button>
                                    </div>

                                    {/* =============================================
                                        PHẦN 1: THÔNG TIN CƠ BẢN
                                    ============================================= */}
                                    <div className="edit-section">
                                        <h4 className="section-title">
                                            <User size={18} /> Thông tin cơ bản
                                        </h4>
                                        <form onSubmit={handleEditSubmit}>
                                            <div className="form-group">
                                                <label>Họ và tên</label>
                                                <input
                                                    type="text"
                                                    name="full_name"
                                                    value={editFormData.full_name}
                                                    onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                                    required
                                                    className="auth-input"
                                                    placeholder="Nhập họ và tên"
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
                                                    className="auth-input"
                                                    placeholder="Nhập email"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Số điện thoại</label>
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={editFormData.phone}
                                                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                    className="auth-input"
                                                    placeholder="Nhập số điện thoại"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Địa chỉ</label>
                                                <input
                                                    type="text"
                                                    name="address"
                                                    value={editFormData.address}
                                                    onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                                                    className="auth-input"
                                                    placeholder="Nhập địa chỉ"
                                                />
                                            </div>
                                            
                                            <div className="edit-actions-row">
                                                <button 
                                                    type="submit" 
                                                    className="btn-save-section"
                                                    disabled={loadingEdit}
                                                >
                                                    {loadingEdit ? 'Đang lưu...' : '💾 Lưu thông tin'}
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn-change-password"
                                                    onClick={() => setShowPasswordModal(true)}
                                                >
                                                    <Lock size={16} /> Đổi mật khẩu
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn-change-pin"
                                                    onClick={() => setShowPinModal(true)}
                                                >
                                                    <ShieldCheck size={16} /> Đổi mã PIN
                                                </button>
                                            </div>
                                        </form>
                                    </div>
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
                MODAL: ĐỔI MẬT KHẨU
            ================================================= */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🔑 Đổi mật khẩu</h2>
                            <button className="modal-close-btn" onClick={() => setShowPasswordModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Mật khẩu cũ</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showOldPassword ? 'text' : 'password'}
                                            placeholder="Nhập mật khẩu cũ"
                                            value={passwordData.oldPassword}
                                            onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                            className="auth-input"
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
                                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="auth-input"
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
                                    <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                        💡 Mật khẩu phải có ít nhất 6 ký tự
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Xác nhận mật khẩu mới</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Xác nhận mật khẩu mới"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="auth-input"
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
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowPasswordModal(false)}>
                                    Hủy
                                </button>
                                <LoadingButton
                                    type="submit"
                                    loading={loadingPassword}
                                    loadingText="Đang xử lý..."
                                    disabled={loadingPassword}
                                    className="btn-submit-galaxy"
                                    spinnerColor="#ffffff"
                                >
                                    Đổi mật khẩu
                                </LoadingButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
                MODAL: ĐỔI MÃ PIN
            ================================================= */}
            {showPinModal && (
                <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🔐 Đổi mã PIN</h2>
                            <button className="modal-close-btn" onClick={() => setShowPinModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleChangePin}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Mã PIN hiện tại</label>
                                    {renderPinInputs('oldPin', pinData.oldPin, 'Nhập mã PIN hiện tại', showOldPin, setShowOldPin)}
                                    <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                        💡 Mã PIN gồm 6 chữ số
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Mã PIN mới</label>
                                    {renderPinInputs('newPin', pinData.newPin, 'Nhập mã PIN mới', showNewPin, setShowNewPin)}
                                </div>
                                <div className="form-group">
                                    <label>Xác nhận mã PIN mới</label>
                                    {renderPinInputs('confirmPin', pinData.confirmPin, 'Xác nhận mã PIN mới', showConfirmPin, setShowConfirmPin)}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowPinModal(false)}>
                                    Hủy
                                </button>
                                <LoadingButton
                                    type="submit"
                                    loading={loadingPin}
                                    loadingText="Đang xử lý..."
                                    disabled={loadingPin}
                                    className="btn-submit-galaxy"
                                    spinnerColor="#ffffff"
                                >
                                    Đổi mã PIN
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