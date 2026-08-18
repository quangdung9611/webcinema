import React, { useEffect, useMemo, useState } from 'react';
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
    type = 'news',
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

    const detailEndpoints = useMemo(() => ({
        news: `/api/news/detail/${slug}`,
        promotion: `/api/promotions/detail/${slug}`,
        blog: `/api/blog-cinema/detail/${slug}`,
    }), [slug]);

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
    //
    // Chỉ dùng khi database còn lưu filename/path cũ.
    // Nếu database đã lưu Cloudinary URL -> giữ nguyên URL.
    // ==========================================================

    const imageBaseUrls = {
        news: 'https://api.quangdungcinema.id.vn/uploads/news/',
        promotion: 'https://api.quangdungcinema.id.vn/uploads/promotions/',
        blog: 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/',
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
    // HELPER - EXTRACT ARRAY FROM API RESPONSE
    // ==========================================================

    const extractArray = (response) => {
        let result = response?.data;

        if (result === undefined || result === null) {
            return [];
        }

        // ------------------------------------------
        // data: []
        // ------------------------------------------

        if (Array.isArray(result)) {
            return result;
        }

        // ------------------------------------------
        // data: { data: [] }
        // ------------------------------------------

        if (Array.isArray(result.data)) {
            return result.data;
        }

        // ------------------------------------------
        // data: { rows: [] }
        // ------------------------------------------

        if (Array.isArray(result.rows)) {
            return result.rows;
        }

        // ------------------------------------------
        // data: { items: [] }
        // ------------------------------------------

        if (Array.isArray(result.items)) {
            return result.items;
        }

        // ------------------------------------------
        // data: { results: [] }
        // ------------------------------------------

        if (Array.isArray(result.results)) {
            return result.results;
        }

        return [];
    };

    // ==========================================================
    // FETCH DETAIL + RELATED POSTS
    // ==========================================================

    useEffect(() => {
        let isMounted = true;

        const fetchDetail = async () => {
            if (!slug) {
                if (isMounted) {
                    setLoading(false);
                    setError('Không tìm thấy slug bài viết.');
                }

                return;
            }

            setLoading(true);
            setError(null);
            setData(null);
            setRelatedPosts([]);
            setLiked(false);

            try {
                // ==================================================
                // DETAIL
                // ==================================================

                const detailUrl =
                    apiEndpoint ||
                    detailEndpoints[type];

                if (!detailUrl) {
                    throw new Error(
                        'Không tìm thấy API detail tương ứng.'
                    );
                }

                const response = await api.get(detailUrl);

                const result =
                    response?.data?.data ||
                    response?.data;

                if (!result || typeof result !== 'object') {
                    throw new Error(
                        'Không tìm thấy dữ liệu bài viết.'
                    );
                }

                if (isMounted) {
                    setData(result);
                }

                // ==================================================
                // RELATED POSTS
                // ==================================================

                try {
                    const listUrl =
                        listEndpoints[type];

                    if (!listUrl) {
                        return;
                    }

                    const relatedResponse =
                        await api.get(listUrl);

                    const posts =
                        extractArray(relatedResponse);

                    const backdropField =
                        backdropFields[type];

                    const filteredPosts =
                        posts
                            .filter((post) => {
                                if (!post) {
                                    return false;
                                }

                                // Không lấy chính bài hiện tại
                                if (
                                    post.slug &&
                                    post.slug === slug
                                ) {
                                    return false;
                                }

                                // Phải có backdrop
                                if (
                                    !backdropField ||
                                    !post[backdropField]
                                ) {
                                    return false;
                                }

                                return true;
                            })
                            .slice(0, 6);

                    if (isMounted) {
                        setRelatedPosts(
                            filteredPosts
                        );
                    }

                } catch (relatedError) {
                    console.warn(
                        'Không thể tải bài viết liên quan:',
                        relatedError
                    );

                    if (isMounted) {
                        setRelatedPosts([]);
                    }
                }

            } catch (err) {
                console.error(
                    'Error fetching detail:',
                    err
                );

                if (isMounted) {
                    setError(
                        err?.response?.data?.message ||
                        err?.message ||
                        'Không thể tải dữ liệu. Vui lòng thử lại!'
                    );
                }

            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDetail();

        return () => {
            isMounted = false;
        };

    }, [
        slug,
        type,
        apiEndpoint,
        detailEndpoints
    ]);

    // ==========================================================
    // HANDLERS
    // ==========================================================

    const handleGoBack = () => {
        navigate(-1);
    };

    // ==========================================================
    // SHARE
    // ==========================================================

    const handleShare = async () => {
        if (!data) {
            return;
        }

        const shareData = {
            title:
                data.title ||
                'Quang Dũng Cinema',

            text:
                data.description ||
                data.excerpt ||
                '',

            url:
                window.location.href,
        };

        try {
            // ------------------------------------------
            // Native share
            // ------------------------------------------

            if (
                navigator.share &&
                typeof navigator.share === 'function'
            ) {
                await navigator.share(
                    shareData
                );

                return;
            }

            // ------------------------------------------
            // Clipboard
            // ------------------------------------------

            if (
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === 'function'
            ) {
                await navigator.clipboard.writeText(
                    window.location.href
                );

                alert(
                    'Đã sao chép link!'
                );
            }

        } catch (err) {
            if (
                err?.name !==
                'AbortError'
            ) {
                console.error(
                    'Share error:',
                    err
                );
            }
        }
    };

    // ==========================================================
    // LIKE
    //
    // Hiện tại giữ trạng thái UI.
    // API like riêng có thể nối vào sau.
    // ==========================================================

    const handleLike = () => {
        setLiked((prev) => !prev);
    };

    // ==========================================================
    // FORMAT DATE
    // ==========================================================

    const formatDate = (dateStr) => {
        if (!dateStr) {
            return '';
        }

        const date =
            new Date(dateStr);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return '';
        }

        return date.toLocaleDateString(
            'vi-VN',
            {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }
        );
    };

    // ==========================================================
    // FORMAT FULL DATE
    // ==========================================================

    const formatFullDate = (dateStr) => {
        if (!dateStr) {
            return '';
        }

        const date =
            new Date(dateStr);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return '';
        }

        return date.toLocaleDateString(
            'vi-VN',
            {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }
        );
    };

    // ==========================================================
    // CLEAN CONTENT
    //
    // Nội dung backend hiện tại có thể là:
    // - plain text
    // - HTML
    //
    // Component này render dạng TEXT an toàn.
    // ==========================================================

    const cleanContent = (content) => {
        if (!content) {
            return '';
        }

        return String(content)
            .replace(
                /<br\s*\/?>/gi,
                '\n'
            )
            .replace(
                /<\/p>/gi,
                '\n\n'
            )
            .replace(
                /<\/div>/gi,
                '\n'
            )
            .replace(
                /<\/li>/gi,
                '\n'
            )
            .replace(
                /<[^>]*>/g,
                ''
            )
            .replace(
                /&nbsp;/gi,
                ' '
            )
            .replace(
                /&amp;/gi,
                '&'
            )
            .replace(
                /&lt;/gi,
                '<'
            )
            .replace(
                /&gt;/gi,
                '>'
            )
            .replace(
                /&quot;/gi,
                '"'
            )
            .replace(
                /&#39;/gi,
                "'"
            )
            .trim();
    };

    // ==========================================================
    // RENDER CONTENT
    // ==========================================================

    const renderContent = (content) => {
        const text =
            cleanContent(content);

        if (!text) {
            return null;
        }

        // ------------------------------------------
        // Có xuống dòng -> ưu tiên giữ nguyên
        // ------------------------------------------

        const rawParagraphs =
            text
                .split(/\n\s*\n+/)
                .map((paragraph) =>
                    paragraph
                        .replace(
                            /\s*\n\s*/g,
                            ' '
                        )
                        .trim()
                )
                .filter(Boolean);

        if (
            rawParagraphs.length > 1
        ) {
            return (
                <div className="content-paragraphs">
                    {rawParagraphs.map(
                        (paragraph, index) => (
                            <p
                                key={index}
                                className="content-paragraph"
                            >
                                {paragraph}
                            </p>
                        )
                    )}
                </div>
            );
        }

        // ------------------------------------------
        // Không có xuống dòng
        // Tự chia theo câu
        // ------------------------------------------

        const sentences =
            text.match(
                /[^.!?…]+[.!?…]+(?:["”']+)?(?=\s|$)|[^.!?…]+$/g
            ) || [text];

        const cleanedSentences =
            sentences
                .map((sentence) =>
                    sentence.trim()
                )
                .filter(Boolean);

        // ------------------------------------------
        // Ít câu -> 1 đoạn
        // ------------------------------------------

        if (
            cleanedSentences.length <= 3
        ) {
            return (
                <p className="content-paragraph">
                    {text}
                </p>
            );
        }

        // ------------------------------------------
        // Mỗi đoạn 4 câu
        // ------------------------------------------

        const paragraphs = [];
        let current = [];

        const SENTENCES_PER_PARAGRAPH = 4;

        cleanedSentences.forEach(
            (sentence, index) => {
                current.push(sentence);

                const isLast =
                    index ===
                    cleanedSentences.length - 1;

                if (
                    current.length >=
                        SENTENCES_PER_PARAGRAPH ||
                    (
                        current.length >= 3 &&
                        isLast
                    )
                ) {
                    paragraphs.push(
                        current.join(' ')
                    );

                    current = [];
                }
            }
        );

        if (
            current.length > 0
        ) {
            paragraphs.push(
                current.join(' ')
            );
        }

        return (
            <div className="content-paragraphs">
                {paragraphs.map(
                    (paragraph, index) => (
                        <p
                            key={index}
                            className="content-paragraph"
                        >
                            {paragraph}
                        </p>
                    )
                )}
            </div>
        );
    };

    // ==========================================================
    // GET IMAGE URL
    // ==========================================================

    const getImageUrl = (url) => {
        if (!url) {
            return null;
        }

        const value =
            String(url).trim();

        if (!value) {
            return null;
        }

        // ------------------------------------------
        // Cloudinary / HTTP / HTTPS
        // ------------------------------------------

        if (
            value.startsWith('http://') ||
            value.startsWith('https://')
        ) {
            return value;
        }

        // ------------------------------------------
        // Absolute backend path
        // ------------------------------------------

        if (
            value.startsWith('/')
        ) {
            return `https://api.quangdungcinema.id.vn${value}`;
        }

        // ------------------------------------------
        // Filename cũ
        // ------------------------------------------

        const baseUrl =
            imageBaseUrls[type] || '';

        return `${baseUrl}${value}`;
    };

    // ==========================================================
    // GET MAIN BACKDROP
    // ==========================================================

    const getBackdropUrl = () => {
        if (!data) {
            return null;
        }

        const field =
            backdropFields[type];

        if (!field) {
            return null;
        }

        return getImageUrl(
            data[field]
        );
    };

    // ==========================================================
    // GET RELATED IMAGE
    // ==========================================================

    const getRelatedImage = (post) => {
        if (!post) {
            return null;
        }

        const field =
            backdropFields[type];

        if (!field) {
            return null;
        }

        return getImageUrl(
            post[field]
        );
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

        return (
            paths[type] ||
            `/${type}/detail/${postSlug}`
        );
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

        return (
            paths[type] ||
            `/${type}`
        );
    };

    // ==========================================================
    // GET POST KEY
    // ==========================================================

    const getPostKey = (post) => {
        if (!post) {
            return undefined;
        }

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
    // LOADING
    // ==========================================================

    if (loading) {
        return (
            <div className="cinema-detail-loading">
                <Loader2
                    size={48}
                    className="spin-icon"
                />

                <span>
                    Đang tải dữ liệu...
                </span>
            </div>
        );
    }

    // ==========================================================
    // ERROR
    // ==========================================================

    if (
        error ||
        !data
    ) {
        return (
            <div className="cinema-detail-error">
                <div className="cinema-detail-error-content">

                    <h3>
                        ⚠️{' '}
                        {error ||
                            'Không tìm thấy dữ liệu'}
                    </h3>

                    <p>
                        Vui lòng thử lại sau.
                    </p>

                    <button
                        type="button"
                        onClick={handleGoBack}
                        className="btn-back"
                    >
                        <ArrowLeft size={18} />

                        <span>
                            Quay lại
                        </span>
                    </button>

                </div>
            </div>
        );
    }

    // ==========================================================
    // MAIN BACKDROP
    // ==========================================================

    const backdropUrl =
        getBackdropUrl();

    // ==========================================================
    // CONTENT FALLBACK
    // ==========================================================

    const content =
        data.content ||
        data.body ||
        data.full_description ||
        '';

    const excerpt =
        data.excerpt ||
        data.description ||
        data.short_description ||
        '';

    const dateValue =
        data.created_at ||
        data.published_at ||
        data.date;

    // ==========================================================
    // MAIN RENDER
    // ==========================================================

    return (
        <div className="cinema-detail-page">

            <div className="cinema-detail-container">

                {/* ==================================================
                    BACK BUTTON
                ================================================== */}

                <button
                    type="button"
                    onClick={handleGoBack}
                    className="btn-back-top"
                >
                    <ArrowLeft size={20} />

                    <span>
                        Quay lại
                    </span>
                </button>

                {/* ==================================================
                    MAIN LAYOUT
                ================================================== */}

                <div className="cinema-detail-layout">

                    {/* ==================================================
                        MAIN
                    ================================================== */}

                    <main className="cinema-detail-main">

                        {/* BADGE */}

                        <div className="cinema-detail-badge">

                            <Tag size={16} />

                            <span>
                                {typeLabels[type] ||
                                    type}
                            </span>

                        </div>

                        {/* TITLE */}

                        <h1 className="cinema-detail-title">
                            {data.title}
                        </h1>

                        {/* BACKDROP */}

                        <div className="cinema-detail-image-wrapper">

                            {backdropUrl ? (
                                <img
                                    src={backdropUrl}
                                    alt={
                                        data.title ||
                                        'Quang Dũng Cinema'
                                    }
                                    className="cinema-detail-image"
                                    loading="eager"
                                    decoding="async"
                                />
                            ) : (
                                <div className="cinema-detail-image-placeholder">
                                    <span>
                                        📰
                                    </span>
                                </div>
                            )}

                        </div>

                        {/* META */}

                        <div className="cinema-detail-meta">

                            {dateValue && (
                                <div className="meta-item">
                                    <Calendar size={16} />

                                    <span>
                                        {formatFullDate(
                                            dateValue
                                        )}
                                    </span>
                                </div>
                            )}

                            {data.views !== undefined && (
                                <div className="meta-item">
                                    <Eye size={16} />

                                    <span>
                                        {Number(
                                            data.views
                                        ) || 0}{' '}
                                        lượt xem
                                    </span>
                                </div>
                            )}

                        </div>

                        {/* ACTIONS */}

                        <div className="cinema-detail-actions">

                            <button
                                type="button"
                                className={`action-btn like-btn ${
                                    liked
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={
                                    handleLike
                                }
                            >
                                <Heart
                                    size={18}
                                    fill={
                                        liked
                                            ? 'currentColor'
                                            : 'none'
                                    }
                                />

                                <span>
                                    {liked
                                        ? 'Đã thích'
                                        : 'Thích'}
                                </span>
                            </button>

                            <button
                                type="button"
                                className="action-btn share-btn"
                                onClick={
                                    handleShare
                                }
                            >
                                <Share2 size={18} />

                                <span>
                                    Chia sẻ
                                </span>
                            </button>

                        </div>

                        {/* EXCERPT */}

                        {excerpt && (
                            <div className="cinema-detail-excerpt">
                                <p>
                                    {excerpt}
                                </p>
                            </div>
                        )}

                        {/* CONTENT */}

                        <div className="cinema-detail-content">
                            {renderContent(
                                content
                            )}
                        </div>

                        {/* FOOTER */}

                        <footer className="cinema-detail-footer">

                            {Array.isArray(
                                data.tags
                            ) &&
                                data.tags.length >
                                    0 && (
                                    <div className="cinema-detail-tags">

                                        <span className="tags-label">
                                            Tags:
                                        </span>

                                        {data.tags.map(
                                            (
                                                tag,
                                                index
                                            ) => (
                                                <span
                                                    key={`${tag}-${index}`}
                                                    className="tag-item"
                                                >
                                                    #
                                                    {tag}
                                                </span>
                                            )
                                        )}

                                    </div>
                                )}

                        </footer>

                    </main>

                    {/* ==================================================
                        SIDEBAR
                    ================================================== */}

                    <aside className="cinema-detail-sidebar">

                        <div className="sidebar-title">

                            <Sparkles size={18} />

                            <h4>
                                Bài viết khác
                            </h4>

                        </div>

                        {relatedPosts.length >
                        0 ? (
                            <div className="sidebar-related-posts">

                                {relatedPosts.map(
                                    (post) => {
                                        const postImage =
                                            getRelatedImage(
                                                post
                                            );

                                        const postPath =
                                            post.slug
                                                ? getDetailPath(
                                                      post.slug
                                                  )
                                                : getListPath();

                                        const postKey =
                                            getPostKey(
                                                post
                                            );

                                        return (
                                            <Link
                                                key={
                                                    postKey
                                                }
                                                to={
                                                    postPath
                                                }
                                                className="sidebar-post-item"
                                            >

                                                <div className="sidebar-post-image">

                                                    {postImage ? (
                                                        <img
                                                            src={
                                                                postImage
                                                            }
                                                            alt={
                                                                post.title ||
                                                                'Bài viết'
                                                            }
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    ) : (
                                                        <div className="sidebar-post-placeholder">
                                                            <span>
                                                                📰
                                                            </span>
                                                        </div>
                                                    )}

                                                </div>

                                                <div className="sidebar-post-info">

                                                    <h5 className="sidebar-post-title">
                                                        {post.title ||
                                                            'Bài viết'}
                                                    </h5>

                                                    {post.created_at && (
                                                        <span className="sidebar-post-date">
                                                            {formatDate(
                                                                post.created_at
                                                            )}
                                                        </span>
                                                    )}

                                                </div>

                                            </Link>
                                        );
                                    }
                                )}

                            </div>
                        ) : (
                            <div className="sidebar-empty">
                                <p>
                                    Chưa có bài viết khác
                                </p>
                            </div>
                        )}

                        {relatedPosts.length >
                            0 && (
                            <Link
                                to={
                                    getListPath()
                                }
                                className="sidebar-view-all"
                            >
                                <span>
                                    Xem tất cả
                                </span>

                                <ChevronRight
                                    size={16}
                                />
                            </Link>
                        )}

                    </aside>

                </div>

            </div>

        </div>
    );
};

export default CinemaCardDetail;