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
  Sparkles,
  Play,
  Film
} from 'lucide-react';

import api from '../../api/api';
import '../styles/CinemaCardDetail.css';

const CinemaCardDetail = ({ type = 'news', apiEndpoint = '' }) => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [nowShowingMovies, setNowShowingMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  const detailEndpoints = {
    news: `/api/news/detail/${slug}`,
    promotion: `/api/promotions/detail/${slug}`,
    blog: `/api/blog-cinema/detail/${slug}`
  };

  const listEndpoints = {
    news: '/api/news',
    promotion: '/api/promotions',
    blog: '/api/blog-cinema'
  };

  const backdropFields = {
    news: 'news_backdrop',
    promotion: 'promotion_backdrop',
    blog: 'blog_backdrop'
  };

  const imageBaseUrls = {
    news: 'https://api.quangdungcinema.id.vn/uploads/news/',
    promotion: 'https://api.quangdungcinema.id.vn/uploads/promotions/',
    blog: 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/'
  };

  const movieImageBaseUrl = 'https://api.quangdungcinema.id.vn/uploads/movies/';

  const typeLabels = {
    news: 'TIN TỨC',
    promotion: 'KHUYẾN MÃI',
    blog: 'GÓC ĐIỆN ẢNH'
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!slug) { setError('Không tìm thấy đường dẫn bài viết.'); setLoading(false); return; }
      setLoading(true); setError(null); setData(null); setRelatedPosts([]);

      try {
        const response = await api.get(apiEndpoint || detailEndpoints[type]);
        const result = response.data?.data || response.data;
        if (!result) throw new Error('Không tìm thấy dữ liệu bài viết.');
        setData(result);

        try {
          const relatedResponse = await api.get(listEndpoints[type]);
          let posts = relatedResponse.data?.data || relatedResponse.data || [];
          if (!Array.isArray(posts)) posts = posts?.items || posts?.rows || posts?.results || posts?.data || [];
          if (!Array.isArray(posts)) posts = [];
          const backdropField = backdropFields[type];
          const filteredPosts = posts.filter(post => post && post.slug !== slug && backdropField && post[backdropField]);
          setRelatedPosts(filteredPosts.slice(0, 6));
        } catch (relatedError) { console.error('Không thể tải bài viết liên quan:', relatedError); setRelatedPosts([]); }
      } catch (err) {
        console.error('Error fetching detail:', err);
        setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu. Vui lòng thử lại!');
      } finally { setLoading(false); }
    };

    const fetchNowShowingMovies = async () => {
      setMoviesLoading(true);
      try {
        const response = await api.get('/api/movies');
        let movies = response.data?.data || response.data || [];
        if (!Array.isArray(movies)) movies = movies?.items || movies?.rows || movies?.results || movies?.data || [];
        if (!Array.isArray(movies)) movies = [];

        movies = movies.filter(movie => movie && movie.movie_backdrop);

        const showingMovies = movies.filter(movie => {
          const status = String(movie.status ?? movie.movie_status ?? '').toLowerCase();
          if (movie.is_showing === 1 || movie.is_showing === true) return true;
          if (['now_showing', 'now showing', 'showing', 'active', 'đang chiếu', 'dang chieu'].includes(status)) return true;
          return false;
        });

        const finalMovies = showingMovies.length > 0 ? showingMovies : movies;
        setNowShowingMovies(finalMovies.slice(0, 6));
      } catch (err) {
        console.error('Không thể tải phim đang chiếu:', err);
        setNowShowingMovies([]);
      } finally { setMoviesLoading(false); }
    };

    fetchDetail();
    fetchNowShowingMovies();
  }, [slug, type, apiEndpoint]);

  const handleGoBack = () => navigate(-1);

  const handleShare = async () => {
    if (!data) return;
    try {
      if (navigator.share) await navigator.share({ title: data.title || 'Quang Dũng Cinema', text: data.description || data.excerpt || '', url: window.location.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); alert('Đã sao chép link!'); }
    } catch (err) { if (err.name !== 'AbortError') console.error('Share error:', err); }
  };

  const handleLike = () => setLiked(prev => !prev);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const decodeHtmlEntities = (value) => {
    if (!value) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  };

  const isHtmlContent = (value) => {
    if (!value) return false;
    return /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(String(value).trim());
  };

  const normalizeTextContent = (value) => {
    if (!value) return [];
    let text = String(value);
    if (text.includes('&lt;') || text.includes('&gt;') || text.includes('&amp;')) text = decodeHtmlEntities(text);
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const paragraphs = text.split(/\n\s*\n+/).map(p => p.replace(/[ \t]+/g, ' ').replace(/\n/g, ' ').trim()).filter(Boolean);
    if (paragraphs.length === 0) {
      const singleParagraph = text.replace(/[ \t]+/g, ' ').replace(/\n/g, ' ').trim();
      return singleParagraph ? [singleParagraph] : [];
    }
    return paragraphs;
  };

  const renderContent = (content) => {
    if (!content) return null;
    const rawContent = String(content).trim();
    if (!rawContent) return null;
    if (isHtmlContent(rawContent)) return <div className="content-html" dangerouslySetInnerHTML={{ __html: rawContent }} />;
    const paragraphs = normalizeTextContent(rawContent);
    return <div className="content-html content-text">{paragraphs.map((p, i) => <p key={`content-paragraph-${i}`}>{p}</p>)}</div>;
  };

  const getImageUrl = (url, baseUrl = '') => {
    if (!url) return null;
    const value = String(url).trim();
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return `https://api.quangdungcinema.id.vn${value}`;
    return `${baseUrl}${value}`;
  };

  const getBackdropUrl = () => {
    if (!data) return null;
    const field = backdropFields[type];
    return field ? getImageUrl(data[field], imageBaseUrls[type]) : null;
  };

  const getRelatedImage = (post) => {
    if (!post) return null;
    const field = backdropFields[type];
    return field ? getImageUrl(post[field], imageBaseUrls[type]) : null;
  };

  const getMovieImage = (movie) => {
    if (!movie) return null;
    return getImageUrl(movie.movie_backdrop, movieImageBaseUrl);
  };

  const getMoviePath = (movie) => {
    if (!movie) return '/movies';
    const movieSlug = movie.slug || movie.movie_slug;
    if (movieSlug) return `/movie/${movieSlug}`;
    const movieId = movie.movie_id || movie.id;
    if (movieId) return `/movie/${movieId}`;
    return '/movies';
  };

  const getMovieTitle = (movie) => {
    return movie?.title || movie?.movie_title || movie?.name || movie?.movie_name || 'Phim đang chiếu';
  };

  const getMovieKey = (movie, index) => {
    return movie?.movie_id || movie?.id || movie?.slug || index;
  };

  const getDetailPath = (postSlug) => {
    const paths = {
      news: `/news/detail/${postSlug}`,
      promotion: `/promotion/detail/${postSlug}`,
      blog: `/blog-cinema/detail/${postSlug}`
    };
    return paths[type] || `/${type}/detail/${postSlug}`;
  };

  const getListPath = () => {
    const paths = { news: '/news', promotion: '/promotion', blog: '/blog-cinema' };
    return paths[type] || `/${type}`;
  };

  const getPostKey = (post) => {
    if (!post) return Math.random();
    return post[`${type}_id`] || post.news_id || post.promotion_id || post.blog_id || post.id || post.slug;
  };

  if (loading) {
    return (
      <div className="cinema-card-detail-loading">
        <Loader2 size={42} className="cinema-detail-spin" />
        <span>Đang tải nội dung...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="cinema-card-detail-error">
        <div className="cinema-card-detail-error-box">
          <div className="error-icon">⚠</div>
          <h2>{error || 'Không tìm thấy dữ liệu'}</h2>
          <p>Nội dung bạn yêu cầu không tồn tại hoặc đã được thay đổi.</p>
          <button type="button" className="detail-back-button" onClick={handleGoBack}>
            <ArrowLeft size={18} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl();
  const publishedDate = data.created_at || data.published_at || data.date;
  const content = data.content || data.body || data.full_description || data.description;

  return (
    <div className="cinema-card-detail-page">
      <div className="cinema-card-detail-container">

        <button type="button" className="detail-back-top" onClick={handleGoBack}>
          <ArrowLeft size={19} /><span>Quay lại</span>
        </button>

        <div className="detail-main-layout">

          {/* ==================================================
              LEFT - 60%
          ================================================== */}
          <main className="detail-main-column">
            <section className="detail-article">
              <div className="detail-category">
                <Tag size={15} /><span>{typeLabels[type] || type}</span>
              </div>

              <h1 className="detail-article-title">{data.title}</h1>

              <div className="detail-article-meta">
                {publishedDate && (
                  <div className="detail-meta-item">
                    <Calendar size={16} /><span>{formatFullDate(publishedDate)}</span>
                  </div>
                )}
                {data.views !== undefined && (
                  <div className="detail-meta-item">
                    <Eye size={16} /><span>{Number(data.views).toLocaleString('vi-VN')} lượt xem</span>
                  </div>
                )}
              </div>

              <div className="detail-hero-image">
                {backdropUrl ? (
                  <img src={backdropUrl} alt={data.title || 'Quang Dũng Cinema'} loading="eager" />
                ) : (
                  <div className="detail-image-placeholder"><Tag size={46} /></div>
                )}
              </div>

              <div className="detail-actions">
                <button type="button" className={`detail-action-btn ${liked ? 'active' : ''}`} onClick={handleLike}>
                  <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                  <span>{liked ? 'Đã thích' : 'Thích'}</span>
                </button>
                <button type="button" className="detail-action-btn" onClick={handleShare}>
                  <Share2 size={18} /><span>Chia sẻ</span>
                </button>
              </div>

              <article className="detail-content">{renderContent(content)}</article>

              {Array.isArray(data.tags) && data.tags.length > 0 && (
                <div className="detail-tags-section">
                  <div className="detail-section-heading">
                    <span className="section-title">TỪ KHÓA</span>
                    <div />
                  </div>
                  <div className="detail-tags">
                    {data.tags.map((tag, index) => (
                      <span key={index} className="detail-tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>

          {/* ==================================================
              RIGHT - 40% - PHIM ĐANG CHIẾU DỌC
          ================================================== */}
          <aside className="detail-sidebar">
              <div className="sidebar-section-heading">
                <div className="sidebar-title-wrap">
                  <Film size={28} />
                  <span>PHIM ĐANG CHIẾU</span>
                </div>
              </div>
            <section className="now-showing-section">
            

              {moviesLoading ? (
                <div className="movies-loading">
                  <Loader2 size={28} className="cinema-detail-spin" />
                  <span>Đang tải phim...</span>
                </div>
              ) : nowShowingMovies.length > 0 ? (
                <>
                  <div className="now-showing-list">
                    {nowShowingMovies.map((movie, index) => {
                      const image = getMovieImage(movie);
                      return (
                        <Link key={getMovieKey(movie, index)} to={getMoviePath(movie)} className="now-showing-card">
                          <div className="now-showing-image">
                            {image ? (
                              <img src={image} alt={getMovieTitle(movie)} loading="lazy" />
                            ) : (
                              <div className="movie-image-placeholder"><Play size={28} /></div>
                            )}
                            <div className="movie-image-overlay" />
                            <div className="movie-play-icon">
                              <Play size={17} fill="currentColor" />
                            </div>
                          </div>
                          <div className="now-showing-content">
                            <span className="now-showing-label">ĐANG CHIẾU</span>
                            <h3>{getMovieTitle(movie)}</h3>
                            <div className="now-showing-meta">
                              <span>⏱ {movie.duration || '??'} phút</span>
                              <span>🎬 {movie.nation || 'Việt Nam'}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="sidebar-view-all-wrapper">
                    <Link to="/movies" className="sidebar-view-all">
                      Xem tất cả phim <ChevronRight size={18} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="movies-empty">
                  <Film size={30} />
                  <span>Hiện chưa có phim đang chiếu</span>
                </div>
              )}
            </section>
          </aside>

        </div>

        {/* ==================================================
            RELATED POSTS - FULL WIDTH
        ================================================== */}
        <section className="detail-related-section">
          <div className="detail-section-heading">
            <span className="section-title">BÀI VIẾT KHÁC</span>
            <div />
            <Link to={getListPath()} className="detail-view-all">
              Xem tất cả <ChevronRight size={17} />
            </Link>
          </div>

          {relatedPosts.length > 0 ? (
            <div className="detail-related-grid">
              {relatedPosts.map((post) => {
                const image = getRelatedImage(post);
                return (
                  <Link key={getPostKey(post)} to={getDetailPath(post.slug)} className="detail-related-card">
                    <div className="related-card-image">
                      {image ? (
                        <img src={image} alt={post.title || 'Bài viết'} loading="lazy" />
                      ) : (
                        <div className="related-card-placeholder"><Sparkles size={28} /></div>
                      )}
                      <div className="related-card-overlay" />
                    </div>
                    <div className="related-card-content">
                      <span className="related-card-category">{typeLabels[type] || type}</span>
                      <h3>{post.title}</h3>
                      {post.created_at && (
                        <span className="related-card-date">
                          <Calendar size={13} /> {formatDate(post.created_at)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="detail-related-empty">
              <Sparkles size={30} />
              <span>Chưa có bài viết khác</span>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default CinemaCardDetail;