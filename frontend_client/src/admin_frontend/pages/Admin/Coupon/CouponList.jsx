import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Ticket, Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react'; 
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css'; // Dùng chung CSS như ông yêu cầu

const CouponList = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // State điều khiển Modal y hệt UserList
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: null
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const showModal = (type, title, message, onConfirm = closeModal, onCancel = null) => {
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: () => { onConfirm(); closeModal(); },
            onCancel: onCancel ? () => { onCancel(); closeModal(); } : null
        });
    };

    // Lấy danh sách mã giảm giá
    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/coupons/all');
            if (res.data.success) {
                setCoupons(res.data.data);
            }
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách mã giảm giá.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCoupons(); }, []);

    // Xử lý xóa mã với Modal Confirm
    const handleDelete = (coupon_id, coupon_code) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc chắn muốn xóa mã giảm giá "${coupon_code}"? Hành động này không thể hoàn tác.`,
            async () => {
                try {
                    const res = await axios.delete(`http://localhost:5000/api/coupons/delete/${coupon_id}`);
                    if (res.data.success) {
                        setCoupons(prev => prev.filter(c => c.coupon_id !== coupon_id));
                        showModal('success', 'Thành công', 'Đã xóa mã giảm giá thành công!');
                    }
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa mã. Vui lòng thử lại.');
                }
            }
        );
    };

    const formatCurrency = (amount) => {
        return Number(amount).toLocaleString('vi-VN') + "đ";
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="user-list-container">
            <Modal 
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

            <div className="user-list-header">
                <h2>
                    <Ticket size={24} className="header-icon" />
                    QUẢN LÝ MÃ GIẢM GIÁ
                </h2>
                <button 
                    className="btn-add-user"
                    onClick={() => navigate('/admin/coupons/add')}
                >
                    <Plus size={18} /> Thêm Mã Mới
                </button>
            </div>

            {loading ? (
                <div className="loader">
                    <Loader2 size={32} className="spin-icon" /> Đang tải danh sách...
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Mã Code</th>
                            <th>Mức Giảm</th>
                            <th>Ngày Hết Hạn</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coupons.length > 0 ? (
                            coupons.map(c => (
                                <tr key={c.coupon_id}>
                                    <td><strong>#{c.coupon_id}</strong></td>
                                    <td className="ticket-code" style={{ color: '#f26b38', fontWeight: 'bold' }}>
                                        {c.coupon_code}
                                    </td>
                                    <td>{formatCurrency(c.discount_value)}</td>
                                    <td>{formatDate(c.expiry_date)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-edit"
                                                onClick={() => navigate(`/admin/coupons/update/${c.coupon_id}`)}
                                                title="Sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(c.coupon_id, c.coupon_code)}
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-row">
                                    Không tìm thấy mã giảm giá nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default CouponList;