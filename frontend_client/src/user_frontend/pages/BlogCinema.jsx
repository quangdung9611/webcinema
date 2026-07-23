import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Newspaper, AlertCircle } from 'lucide-react';

import CinemaCard from '../components/CinemaCard';
import '../styles/BlogCinema.css';

// =============================================
// HELPER: LẤY URL ẢNH (HỖ TRỢ CLOUDINARY + LOCAL)
// =============================================
const getImageUrl = (imageField, baseUrl = '') => {
    if (!imageField) return '';
    // Nếu là URL đầy đủ (http:// hoặc https://) thì dùng trực tiếp
    if (imageField.startsWith('http://') || imageField.startsWith('https://')) {
        return imageField;
    }
    // Ngược lại, ghép với baseUrl (cho dữ liệu cũ)
    return baseUrl + imageField;
};

const BlogCinema = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const blogCinemaBaseUrl = "https://api.quangdungcinema.id.vn/uploads/blog_cinema/";

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
                        {blogs.map((blog) => {
                            // ✅ Hỗ trợ cả 2 tên trường: blog_image (mới) và image_url (cũ)
                            const imageField = blog.blog_image || blog.image_url;
                            const imageUrl = getImageUrl(imageField, blogCinemaBaseUrl);

                            return (
                                <CinemaCard
                                    key={blog.blog_id}
                                    type="news"
                                    image={imageUrl}
                                    title={blog.title}
                                    link={`/blog-cinema/${blog.slug}`}
                                />
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
};

export default BlogCinema;