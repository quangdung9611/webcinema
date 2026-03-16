import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Edit, Trash2, Loader2 } from 'lucide-react'; 
import Modal from '../../../components/Modal';
import '../../../styles/UserList.css';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // State điều khiển Modal
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

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/users');
            setUsers(res.data);
        } catch (err) {
            showModal('error', 'Lỗi', 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDelete = (user_id, username) => {
        showModal(
            'confirm',
            'Xác nhận xóa',
            `Quang Dũng có chắc chắn muốn xóa user "${username}" (ID: #${user_id})? Hành động này không thể hoàn tác.`,
            async () => {
                try {
                    await axios.delete(`http://localhost:5000/api/users/delete/${user_id}`);
                    setUsers(users.filter(u => u.user_id !== user_id));
                    showModal('success', 'Thành công', 'Đã xóa người dùng thành công!');
                } catch (err) {
                    showModal('error', 'Thất bại', 'Lỗi khi xóa người dùng. Vui lòng thử lại.');
                }
            }
        );
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
                    <Users size={24} className="header-icon" />
                    QUẢN LÝ NGƯỜI DÙNG
                </h2>
                <button 
                    className="btn-add-user"
                    onClick={() => navigate('/admin/users/add')}
                >
                    <UserPlus size={18} /> Thêm User Mới
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
                            <th>Username</th>
                            <th>Họ tên</th>
                            <th>Role</th>
                            <th className="th-actions">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map(u => (
                                <tr key={u.user_id}>
                                    <td><strong>#{u.user_id}</strong></td>
                                    <td className="ticket-code">{u.username}</td>
                                    <td>{u.full_name}</td>
                                    <td>
                                        <span className={`status-badge ${u.role === 'admin' ? 'used' : 'pending'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-edit"
                                                onClick={() => navigate(`/admin/users/update/${u.user_id}`)}
                                                title="Sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                className="btn-delete"
                                                onClick={() => handleDelete(u.user_id, u.username)}
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
                                    Không tìm thấy người dùng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserList;