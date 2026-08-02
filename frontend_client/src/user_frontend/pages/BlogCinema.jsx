import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api'; // ✅ Import api
import { ChevronRight, Newspaper, AlertCircle } from 'lucide-react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

import CinemaCard from '../components/CinemaCard';
import '../styles/BlogCinema.css';

const BlogCinema = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // ===== STATE BANNER TỪ API =====
    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);

    // ===== FETCH BANNER =====
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                setBannerLoading(true);
                const res = await api.get('/api/banners?page=BLOG');
                const bannerData = res.data?.data || [];
                setBanners(Array.isArray(bannerData) ? bannerData : []);
            } catch (error) {
                console.error('Lỗi tải banner:', error);
                setBanners([]);
            } finally {
                setBannerLoading(false);
            }
        };
        fetchBanners();
    }, []);

    // ===== FETCH BLOGS =====
    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                const res = await api.get('/api/blog-cinema');
                setBlogs(res.data || []);
            } catch (error) {
                console.error("Lỗi khi tải bài viết:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    if (loading || bannerLoading) {
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

    const hasBanners = banners.length > 0;

    return (
        <div className="blog-page">

            {/* ===== BANNER SLIDER ===== */}
            <div className="blog-hero">
                <div className="blog-overlay"></div>
                <div className="blog-light"></div>
                <div className="blog-particles"></div>

                <Swiper
                    modules={[Autoplay, EffectFade]}
                    effect="fade"
                    speed={1200}
                    autoplay={{ delay: 4500, disableOnInteraction: false }}
                    loop={hasBanners && banners.length > 1}
                    className="blog-swiper"
                >
                    {hasBanners ? (
                        banners.map((banner, idx) => (
                            <SwiperSlide key={banner.banner_id || idx}>
                                <img
                                    src={banner.image_url}
                                    alt={`Blog Banner ${idx + 1}`}
                                    className="blog-banner-img"
                                />
                            </SwiperSlide>
                        ))
                    ) : (
                        <SwiperSlide>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#888',
                                fontSize: '1.5rem',
                                fontWeight: 'bold'
                            }}>
                                📰 Blog Điện Ảnh
                            </div>
                        </SwiperSlide>
                    )}
                </Swiper>
            </div>

            <div className="blog-container">
                <div className="blog-header">
                    <div className="blog-header-icon"><Newspaper size={48} /></div>
                    <h1>Blog Điện Ảnh</h1>
                    <p className="blog-header-desc">Cập nhật những tin tức mới nhất về phim ảnh, review phim và sự kiện điện ảnh tại CineStar.</p>
                    <div className="blog-header-line" />
                </div>

                <div className="blog-breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span>Góc điện ảnh</span>
                </div>

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
                                image={blog.blog_image}
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