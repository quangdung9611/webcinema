import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronRight,
  Newspaper,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';

import CinemaCard from '../components/CinemaCard';
import ScrollReveal from '../components/ScrollReveal';
import '../styles/BlogCinema.css';

const BlogCinema = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const blogCinemaImageUrl = "https://api.quangdungcinema.id.vn/uploads/blog_cinema/";

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const res = await axios.get('https://api.quangdungcinema.id.vn/api/blog-cinema/all');
        setBlogs(res.data || []);
      } catch (error) {
        console.error("Lỗi khi tải bài viết:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  if (loading) {
    return (
      <div className="blog-page">
        <div className="blog-container">
          <div className="blog-loading">
            <div className="blog-loading-spinner"></div>
            <p>Đang tải bài viết...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <div className="blog-container">

        {/* HEADER */}
        <div className="blog-header">
          <div className="blog-header-icon">
            <Newspaper size={52} />
          </div>
          <h1>Góc Điện Ảnh</h1>
          <p className="blog-header-desc">
            Cập nhật những tin tức mới nhất về phim ảnh, review phim, hậu trường sản xuất
            và các sự kiện điện ảnh nổi bật tại CineStar.
          </p>
          <div className="blog-header-line"></div>
        </div>

        {/* BREADCRUMB */}
        <div className="blog-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Blog</span>
          <ChevronRight size={14} />
          <span className="current">Góc điện ảnh</span>
        </div>

        {/* STATS */}
        <div className="blog-stats">
          <div className="blog-stat">
            <span className="blog-stat-number">{blogs.length}</span>
            <span className="blog-stat-label">Bài viết</span>
          </div>
          <div className="blog-stat">
            <span className="blog-stat-number">📰</span>
            <span className="blog-stat-label">Tin tức mới nhất</span>
          </div>
          <div className="blog-stat">
            <span className="blog-stat-number">🎬</span>
            <span className="blog-stat-label">Điện ảnh mỗi ngày</span>
          </div>
        </div>

        {/* GRID */}
        {blogs.length === 0 ? (
          <div className="blog-empty">
            <AlertCircle size={48} />
            <h3>Chưa có bài viết nào</h3>
            <p>Hiện tại chưa có bài viết nào trong góc điện ảnh. Vui lòng quay lại sau!</p>
            <Link to="/" className="blog-empty-btn">Về trang chủ</Link>
          </div>
        ) : (
          <div className="blog-grid">
            {blogs.map((blog) => (
              <ScrollReveal
                key={blog.blog_id}
                curtain
                curtainSpeed={0.3}
                curtainFolds={3}
                curtainColor="#E8C84A"
              >
                <CinemaCard
                  type="news"
                  image={`${blogCinemaImageUrl}${blog.image_url}`}
                  title={blog.title}
                  buttonText="Đọc thêm"
                  link={`/blog-cinema/${blog.slug}`}
                />
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="blog-cta">
          <div className="blog-cta-icon">
            <User size={32} />
          </div>
          <h3>Đăng ký nhận tin tức</h3>
          <p>Nhận thông báo về các bài viết mới nhất từ góc điện ảnh CineStar.</p>
          <div className="blog-cta-buttons">
            <Link to="/contact" className="blog-cta-btn primary">
              Đăng ký ngay
            </Link>
            <Link to="/" className="blog-cta-btn outline">
              Về trang chủ
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BlogCinema;