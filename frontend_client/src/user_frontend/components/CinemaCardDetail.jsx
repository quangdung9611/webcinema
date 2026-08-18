import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Eye,
    Share2,
    Heart,
    Tag,
    Loader2,
    ChevronRight,
    Sparkles
} from 'lucide-react';

import api from '../../api/api';
import '../styles/CinemaCardDetail.css';

// ==========================================================
// COMPONENT
// ==========================================================

const CinemaCardDetail = ({
    type = 'news', // 'news' | 'promotion' | 'blog'
    apiEndpoint = '',
}) => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liked, setLiked] = useState(false);
    const [relatedPosts, setRelatedPosts] = useState([]);

    // ==========================================================
    // API CONFIG
    // ==========================================================

    const detailEndpoints = {
        news: `/api/news/detail/${slug}`,
        promotion: `/api/promotions/detail/${slug}`,
        blog: `/api/blog-cinema/detail/${slug}`,
    };

    const listEndpoints = {
        news: '/api/news',
        promotion: '/api/promotions',
        blog: '/api/blog-cinema',
    };

    // ==========================================================
    // BACKDROP FIELD
    // ==========================================================

    const backdropFields = {
        news: 'news_backdrop',
        promotion: 'promotion_backdrop',
        blog: 'blog_backdrop',
    };

    // ==========================================================
    // IMAGE BASE URL
    // ==========================================================

    const imageBaseUrls = {
        news: 'https://api.quangdungcinema.id.vn/uploads/news/',
        promotion: 'https://api.quangdungcinema.id.vn/uploads/promotions/',
        blog: 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/',
    };

    // ==========================================================
    // FETCH DETAIL + RELATED POSTS
    // ==========================================================

    useEffect(() => {
        const fetchDetail = async () => {
            if (!slug) return;

            setLoading(true);
            setError(null);
            setRelatedPosts([]);

            try {
                let detailUrl = apiEndpoint;

                if (!detailUrl) {
                    detailUrl = detailEndpoints[type];
                }

                const response = await api.get(detailUrl);
                const result = response.data?.data || response.data;

                if (!result) {
                    throw new Error('Không tìm thấy dữ liệu');
                }

                setData(result);

                // Fetch related posts
                try {
                    const listUrl = listEndpoints[type] || `/api/${type}s`;
                    const relatedResponse = await api.get(listUrl);

                    let posts = relatedResponse.data?.data || relatedResponse.data || [];

                    if (!Array.isArray(posts)) {
                        posts = posts?.items || posts?.rows || posts?.results || [];
                    }

                    if (!Array.isArray(posts)) {
                        posts = [];
                    }

                    const backdropField = backdropFields[type];

                    const filteredPosts = posts.filter((post) => {
                        if (!post) return false;
                        if (post.slug === slug) return false;
                        if (!backdropField || !post[backdropField]) {
                            return false;
                        }
                        return true;
                    });

                    setRelatedPosts(filteredPosts.slice(0, 6));

                } catch (relatedError) {
                    console.log('Không thể tải bài viết liên quan:', relatedError);
                    setRelatedPosts([]);
                }

            } catch (err) {
                console.error('Error fetching detail:', err);
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    'Không thể tải dữ liệu. Vui lòng thử lại!'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [slug, type, apiEndpoint]);

    // ==========================================================
    // HANDLERS
    // ==========================================================

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleShare = async () => {
        if (!data) return;

        const shareData = {
            title: data.title || 'Quang Dũng Cinema',
            text: data.description || data.excerpt || '',
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                alert('Đã sao chép link!');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share error:', err);
            }
        }
    };

    const handleLike = async () => {
        setLiked((prev) => !prev);
    };

    // ==========================================================
    // FORMAT DATE
    // ==========================================================

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatFullDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

   // ==========================================================
// RENDER CONTENT - GIỮ NGUYÊN XUỐNG DÒNG TỪ DATABASE
// ==========================================================

const renderContent = (content) => {
    if (!content) return null;

    // ======================================================
    // 1. LÀM SẠCH HTML NHƯNG KHÔNG XÓA XUỐNG DÒNG
    // ======================================================

    let cleanText = String(content)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

    // Xóa các thẻ HTML còn sót lại
    cleanText = cleanText
        .replace(/<[^>]*>/g, '')
        .trim();

    if (!cleanText) {
        return null;
    }

    // ======================================================
    // 2. CHIA ĐOẠN THEO DÒNG TRỐNG
    // ======================================================

    const paragraphs = cleanText
        .split(/\n\s*\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    // ======================================================
    // 3. NẾU DATABASE CHỈ CÓ 1 DÒNG
    //    THÌ HIỂN THỊ NGUYÊN NỘI DUNG
    // ======================================================

    if (paragraphs.length <= 1) {
        return (
            <p className="content-paragraph">
                {cleanText}
            </p>
        );
    }

    // ======================================================
    // 4. HIỂN THỊ TỪNG ĐOẠN RIÊNG
    // ======================================================

    return (
        <div className="content-paragraphs">
            {paragraphs.map((paragraph, index) => (
                <p
                    key={index}
                    className="content-paragraph"
                >
                    {paragraph}
                </p>
            ))}
        </div>
    );
};
    // ==========================================================
    // GET IMAGE URL
    // ==========================================================

    const getImageUrl = (url) => {
        if (!url) return null;

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        if (url.startsWith('/')) {
            return `https://api.quangdungcinema.id.vn${url}`;
        }

        const baseUrl = imageBaseUrls[type] || '';
        return `${baseUrl}${url}`;
    };

    // ==========================================================
    // GET MAIN BACKDROP
    // ==========================================================

    const getBackdropUrl = () => {
        if (!data) return null;
        const backdropField = backdropFields[type];
        if (!backdropField) return null;
        return getImageUrl(data[backdropField]);
    };

    // ==========================================================
    // GET RELATED BACKDROP
    // ==========================================================

    const getRelatedImage = (post) => {
        if (!post) return null;
        const backdropField = backdropFields[type];
        if (!backdropField) return null;
        const backdrop = post[backdropField];
        if (!backdrop) return null;
        return getImageUrl(backdrop);
    };

    // ==========================================================
    // TYPE LABELS
    // ==========================================================

    const typeLabels = {
        news: 'Tin tức',
        promotion: 'Khuyến mãi',
        blog: 'Góc điện ảnh',
    };

    // ==========================================================
    // DETAIL PATH
    // ==========================================================

    const getDetailPath = (postSlug) => {
        const paths = {
            news: `/news/detail/${postSlug}`,
            promotion: `/promotion/detail/${postSlug}`,
            blog: `/blog-cinema/detail/${postSlug}`,
        };
        return paths[type] || `/${type}/detail/${postSlug}`;
    };

    // ==========================================================
    // LIST PATH
    // ==========================================================

    const getListPath = () => {
        const paths = {
            news: '/news',
            promotion: '/promotion',
            blog: '/blog-cinema',
        };
        return paths[type] || `/${type}`;
    };

    // ==========================================================
    // GET POST ID
    // ==========================================================

    const getPostKey = (post) => {
        if (!post) return Math.random();
        return (
            post[`${type}_id`] ||
            post.news_id ||
            post.promotion_id ||
            post.blog_id ||
            post.id ||
            post.slug
        );
    };

    // ==========================================================
    // LOADING STATE
    // ==========================================================

    if (loading) {
        return (
            <div className="cinema-detail-loading">
                <Loader2 size={48} className="spin-icon" />
                <span>Đang tải dữ liệu...</span>
            </div>
        );
    }

    // ==========================================================
    // ERROR STATE
    // ==========================================================

    if (error || !data) {
        return (
            <div className="cinema-detail-error">
                <div className="cinema-detail-error-content">
                    <h3>⚠️ {error || 'Không tìm thấy dữ liệu'}</h3>
                    <p>Vui lòng thử lại sau.</p>
                    <button onClick={handleGoBack} className="btn-back">
                        <ArrowLeft size={18} />
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================================
    // MAIN BACKDROP
    // ==========================================================

    const backdropUrl = getBackdropUrl();

    // ==========================================================
    // MAIN RENDER
    // ==========================================================

    return (
        <div className="cinema-detail-page">
            <div className="cinema-detail-container">

                {/* BACK BUTTON */}
                <button onClick={handleGoBack} className="btn-back-top">
                    <ArrowLeft size={20} />
                    <span>Quay lại</span>
                </button>

                {/* MAIN LAYOUT: 70-30 */}
                <div className="cinema-detail-layout">

                    {/* MAIN CONTENT */}
                    <main className="cinema-detail-main">

                        {/* BADGE */}
                        <div className="cinema-detail-badge">
                            <Tag size={16} />
                            <span>{typeLabels[type] || type}</span>
                        </div>

                        {/* TITLE */}
                        <h1 className="cinema-detail-title">{data.title}</h1>

                        {/* MAIN BACKDROP */}
                        <div className="cinema-detail-image-wrapper">
                            {backdropUrl ? (
                                <img
                                    src={backdropUrl}
                                    alt={data.title || 'Cinema'}
                                    className="cinema-detail-image"
                                    loading="eager"
                                />
                            ) : (
                                <div className="cinema-detail-image-placeholder">
                                    <span>📰</span>
                                </div>
                            )}
                        </div>

                        {/* META */}
                        <div className="cinema-detail-meta">
                            {(data.created_at || data.published_at || data.date) && (
                                <div className="meta-item">
                                    <Calendar size={16} />
                                    <span>{formatFullDate(data.created_at || data.published_at || data.date)}</span>
                                </div>
                            )}
                            {data.views !== undefined && (
                                <div className="meta-item">
                                    <Eye size={16} />
                                    <span>{data.views || 0} lượt xem</span>
                                </div>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className="cinema-detail-actions">
                            <button
                                type="button"
                                className={`action-btn like-btn ${liked ? 'active' : ''}`}
                                onClick={handleLike}
                            >
                                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                                <span>{liked ? 'Đã thích' : 'Thích'}</span>
                            </button>
                            <button type="button" className="action-btn share-btn" onClick={handleShare}>
                                <Share2 size={18} />
                                <span>Chia sẻ</span>
                            </button>
                        </div>

                        {/* EXCERPT */}
                        {(data.excerpt || data.description || data.short_description) && (
                            <div className="cinema-detail-excerpt">
                                <p>{data.excerpt || data.description || data.short_description}</p>
                            </div>
                        )}

                        {/* CONTENT - TỰ ĐỘNG CHIA ĐOẠN */}
                        <div className="cinema-detail-content">
                            {renderContent(data.content || data.body || data.full_description)}
                        </div>

                        {/* FOOTER / TAGS */}
                        <footer className="cinema-detail-footer">
                            {Array.isArray(data.tags) && data.tags.length > 0 && (
                                <div className="cinema-detail-tags">
                                    <span className="tags-label">Tags:</span>
                                    {data.tags.map((tag, index) => (
                                        <span key={index} className="tag-item">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </footer>

                    </main>

                    {/* SIDEBAR */}
                    <aside className="cinema-detail-sidebar">

                        <div className="sidebar-title">
                            <Sparkles size={18} />
                            <h4>Bài viết khác</h4>
                        </div>

                        {relatedPosts.length > 0 ? (
                            <div className="sidebar-related-posts">
                                {relatedPosts.map((post) => {
                                    const postImage = getRelatedImage(post);
                                    const postPath = getDetailPath(post.slug);

                                    return (
                                        <Link
                                            key={getPostKey(post)}
                                            to={postPath}
                                            className="sidebar-post-item"
                                        >
                                            <div className="sidebar-post-image">
                                                {postImage ? (
                                                    <img src={postImage} alt={post.title || 'Bài viết'} loading="lazy" />
                                                ) : (
                                                    <div className="sidebar-post-placeholder">
                                                        <span>📰</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="sidebar-post-info">
                                                <h5 className="sidebar-post-title">{post.title}</h5>
                                                {post.created_at && (
                                                    <span className="sidebar-post-date">
                                                        {formatDate(post.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="sidebar-empty">
                                <p>Chưa có bài viết khác</p>
                            </div>
                        )}

                        {relatedPosts.length > 0 && (
                            <Link to={getListPath()} className="sidebar-view-all">
                                <span>Xem tất cả</span>
                                <ChevronRight size={16} />
                            </Link>
                        )}

                    </aside>

                </div>

            </div>
        </div>
    );
};

export default CinemaCardDetail;