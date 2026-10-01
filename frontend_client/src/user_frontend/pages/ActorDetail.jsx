// pages/ActorDetail.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/api';

import {
  User,
  Calendar,
  Globe,
  Loader2,
  Film,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react';

import MovieCard from '../components/MovieCard';

import '../styles/ActorDetail.css';

// ============================================================
//  HELPER: Xử lý URL ảnh
// ============================================================
const getImageUrl = (url, baseUrl = '') => {
  if (!url) return '';
  const value = String(url).trim();
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `https://api.quangdungcinema.id.vn${value}`;
  return `${baseUrl}${value}`;
};

const getPosterUrl = (movie) => {
  if (!movie) return '';
  const url = movie.movie_poster || movie.poster_url || '';
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://api.quangdungcinema.id.vn/uploads/posters/${url}`;
};

// ============================================================
//  HELPER: Format ngày
// ============================================================
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

const calcAge = (birthday) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 ? age : null;
};

// ============================================================
//  HELPER: Xử lý tiểu sử (strip HTML, split paragraph)
// ============================================================
const normalizeBiography = (bio) => {
  if (!bio) return [];
  let text = String(bio);
  // Decode entities
  if (text.includes('&lt;') || text.includes('&gt;') || text.includes('&amp;')) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    text = textarea.value;
  }
  // Strip HTML tags
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/[ \t]+/g, ' ').replace(/\n/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    const single = text.replace(/[ \t]+/g, ' ').replace(/\n/g, ' ').trim();
    return single ? [single] : [];
  }
  return paragraphs;
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
const ActorDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== FETCH ACTOR =====
  useEffect(() => {
    const fetchActor = async () => {
      if (!slug) {
        setError('Không tìm thấy đường dẫn diễn viên.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setData(null);

        const res = await api.get(`/api/actors/detail/${slug}`);

        const actorData = res.data?.data || res.data;

        if (!actorData || !actorData.actor_id) {
          throw new Error('Không tìm thấy dữ liệu diễn viên.');
        }

        // Chuẩn hóa movies
        const normalizedMovies = (actorData.movies || []).map((movie) => ({
          ...movie,
          movie_poster: getPosterUrl(movie),
          age_rating: movie.age_rating || 'T18',
          language: movie.language || 'Phụ đề',
        }));

        setData({
          ...actorData,
          movies: normalizedMovies,
        });
      } catch (err) {
        console.error('Error fetching actor:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'Không thể tải dữ liệu diễn viên.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchActor();
    window.scrollTo(0, 0);
  }, [slug]);

  // ============================================================
  //  LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="actor-detail-loading">
        <Loader2 size={45} className="actor-detail-spin" />
        <span>Đang tải thông tin diễn viên...</span>
      </div>
    );
  }

  // ============================================================
  //  ERROR
  // ============================================================
  if (error || !data) {
    return (
      <div className="actor-detail-error">
        <User size={60} />
        <h2>Không tìm thấy diễn viên</h2>
        <p>{error || 'Diễn viên không tồn tại hoặc đã bị xóa.'}</p>
        <button className="btn-back-home" onClick={() => navigate('/actors')}>
          <ArrowLeft size={18} />
          Về danh sách diễn viên
        </button>
      </div>
    );
  }

  // ============================================================
  //  DATA READY
  // ============================================================
  const avatarUrl = getImageUrl(
    data.actor_avatar,
    'https://api.quangdungcinema.id.vn/uploads/actors/'
  );
  const age = calcAge(data.birthday);
  const bioParagraphs = normalizeBiography(data.biography);
  const movies = data.movies || [];

  return (
    <div className="actor-detail-page">
      <div className="actor-detail-content">

        {/* ============================================================
            BREADCRUMB + BACK BUTTON
        ============================================================ */}
        <div className="actor-detail-topbar">
          <button
            type="button"
            className="actor-back-btn"
            onClick={() => navigate('/actors')}
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="actor-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <Link to="/actors">Diễn viên</Link>
            <ChevronRight size={14} />
            <span className="current">{data.name}</span>
          </div>
        </div>

        {/* ============================================================
            HERO SPLIT: AVATAR + INFO
        ============================================================ */}
        <div className="actor-hero-split">

          {/* Cột trái: Avatar dọc */}
          <div className="actor-hero-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={data.name}
                className="actor-avatar-img"
              />
            ) : (
              <div className="actor-avatar-placeholder">
                <User size={80} />
                <span>No Image</span>
              </div>
            )}
            <div className="actor-hero-overlay"></div>
          </div>

          {/* Cột phải: Thông tin */}
          <div className="actor-hero-info">

            <div className="actor-hero-label">
              <Award size={14} />
              <span>DIỄN VIÊN</span>
            </div>

            <h1 className="actor-name">{data.name}</h1>

            <div className="actor-divider"></div>

            {/* Grid thông tin */}
            <div className="actor-info-grid">

              {data.gender && (
                <div className="actor-info-item">
                  <User size={18} className="actor-info-icon" />
                  <div className="actor-info-text">
                    <span className="actor-info-label">Giới tính</span>
                    <span className="actor-info-value">{data.gender}</span>
                  </div>
                </div>
              )}

              {data.nationality && (
                <div className="actor-info-item">
                  <Globe size={18} className="actor-info-icon" />
                  <div className="actor-info-text">
                    <span className="actor-info-label">Quốc tịch</span>
                    <span className="actor-info-value">{data.nationality}</span>
                  </div>
                </div>
              )}

              {data.birthday && (
                <div className="actor-info-item">
                  <Calendar size={18} className="actor-info-icon" />
                  <div className="actor-info-text">
                    <span className="actor-info-label">Ngày sinh</span>
                    <span className="actor-info-value">
                      {formatDate(data.birthday)}
                      {age ? ` (${age} tuổi)` : ''}
                    </span>
                  </div>
                </div>
              )}

              {movies.length > 0 && (
                <div className="actor-info-item">
                  <Film size={18} className="actor-info-icon" />
                  <div className="actor-info-text">
                    <span className="actor-info-label">Phim tham gia</span>
                    <span className="actor-info-value">
                      {movies.length} bộ phim
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ============================================================
            TIỂU SỬ
        ============================================================ */}
        {bioParagraphs.length > 0 && (
          <section className="actor-bio-section">
            <div className="actor-section-title">
              <Sparkles size={22} />
              <h2>TIỂU SỬ</h2>
            </div>

            <div className="actor-bio-content">
              {bioParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================
            PHIM ĐÃ THAM GIA
        ============================================================ */}
        <section className="actor-movies-section">
          <div className="actor-section-title">
            <Film size={22} />
            <h2>PHIM ĐÃ THAM GIA</h2>
            <span className="actor-movie-count">
              {movies.length} phim
            </span>
          </div>

          {movies.length > 0 ? (
            <div className="actor-movie-grid">
              {movies.map((movie, index) => (
                <div key={movie.movie_id || movie.slug || index} className="actor-movie-item">
                  <MovieCard
                    movie={movie}
                    index={index}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="actor-movies-empty">
              <Film size={48} />
              <h3>Chưa có phim nào</h3>
              <p>Diễn viên này chưa tham gia bộ phim nào.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default ActorDetail;