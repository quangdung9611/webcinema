import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Modal from '../../admin_frontend/components/Modal';
import { QRCodeCanvas } from 'qrcode.react'; 
import '../styles/Profile.css';
import { 
    User, ClipboardList, Bell, Pencil, ShieldCheck, Star, Info, 
    ChevronRight, Camera, Calendar, Clock, MapPin, ReceiptText, Armchair, Trash2 
} from 'lucide-react';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({ 
        full_name: '', email: '', phone: '', address: '', username: '', points: 0 
    });
    
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
    const [activeTab, setActiveTab] = useState('orders');

    const [bookingHistory, setBookingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Hàm fetch lịch sử giao dịch
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await axios.get('https://webcinema-zb8z.onrender.com/api/users/booking-history', { withCredentials: true });
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
                points: user.points || 0
            });
        }
    }, [user]);

   
            // --- HÀM XỬ LÝ XÓA LỊCH SỬ (DŨNG DÙNG BẢN NÀY ĐỂ FIX TRIỆT ĐỂ) ---
        const handleClearHistory = async () => {
            try {
                const res = await axios.post('https://webcinema-zb8z.onrender.com/api/users/clear-history', {}, { withCredentials: true });
                
                if (res.data.success) {
                    // 1. Cập nhật giao diện cục bộ ngay lập tức
                    setBookingHistory([]); 
                    setFormData(prev => ({ 
                        ...prev, 
                        points: 0 
                    })); 

                    // 2. Thông báo thành công
                    setModal({ 
                        show: true, 
                        type: 'success', 
                        title: 'Thành công', 
                        message: 'Đã xóa sạch lịch sử và điểm thưởng!',
                        onConfirm: () => {
                            setModal(prev => ({ ...prev, show: false }));
                            // 3. Đợi đóng modal xong thì đồng bộ lại toàn bộ hệ thống từ server
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
            }
        };

        const confirmClearHistory = () => {
            setModal({
                show: true,
                type: 'warning',
                title: 'Xác nhận xóa',
                message: 'Dũng có chắc muốn xóa sạch lịch sử và đưa điểm về 0 không?',
                onConfirm: () => handleClearHistory() // Bọc vào arrow function cho chắc
            });
        };

    const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handlePass = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
            return setModal({ show: true, type: 'error', title: 'Lỗi', message: 'Mật khẩu xác nhận không khớp!', onConfirm: () => setModal({ ...modal, show: false }) });
        }
        setLoading(true);
        try {
            await axios.put('https://webcinema-zb8z.onrender.com/api/users/profile/update', 
                { ...formData, ...passwordData }, { withCredentials: true });
            setModal({ show: true, type: 'success', title: 'Thành công', message: 'Hồ sơ đã được cập nhật!', onConfirm: () => setModal({ ...modal, show: false }) });
            setIsEditing(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            await checkAuth(); 
        } catch (error) {
            setModal({ show: true, type: 'error', title: 'Thất bại', message: error.response?.data?.error || 'Có lỗi xảy ra!', onConfirm: () => setModal({ ...modal, show: false }) });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="loader">Đang tải...</div>;

    return (
        <div className="galaxy-profile-wrapper">
            <div className="container">
                <div className="profile-layout-grid">
                    {/* SIDEBAR BÊN TRÁI */}
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
                                    <span>{Math.floor(formData.points / 10000)} Stars</span>
                                </div>
                            </div>
                        </div>

                        <div className="spending-summary">
                            <div className="spending-header">
                                <span>Tổng chi tiêu 2026</span>
                                <Info size={14} />
                            </div>
                            {/* Chỗ này sẽ tự về 0 khi xóa lịch sử nhờ setFormData ở trên */}
                            <div className="spending-value">{Number(formData.points).toLocaleString()} đ</div>
                        </div>

                        <div className="star-progress-container">
                            <div className="progress-bar-track">
                                <div className="progress-fill" style={{width: `${Math.min((formData.points / 4000000) * 100, 100)}%`}}></div>
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
                            <div className="nav-link">HOTLINE: 19002224 <ChevronRight size={16}/></div>
                            <div className="nav-link">Email: hotro@galaxystudio.vn <ChevronRight size={16}/></div>
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
                                <div className="history-tab-content">
                                    {/* NÚT XÓA LỊCH SỬ (MỚI) */}
                                    {bookingHistory.length > 0 && (
                                        <div className="history-action-bar" style={{ textAlign: 'right', marginBottom: '15px' }}>
                                            <button className="btn-clear-history" onClick={confirmClearHistory} 
                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '14px' }}>
                                                <Trash2 size={16} /> Xóa lịch sử và điểm
                                            </button>
                                        </div>
                                    )}

                                    {loadingHistory ? (
                                        <div className="loading-text">Đang tải lịch sử giao dịch...</div>
                                    ) : bookingHistory.length > 0 ? (
                                        <div className="ticket-list">
                                            {bookingHistory.map((item, index) => (
                                                <div key={index} className="history-ticket-item">
                                                    <div className="ticket-thumb">
                                                        <img src={item.moviePoster?.startsWith('http') ? item.moviePoster : `https://webcinema-zb8z.onrender.com/uploads/posters/${item.moviePoster}`} alt="poster" />
                                                    </div>
                                                    
                                                    <div className="ticket-main-info">
                                                        <h4 className="movie-title-history">{item.movieTitle}</h4>
                                                        <div className="info-row">
                                                            <ReceiptText size={14} />
                                                            <span>Ngày đặt: <strong>{item.bookingDateFull}</strong></span>
                                                        </div>
                                                        <div className="info-row">
                                                            <MapPin size={14}/> 
                                                            <span>{item.cinemaName} | {item.roomName}</span>
                                                        </div>
                                                        <div className="info-row highlight">
                                                            <Calendar size={14}/> 
                                                            <span>{item.selectedDate}</span>
                                                            <Clock size={14} style={{marginLeft: '15px'}}/> 
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
                                            <p>Dũng chưa có giao dịch nào trong năm 2026.</p>
                                            <Link to="/" className="btn-book-now">ĐẶT VÉ NGAY</Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <Modal 
                show={modal.show} 
                type={modal.type} 
                title={modal.title} 
                message={modal.message} 
                onConfirm={modal.onConfirm || (() => setModal({ ...modal, show: false }))} 
            />
        </div>
    );
};

export default Profile;