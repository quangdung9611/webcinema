import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Star,
    User,
    Loader2,
    MessageSquare,
    Calendar
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';

const API_URL = 'https://api.quangdungcinema.id.vn/api/reviews';

const ReviewPage = ({ movieId }) => {

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedReview, setSelectedReview] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // =============================================
    // ALERT MODAL
    // =============================================

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    // =============================================
    // FETCH REVIEWS
    // =============================================

    const fetchReviews = async () => {
        if (!movieId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/${movieId}`);
            setReviews(res.data);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách bình luận.', 'error');
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [movieId]);

    // =============================================
    // VIEW DETAIL
    // =============================================

    const handleViewDetail = (review) => {
        setSelectedReview(review);
        setIsDetailOpen(true);
    };

    // =============================================
    // FILTER REVIEWS
    // =============================================

    const filteredReviews = reviews.filter(review => {
        const keyword = search.toLowerCase();
        return (
            review.display_name?.toLowerCase().includes(keyword) ||
            review.comment?.toLowerCase().includes(keyword)
        );
    });

    // =============================================
    // RENDER STARS
    // =============================================

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                size={16}
                className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            />
        ));
    };

    // =============================================
    // TABLE COLUMNS
    // =============================================

    const columns = [
        {
            title: 'STT',
            key: 'index',
            render: (row, index) => index + 1
        },
        {
            title: 'Người dùng',
            key: 'display_name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}>
                        {row.display_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span>{row.display_name}</span>
                </div>
            )
        },
        {
            title: 'Đánh giá',
            key: 'rating_score',
            render: (row) => (
                <div style={{ display: 'flex', gap: '2px' }}>
                    {renderStars(row.rating_score)}
                </div>
            )
        },
        {
            title: 'Nội dung',
            key: 'comment',
            render: (row) => (
                <div style={{
                    maxWidth: '300px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {row.comment || 'Không có nội dung'}
                </div>
            )
        },
        {
            title: 'Ngày đăng',
            key: 'formatted_date',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    <Calendar size={14} />
                    {row.formatted_date || 'Vừa xong'}
                </div>
            )
        },
        {
            title: 'Xem',
            key: 'actions',
            render: (row) => (
                <button
                    className="admin-action-btn view-btn"
                    onClick={() => handleViewDetail(row)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        color: '#3b82f6',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <MessageSquare size={14} /> Chi tiết
                </button>
            )
        }
    ];

    // =============================================
    // RENDER
    // =============================================

    return (
        <>
            <AdminPage
                title="Quản lý bình luận"
                subtitle={`Danh sách bình luận của phim (${reviews.length} đánh giá)`}
                icon={<MessageSquare size={30} />}
                searchValue={search}
                onSearchChange={setSearch}
                // Không có button thêm
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải bình luận...</span>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#94a3b8'
                    }}>
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-40" />
                        <p style={{ fontSize: '18px', fontWeight: '500' }}>Chưa có bình luận</p>
                        <p style={{ fontSize: '14px' }}>Hãy là người đầu tiên đánh giá phim này!</p>
                    </div>
                ) : (
                    <AdminTable columns={columns} data={filteredReviews} />
                )}
            </AdminPage>

            {/* =============================================
                DETAIL MODAL
            ============================================= */}

            <AdminModal
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={`Chi tiết bình luận #${selectedReview?.review_id || ''}`}
                size="md"
            >
                {selectedReview && (
                    <div style={{ padding: '8px 0' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}>
                                {selectedReview.display_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                                    {selectedReview.display_name}
                                </div>
                                <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                                    {renderStars(selectedReview.rating_score)}
                                </div>
                                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                                    {selectedReview.formatted_date || 'Vừa xong'}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: '#f8fafc',
                            borderRadius: '12px',
                            padding: '16px',
                            marginTop: '8px'
                        }}>
                            <p style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                lineHeight: '1.6'
                            }}>
                                {selectedReview.comment || 'Không có nội dung bình luận.'}
                            </p>
                        </div>

                        <div style={{
                            marginTop: '16px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: '16px',
                            fontSize: '13px',
                            color: '#94a3b8'
                        }}>
                            <span>ID: {selectedReview.review_id}</span>
                            <span>•</span>
                            <span>Phim: {selectedReview.movie_id}</span>
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* =============================================
                ALERT MODAL
            ============================================= */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                    <div className="admin-alert-actions">
                        <button className="admin-confirm-btn" onClick={alertModal.onConfirm || closeAlert}>
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default ReviewPage;