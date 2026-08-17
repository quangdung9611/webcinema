import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Share2, 
  Heart, 
  Clock,
  Tag,
  User,
  MessageCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import api from '../../api/api';
import '../styles/CinemaCardDetail.css';

// ==========================================================
// COMPONENT
// ==========================================================

const CinemaCardDetail = ({ 
  type = 'news', // 'news' | 'promotion' | 'blog'
  apiEndpoint = '',
  idKey = 'id'
}) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

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
        
        // Fallback endpoints
        if (!apiEndpoint) {
          switch (type) {
            case 'news':
              url = `/api/news/detail/${slug}`;
              break;
            case 'promotion':
              url = `/api/promotions/${slug}`;
              break;
            case 'blog':
              url = `/api/blog-cinema/${slug}`;
              break;
            default:
              url = `/api/${type}s/${slug}`;
          }
        }
        
        const response = await api.get(url);
        const result = response.data?.data || response.data;
        
        setData(result);
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
        // Fallback: copy link
        await navigator.clipboard.writeText(window.location.href);
        alert('Đã sao chép link!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
      }
    }
  };

  const handleLike = () => {
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderContent = (content) => {
    if (!content) return null;
    
    // Nếu content là HTML, render trực tiếp
    if (typeof content === 'string' && content.includes('<')) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    
    // Nếu là text thường
    return <p>{content}</p>;
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = type === 'news' 
      ? 'https://api.quangdungcinema.id.vn/uploads/news/' 
      : type === 'promotion'
        ? 'https://api.quangdungcinema.id.vn/uploads/promotions/'
        : 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/';
    return baseUrl + url;
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

  const imageUrl = getImageUrl(
    data.news_image || 
    data.promotion_image || 
    data.blog_image || 
    data.image_url || 
    data.thumbnail
  );

  return (
    <div className="cinema-detail-page">
      <div className="cinema-detail-container">
        
        {/* ===== BACK BUTTON ===== */}
        <button onClick={handleGoBack} className="btn-back-top">
          <ArrowLeft size={20} />
          Quay lại
        </button>

        {/* ===== BADGE ===== */}
        <div className="cinema-detail-badge">
          <Tag size={16} />
          <span>
            {type === 'news' && 'Tin tức'}
            {type === 'promotion' && 'Khuyến mãi'}
            {type === 'blog' && 'Góc điện ảnh'}
          </span>
        </div>

        {/* ===== HEADER ===== */}
        <header className="cinema-detail-header">
          <h1 className="cinema-detail-title">{data.title}</h1>
          
          <div className="cinema-detail-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>{formatDate(data.created_at || data.published_at || data.date)}</span>
            </div>
            
            {data.author && (
              <div className="meta-item">
                <User size={16} />
                <span>{data.author}</span>
              </div>
            )}
            
            {data.views !== undefined && (
              <div className="meta-item">
                <Eye size={16} />
                <span>{data.views || 0} lượt xem</span>
              </div>
            )}
          </div>
          
          <div className="cinema-detail-actions">
            <button 
              className={`action-btn like-btn ${liked ? 'active' : ''}`}
              onClick={handleLike}
            >
              <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
              <span>{liked ? 'Đã thích' : 'Thích'}</span>
            </button>
            
            <button className="action-btn share-btn" onClick={handleShare}>
              <Share2 size={20} />
              <span>Chia sẻ</span>
            </button>
          </div>
        </header>

        {/* ===== IMAGE ===== */}
        {imageUrl && (
          <div className="cinema-detail-image-wrapper">
            <img 
              src={imageUrl} 
              alt={data.title} 
              className="cinema-detail-image"
              loading="lazy"
            />
          </div>
        )}

        {/* ===== EXCERPT / DESCRIPTION ===== */}
        {(data.excerpt || data.description || data.short_description) && (
          <div className="cinema-detail-excerpt">
            <p>{data.excerpt || data.description || data.short_description}</p>
          </div>
        )}

        {/* ===== CONTENT ===== */}
        <div className="cinema-detail-content">
          {renderContent(data.content || data.body || data.full_description)}
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="cinema-detail-footer">
          <div className="cinema-detail-tags">
            {data.tags && data.tags.length > 0 && (
              <>
                <span className="tags-label">Tags:</span>
                {data.tags.map((tag, index) => (
                  <span key={index} className="tag-item">
                    #{tag}
                  </span>
                ))}
              </>
            )}
          </div>
          
          <div className="cinema-detail-navigation">
            <button 
              className="nav-btn btn-back-bottom"
              onClick={handleGoBack}
            >
              <ArrowLeft size={18} />
              <span>Quay lại</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default CinemaCardDetail;