import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Newspaper, AlertCircle } from 'lucide-react';

import CinemaCard from '../components/CinemaCard';
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
            <div className="blog-loading-spinner" />
            <p>Đang tải bài viết...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <div className="blog-container">

        {/* ===== HEADER ===== */}
        <div className="blog-header">
          <div className="blog-header-icon">
            <Newspaper size={48} />
          </div>
          <h1>Blog Điện Ảnh</h1>
          <p className="blog-header-desc">
            Cập nhật những tin tức mới nhất về phim ảnh, review phim và sự kiện điện ảnh tại CineStar.
          </p>
          <div className="blog-header-line" />
        </div>

        {/* ===== BREADCRUMB ===== */}
        <div className="blog-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Góc điện ảnh</span>
        </div>

        {/* ===== GRID ===== */}
        {blogs.length === 0 ? (
          <div className="blog-empty">
            <AlertCircle size={48} />
            <h3>Chưa có bài viết</h3>
            <p>Hiện tại chưa có bài viết nào. Vui lòng quay lại sau!</p>
            <Link to="/" className="blog-empty-btn">Về trang chủ</Link>
          </div>
        ) : (
          <div className="blog-grid">
            {blogs.map((blog) => (
              <CinemaCard
                key={blog.blog_id}
                type="news"
                image={`${blogCinemaImageUrl}${blog.image_url}`}
                title={blog.title}
                link={`/blog-cinema/${blog.slug}`}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default BlogCinema;