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
  // FETCH DATA
  // ==========================================================

  useEffect(() => {
    const fetchDetail = async () => {
      if (!slug) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let url = apiEndpoint || `/api/${type}s/${slug}`;
        
        if (!apiEndpoint) {
          switch (type) {
            case 'news':
              url = `/api/news/detail/${slug}`;
              break;
            case 'promotion':
              url = `/api/promotions/detail/${slug}`;
              break;
            case 'blog':
              url = `/api/blog-cinema/detail/${slug}`;
              break;
            default:
              url = `/api/${type}s/${slug}`;
          }
        }
        
        const response = await api.get(url);
        const result = response.data?.data || response.data;
        
        setData(result);
        
        // Fetch related posts
        try {
          const relatedRes = await api.get(`/api/${type}s`, {
            params: {
              limit: 6,
              exclude_slug: slug
            }
          });
          const posts = relatedRes.data?.data || [];
          const filtered = posts.filter(p => p.slug !== slug);
          setRelatedPosts(filtered.slice(0, 6));
        } catch (e) {
          console.log('No related posts');
          setRelatedPosts([]);
        }
        
      } catch (err) {
        console.error('Error fetching detail:', err);
        setError(err.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại!');
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
    const shareData = {
      title: data?.title || 'Quang Dũng Cinema',
      text: data?.description || data?.excerpt || '',
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
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
    setLiked(!liked);
    // TODO: Gọi API để like
  };

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderContent = (content) => {
    if (!content) return null;
    
    if (typeof content === 'string' && content.includes('<')) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    
    return <p>{content}</p>;
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    const baseUrls = {
      news: 'https://api.quangdungcinema.id.vn/uploads/news/',
      promotion: 'https://api.quangdungcinema.id.vn/uploads/promotions/',
      blog: 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/'
    };
    
    return (baseUrls[type] || '') + url;
  };

  const getBackdropUrl = () => {
    const fields = {
      news: data?.news_backdrop || data?.news_image,
      promotion: data?.promotion_backdrop || data?.promotion_image,
      blog: data?.blog_backdrop || data?.blog_image
    };
    
    const image = fields[type] || data?.image_url || data?.thumbnail;
    return getImageUrl(image);
  };

  const getRelatedImage = (post) => {
    const fields = {
      news: post?.news_backdrop || post?.news_image,
      promotion: post?.promotion_backdrop || post?.promotion_image,
      blog: post?.blog_backdrop || post?.blog_image
    };
    
    const image = fields[type] || post?.image_url || post?.thumbnail;
    return getImageUrl(image);
  };

  const typeLabels = {
    news: 'Tin tức',
    promotion: 'Khuyến mãi',
    blog: 'Góc điện ảnh'
  };

  const getDetailPath = (postSlug) => {
    const paths = {
      news: `/news/detail/${postSlug}`,
      promotion: `/promotion/detail/${postSlug}`,
      blog: `/blog-cinema/detail/${postSlug}`
    };
    return paths[type] || `/${type}/detail/${postSlug}`;
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
  // MAIN RENDER
  // ==========================================================

  const backdropUrl = getBackdropUrl();

  return (
    <div className="cinema-detail-page">
      <div className="cinema-detail-container">
        
        {/* ===== BACK BUTTON ===== */}
        <button onClick={handleGoBack} className="btn-back-top">
          <ArrowLeft size={20} />
          Quay lại
        </button>

        {/* ===== MAIN LAYOUT: 70-30 ===== */}
        <div className="cinema-detail-layout">
          
          {/* ==================================================
            70% - MAIN CONTENT
          ================================================== */}
          <div className="cinema-detail-main">
            
            {/* BADGE */}
            <div className="cinema-detail-badge">
              <Tag size={16} />
              <span>{typeLabels[type] || type}</span>
            </div>

            {/* TITLE */}
            <h1 className="cinema-detail-title">{data.title}</h1>

            {/* IMAGE - HÌNH NGANG 3:2 */}
            <div className="cinema-detail-image-wrapper">
              {backdropUrl ? (
                <img 
                  src={backdropUrl} 
                  alt={data.title} 
                  className="cinema-detail-image"
                  loading="lazy"
                />
              ) : (
                <div className="cinema-detail-image-placeholder">
                  <span>📰</span>
                </div>
              )}
            </div>

            {/* META INFO - NGÀY GIỜ, LƯỢT XEM */}
            <div className="cinema-detail-meta">
              <div className="meta-item">
                <Calendar size={16} />
                <span>{formatFullDate(data.created_at || data.published_at || data.date)}</span>
              </div>
              
              {data.views !== undefined && (
                <div className="meta-item">
                  <Eye size={16} />
                  <span>{data.views || 0} lượt xem</span>
                </div>
              )}
            </div>

            {/* ACTIONS - LIKE & SHARE */}
            <div className="cinema-detail-actions">
              <button 
                className={`action-btn like-btn ${liked ? 'active' : ''}`}
                onClick={handleLike}
              >
                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                <span>{liked ? 'Đã thích' : 'Thích'}</span>
              </button>
              
              <button className="action-btn share-btn" onClick={handleShare}>
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

            {/* CONTENT */}
            <div className="cinema-detail-content">
              {renderContent(data.content || data.body || data.full_description)}
            </div>

            {/* FOOTER */}
            <footer className="cinema-detail-footer">
              {data.tags && data.tags.length > 0 && (
                <div className="cinema-detail-tags">
                  <span className="tags-label">Tags:</span>
                  {data.tags.map((tag, index) => (
                    <span key={index} className="tag-item">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </footer>

          </div>

          {/* ==================================================
            30% - SIDEBAR
          ================================================== */}
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
                      key={post[`${type}_id`] || post.id} 
                      to={postPath}
                      className="sidebar-post-item"
                    >
                      <div className="sidebar-post-image">
                        {postImage ? (
                          <img 
                            src={postImage} 
                            alt={post.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="sidebar-post-placeholder">
                            <span>📰</span>
                          </div>
                        )}
                      </div>
                      <div className="sidebar-post-info">
                        <h5 className="sidebar-post-title">{post.title}</h5>
                        <span className="sidebar-post-date">
                          {formatDate(post.created_at)}
                        </span>
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
              <Link to={`/${type}`} className="sidebar-view-all">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            )}

          </aside>

        </div>

      </div>
    </div>
  );
};

export default CinemaCardDetail;